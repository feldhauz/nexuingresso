import "server-only";
import { audit } from "./audit";
import type { User } from "./auth";
import { DEMO, RESERVATION_MINUTES } from "./config";
import { type Db, query, queryOne, transaction } from "./db";
import { UserError } from "./errors";
import { getEventById, getTicketTypes } from "./events";
import { type PaymentMethod, quoteOrder } from "./fees";
import { createCharge, isValidWebhook, paymentsAvailable, refundCharge, signWebhook } from "./gateway";
import { newId, newOrderId, newToken } from "./ids";
import { activeLot, remaining } from "./lots";
import { sendMail } from "./mail";
import { isCpf, isEmail, onlyDigits } from "./text";

export type OrderStatus = "pendente" | "aguardando" | "pago" | "expirado" | "reembolsado";

export type OrderItem = {
  typeId: string;
  typeName: string;
  lotName: string;
  isHalf: boolean;
  groupSize: number;
  quantity: number;
  unitPriceCents: number;
};

export type Order = {
  id: string;
  userId: string;
  eventId: string;
  status: OrderStatus;
  method: PaymentMethod | "gratis" | null;
  subtotalCents: number;
  discountCents: number;
  feeCents: number;
  totalCents: number;
  coupon: { code: string; percentOff: number } | null;
  pixCode: string | null;
  expiresAt: Date;
  items: OrderItem[];
};

type Selection = { typeId: string; quantity: number };

/** Devolve ao estoque os ingressos de pedidos que deixaram de valer. */
async function release(tx: Db, orders: { id: string; status: string; coupon_id: string | null }[]) {
  if (orders.length === 0) return;
  await tx.query(
    `UPDATE lots l SET sold = l.sold - x.q
     FROM (SELECT lot_id, sum(quantity)::int AS q FROM order_items
           WHERE order_id = ANY($1::text[]) GROUP BY lot_id) x
     WHERE l.id = x.lot_id`,
    [orders.map((o) => o.id)],
  );
  // O cupom só é contado quando o pedido vai para pagamento.
  for (const order of orders) {
    if (order.coupon_id && order.status !== "pendente") {
      await tx.query(`UPDATE coupons SET used = used - 1 WHERE id = $1 AND used > 0`, [order.coupon_id]);
    }
  }
}

/** Vence as reservas passadas do prazo. Roda antes de toda leitura ou baixa de estoque. */
export async function expireOrders(db?: Db): Promise<void> {
  const run = async (tx: Db) => {
    const due = await tx.query<{ id: string; status: string; coupon_id: string | null }>(
      `SELECT id, status, coupon_id FROM orders
       WHERE status IN ('pendente', 'aguardando') AND expires_at <= now() FOR UPDATE`,
    );
    if (due.length === 0) return;
    await tx.query(`UPDATE orders SET status = 'expirado' WHERE id = ANY($1::text[])`, [due.map((o) => o.id)]);
    await release(tx, due);
  };
  await (db ? run(db) : transaction(run));
}

/** Cria o pedido e reserva os ingressos por 10 minutos, na mesma transação. */
export async function createOrder(user: User, eventId: string, selection: Selection[]): Promise<string> {
  const wanted = new Map<string, number>();
  for (const { typeId, quantity } of selection) {
    if (Number.isInteger(quantity) && quantity > 0) wanted.set(typeId, (wanted.get(typeId) ?? 0) + quantity);
  }
  const count = [...wanted.values()].reduce((sum, q) => sum + q, 0);
  if (count === 0) throw new UserError("Escolha pelo menos um ingresso.");

  return transaction(async (tx) => {
    await expireOrders(tx);
    const event = await getEventById(eventId, tx);
    const now = new Date();
    if (!event || event.status !== "publicado") throw new UserError("Este evento não está à venda.");
    if (now >= event.endsAt) throw new UserError("Este evento já terminou.");
    if (count > event.maxPerCpf) {
      throw new UserError(`O limite é de ${event.maxPerCpf} ingressos por CPF neste evento.`);
    }

    const types = await getTicketTypes(eventId, tx, true);
    const orderId = newOrderId();
    const items: { typeId: string; lotId: string; quantity: number; priceCents: number }[] = [];

    for (const [typeId, quantity] of wanted) {
      const type = types.find((t) => t.id === typeId);
      if (!type) throw new UserError("Ingresso não encontrado. Atualize a página.");
      const lot = activeLot(type.lots, now);
      if (!lot) throw new UserError(`${type.name} esgotou.`);
      const reserved = await tx.query(
        `UPDATE lots SET sold = sold + $2 WHERE id = $1 AND sold + $2 <= quantity RETURNING id`,
        [lot.id, quantity],
      );
      if (reserved.length === 0) {
        const left = remaining(lot);
        throw new UserError(
          left === 1
            ? `Só resta 1 ingresso de ${type.name} neste lote.`
            : `Só restam ${left} ingressos de ${type.name} neste lote.`,
        );
      }
      items.push({ typeId, lotId: lot.id, quantity, priceCents: lot.priceCents });
    }

    const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    await tx.query(
      `INSERT INTO orders (id, user_id, event_id, subtotal_cents, expires_at)
       VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
      [orderId, user.id, eventId, subtotal, RESERVATION_MINUTES],
    );
    for (const item of items) {
      await tx.query(
        `INSERT INTO order_items (id, order_id, ticket_type_id, lot_id, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newId(), orderId, item.typeId, item.lotId, item.quantity, item.priceCents],
      );
    }
    return orderId;
  });
}

async function loadOrder(db: Db, orderId: string, lock = false): Promise<Order | undefined> {
  const [row] = await db.query(`SELECT * FROM orders WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`, [orderId]);
  if (!row) return undefined;
  const items = await db.query(
    `SELECT i.*, t.name AS type_name, t.is_half, t.group_size, l.name AS lot_name
     FROM order_items i JOIN ticket_types t ON t.id = i.ticket_type_id JOIN lots l ON l.id = i.lot_id
     WHERE i.order_id = $1 ORDER BY t.position, t.name`,
    [orderId],
  );
  const [coupon] = row.coupon_id
    ? await db.query(`SELECT code, percent_off FROM coupons WHERE id = $1`, [row.coupon_id])
    : [];
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    status: row.status,
    method: row.method,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    feeCents: row.fee_cents,
    totalCents: row.total_cents,
    coupon: coupon ? { code: coupon.code, percentOff: coupon.percent_off } : null,
    pixCode: row.pix_code,
    expiresAt: row.expires_at,
    items: items.map((item) => ({
      typeId: item.ticket_type_id,
      typeName: item.type_name,
      lotName: item.lot_name,
      isHalf: item.is_half,
      groupSize: item.group_size,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
    })),
  };
}

/** Pedido do próprio usuário, já com as reservas vencidas aplicadas. */
export async function getOrder(user: User, orderId: string): Promise<Order | undefined> {
  await expireOrders();
  const order = await loadOrder({ query }, orderId);
  return order?.userId === user.id ? order : undefined;
}

export async function setCoupon(user: User, orderId: string, rawCode: string): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  await transaction(async (tx) => {
    const order = await loadOrder(tx, orderId, true);
    if (!order || order.userId !== user.id || order.status !== "pendente") {
      throw new UserError("Este pedido não aceita mais cupom.");
    }
    if (!code) {
      await tx.query(`UPDATE orders SET coupon_id = NULL WHERE id = $1`, [orderId]);
      return;
    }
    const [coupon] = await tx.query(
      `SELECT id FROM coupons WHERE event_id = $1 AND code = $2 AND (max_uses IS NULL OR used < max_uses)`,
      [order.eventId, code],
    );
    if (!coupon) throw new UserError("Cupom inválido ou esgotado.");
    await tx.query(`UPDATE orders SET coupon_id = $2 WHERE id = $1`, [orderId, coupon.id]);
  });
}

async function issueTickets(tx: Db, order: Order) {
  const [buyer] = await tx.query(`SELECT buyer_name FROM orders WHERE id = $1`, [order.id]);
  const firstName = String(buyer?.buyer_name ?? "").trim().split(/\s+/)[0];

  for (const item of order.items) {
    for (let i = 0; i < item.quantity; i++) {
      if (item.groupSize <= 1) {
        await tx.query(
          `INSERT INTO tickets (id, order_id, event_id, ticket_type_id, owner_id, code)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newId(), order.id, order.eventId, item.typeId, order.userId, newToken()],
        );
        continue;
      }
      // Camarote: um ingresso por pessoa, ainda sem nome. Só valem na portaria depois que o
      // comprador cadastra os convidados e gera os QR Codes.
      const groupId = newId();
      await tx.query(
        `INSERT INTO ticket_groups (id, order_id, event_id, ticket_type_id, owner_id, name)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [groupId, order.id, order.eventId, item.typeId, order.userId, firstName ? `${item.typeName} do ${firstName}` : item.typeName],
      );
      for (let guest = 0; guest < item.groupSize; guest++) {
        await tx.query(
          `INSERT INTO tickets (id, order_id, event_id, ticket_type_id, owner_id, code, status, group_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'sem_nome', $7)`,
          [newId(), order.id, order.eventId, item.typeId, order.userId, newToken(), groupId],
        );
      }
    }
  }
}

async function markPaid(tx: Db, order: Order) {
  await tx.query(`UPDATE orders SET status = 'pago', paid_at = now() WHERE id = $1`, [order.id]);
  await issueTickets(tx, order);
}

async function mailBuyer(orderId: string, kind: "pago" | "devolvido" | "reembolsado") {
  const row = await queryOne(
    `SELECT u.email, e.title FROM orders o JOIN users u ON u.id = o.user_id JOIN events e ON e.id = o.event_id
     WHERE o.id = $1`,
    [orderId],
  );
  if (!row) return;
  if (kind === "pago") {
    await sendMail({
      to: row.email,
      subject: `Seus ingressos para ${row.title}`,
      body: [
        `Pagamento confirmado. Pedido ${orderId}.`,
        "Cada ingresso tem um QR Code próprio. Abra pelo botão abaixo e mostre na portaria, com um documento com foto.",
        "Comprou camarote ou mesa? Cadastre os convidados em Meus ingressos para gerar o QR Code de cada um.",
        "Não vai mais? Você pode transferir o ingresso para o e-mail de outra pessoa, sem custo.",
      ],
      link: { label: "Ver meus ingressos", path: "/ingressos" },
    });
  } else {
    await sendMail({
      to: row.email,
      subject: `Reembolso do pedido ${orderId}`,
      body: [
        kind === "devolvido"
          ? `Seu pagamento para ${row.title} chegou depois do fim da reserva e os ingressos já tinham acabado. O valor foi devolvido.`
          : `O pedido ${orderId}, de ${row.title}, foi reembolsado e os ingressos foram cancelados.`,
        "O prazo para o valor aparecer depende do banco ou da operadora do cartão.",
      ],
    });
  }
}

export type BuyerInput = { name: string; cpf: string; method: PaymentMethod };

/** Fecha os valores do pedido e abre a cobrança. Pedido de valor zero é confirmado na hora. */
export async function payOrder(user: User, orderId: string, input: BuyerInput): Promise<void> {
  const name = input.name.trim().slice(0, 120);
  const cpf = onlyDigits(input.cpf);
  if (name.length < 3) throw new UserError("Digite o nome completo de quem vai usar o ingresso.");
  if (!isCpf(cpf)) throw new UserError("Confira o CPF digitado.");
  if (input.method !== "pix" && input.method !== "card") throw new UserError("Escolha a forma de pagamento.");

  const free = await transaction(async (tx) => {
    const order = await loadOrder(tx, orderId, true);
    if (!order || order.userId !== user.id) throw new UserError("Pedido não encontrado.");
    const [{ expired }] = await tx.query(`SELECT now() >= $1::timestamptz AS expired`, [order.expiresAt]);
    if (order.status !== "pendente" || expired) {
      throw new UserError("A reserva deste pedido acabou. Volte ao evento e escolha os ingressos de novo.");
    }
    const event = await getEventById(order.eventId, tx);
    if (!event) throw new UserError("Evento não encontrado.");

    const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const [{ held }] = await tx.query(
      `SELECT coalesce(sum(i.quantity), 0)::int AS held
       FROM orders o JOIN order_items i ON i.order_id = o.id
       WHERE o.event_id = $1 AND o.buyer_cpf = $2 AND o.status IN ('aguardando', 'pago')`,
      [order.eventId, cpf],
    );
    if (held + count > event.maxPerCpf) {
      throw new UserError(
        `Este CPF já tem ${held} ingresso(s) para o evento. O limite é de ${event.maxPerCpf} por CPF.`,
      );
    }

    const quote = quoteOrder(
      order.items.map((item) => ({ priceCents: item.unitPriceCents, quantity: item.quantity })),
      input.method,
      { percentOff: order.coupon?.percentOff, absorbFee: event.absorbFee },
    );
    const isFree = quote.total === 0;
    if (!isFree && !paymentsAvailable()) {
      throw new UserError("O pagamento ainda não está disponível. Tente de novo mais tarde.");
    }

    if (order.coupon) {
      const counted = await tx.query(
        `UPDATE coupons SET used = used + 1
         WHERE id = (SELECT coupon_id FROM orders WHERE id = $1) AND (max_uses IS NULL OR used < max_uses)
         RETURNING id`,
        [orderId],
      );
      if (counted.length === 0) throw new UserError("O cupom esgotou. Remova o cupom para continuar.");
    }

    const charge = isFree
      ? null
      : await createCharge({
          orderId,
          amountCents: quote.total,
          method: input.method,
          split: { producerId: event.producerId, producerCents: quote.producer, platformCents: quote.fee },
        });

    await tx.query(
      `UPDATE orders SET status = 'aguardando', method = $2, discount_cents = $3, fee_cents = $4,
         total_cents = $5, producer_cents = $6, buyer_name = $7, buyer_cpf = $8, charge_id = $9,
         pix_code = $10, expires_at = now() + make_interval(mins => $11)
       WHERE id = $1`,
      [
        orderId,
        isFree ? "gratis" : input.method,
        quote.discount,
        quote.fee,
        quote.total,
        quote.producer,
        name,
        cpf,
        charge?.chargeId ?? null,
        charge?.pixCode ?? null,
        RESERVATION_MINUTES,
      ],
    );
    await tx.query(
      `UPDATE users SET name = CASE WHEN name = '' THEN $2 ELSE name END, cpf = coalesce(cpf, $3) WHERE id = $1`,
      [user.id, name, cpf],
    );
    if (isFree) await markPaid(tx, order);
    return isFree;
  });

  if (free) await mailBuyer(orderId, "pago");
}

/**
 * Baixa de um pagamento confirmado pelo gateway. Pagamento que chega depois do fim da
 * reserva é honrado se ainda houver ingresso no lote; se não houver, o valor é devolvido.
 */
async function confirmCharge(tx: Db, chargeId: string): Promise<{ orderId: string; outcome: "pago" | "devolvido" } | null> {
  const [row] = await tx.query(`SELECT id FROM orders WHERE charge_id = $1`, [chargeId]);
  if (!row) return null;
  const order = (await loadOrder(tx, row.id, true))!;

  if (order.status === "aguardando") {
    await markPaid(tx, order);
    return { orderId: order.id, outcome: "pago" };
  }
  if (order.status !== "expirado") return null;

  const lots = await tx.query(
    `SELECT l.id, l.quantity - l.sold AS left, x.q
     FROM lots l JOIN (SELECT lot_id, sum(quantity)::int AS q FROM order_items
                       WHERE order_id = $1 GROUP BY lot_id) x ON x.lot_id = l.id
     FOR UPDATE OF l`,
    [order.id],
  );
  if (lots.every((lot) => lot.left >= lot.q)) {
    for (const lot of lots) await tx.query(`UPDATE lots SET sold = sold + $2 WHERE id = $1`, [lot.id, lot.q]);
    await markPaid(tx, order);
    await audit(tx, null, "pagamento_apos_expiracao_honrado", "pedido", order.id);
    return { orderId: order.id, outcome: "pago" };
  }
  await refundCharge(chargeId);
  await tx.query(`UPDATE orders SET status = 'reembolsado', refunded_at = now() WHERE id = $1`, [order.id]);
  await audit(tx, null, "pagamento_apos_expiracao_devolvido", "pedido", order.id);
  return { orderId: order.id, outcome: "devolvido" };
}

/**
 * Aviso do gateway. A assinatura é conferida e o mesmo aviso só é processado uma vez; o
 * pedido nunca é marcado como pago pelo retorno do navegador.
 */
export async function handleWebhook(rawBody: string, signature: string | null): Promise<number> {
  if (!isValidWebhook(rawBody, signature)) return 401;
  let event: { id?: unknown; type?: unknown; chargeId?: unknown };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return 400;
  }
  const { id, type, chargeId } = event;
  if (typeof id !== "string" || typeof chargeId !== "string") return 400;
  if (type !== "charge.paid") return 200;

  const result = await transaction(async (tx) => {
    const fresh = await tx.query(`INSERT INTO webhook_events (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id`, [id]);
    return fresh.length === 0 ? null : confirmCharge(tx, chargeId);
  });
  if (result) await mailBuyer(result.orderId, result.outcome);
  return 200;
}

/** Só no modo de demonstração: faz o papel do gateway avisando que a cobrança foi paga. */
export async function simulatePayment(user: User, orderId: string): Promise<void> {
  if (!DEMO) throw new UserError("Pagamento simulado só existe no modo de demonstração.");
  const row = await queryOne(`SELECT charge_id FROM orders WHERE id = $1 AND user_id = $2`, [orderId, user.id]);
  if (!row?.charge_id) throw new UserError("Pedido sem cobrança aberta.");
  const body = JSON.stringify({ id: `evt_${newToken(12)}`, type: "charge.paid", chargeId: row.charge_id });
  await handleWebhook(body, signWebhook(body));
}

/** Estorno feito pelo admin: devolve o valor, cancela os ingressos e libera o estoque. */
export async function refundOrder(actor: User, orderId: string): Promise<void> {
  await transaction(async (tx) => {
    const [row] = await tx.query<{ id: string; status: string; coupon_id: string | null; charge_id: string | null; method: string | null }>(
      `SELECT id, status, coupon_id, charge_id, method FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    );
    if (!row || row.status !== "pago") throw new UserError("Só pedido pago pode ser estornado.");
    const [{ used }] = await tx.query(
      `SELECT count(*)::int AS used FROM tickets WHERE order_id = $1 AND status = 'usado'`,
      [orderId],
    );
    if (used > 0) throw new UserError("Este pedido tem ingresso já usado na portaria.");

    if (row.charge_id) await refundCharge(row.charge_id);
    await tx.query(`UPDATE orders SET status = 'reembolsado', refunded_at = now() WHERE id = $1`, [orderId]);
    await tx.query(
      `UPDATE transfers SET status = 'cancelada', resolved_at = now()
       WHERE status = 'pendente' AND ticket_id IN (SELECT id FROM tickets WHERE order_id = $1)`,
      [orderId],
    );
    await tx.query(`UPDATE tickets SET status = 'cancelado' WHERE order_id = $1`, [orderId]);
    await tx.query(`UPDATE refund_requests SET status = 'aprovado' WHERE order_id = $1 AND status = 'aberto'`, [orderId]);
    // Cortesia não ocupou estoque, então não há o que devolver.
    if (row.method !== "cortesia") await release(tx, [row]);
    await audit(tx, actor.id, "estorno", "pedido", orderId);
  });
  await mailBuyer(orderId, "reembolsado");
}

export async function requestRefund(user: User, orderId: string, rawReason: string): Promise<void> {
  await transaction(async (tx) => {
    const [order] = await tx.query(`SELECT status FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`, [orderId, user.id]);
    if (!order || order.status !== "pago") throw new UserError("Este pedido não pode ser reembolsado.");
    const [open] = await tx.query(`SELECT id FROM refund_requests WHERE order_id = $1 AND status = 'aberto'`, [orderId]);
    if (open) throw new UserError("Já existe um pedido de reembolso em análise.");
    const id = newId();
    await tx.query(`INSERT INTO refund_requests (id, order_id, user_id, reason) VALUES ($1, $2, $3, $4)`, [
      id,
      orderId,
      user.id,
      rawReason.trim().slice(0, 500),
    ]);
    await audit(tx, user.id, "pedido_de_reembolso", "pedido", orderId);
  });
}

/**
 * Cortesia emitida pelo admin: ingressos sem cobrança para o e-mail informado. Não mexe no
 * estoque do lote nem entra nos números de venda.
 */
export async function issueCourtesy(
  admin: User,
  eventId: string,
  typeId: string,
  quantity: number,
  rawEmail: string,
  rawName: string,
): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const name = rawName.trim().slice(0, 120);
  if (!isEmail(email)) throw new UserError("Confira o e-mail de quem vai receber.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    throw new UserError("Gere de 1 a 50 ingressos por vez.");
  }

  const orderId = newOrderId();
  const title = await transaction(async (tx) => {
    const [type] = await tx.query(
      `SELECT e.title, (SELECT l.id FROM lots l WHERE l.ticket_type_id = t.id ORDER BY l.position LIMIT 1) AS lot_id
       FROM ticket_types t JOIN events e ON e.id = t.event_id WHERE t.id = $1 AND t.event_id = $2`,
      [typeId, eventId],
    );
    if (!type?.lot_id) throw new UserError("Tipo de ingresso não encontrado neste evento.");
    const [recipient] = await tx.query(
      `INSERT INTO users (id, email, name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
      [newId(), email, name],
    );
    await tx.query(
      `INSERT INTO orders (id, user_id, event_id, status, method, subtotal_cents, buyer_name, expires_at)
       VALUES ($1, $2, $3, 'aguardando', 'cortesia', 0, $4, now())`,
      [orderId, recipient.id, eventId, name || null],
    );
    await tx.query(
      `INSERT INTO order_items (id, order_id, ticket_type_id, lot_id, quantity, unit_price_cents)
       VALUES ($1, $2, $3, $4, $5, 0)`,
      [newId(), orderId, typeId, type.lot_id, quantity],
    );
    await markPaid(tx, (await loadOrder(tx, orderId))!);
    await audit(tx, admin.id, "cortesia_emitida", "pedido", orderId, { email, quantity });
    return type.title as string;
  });

  await sendMail({
    to: email,
    subject: `Você ganhou ${quantity === 1 ? "um ingresso" : `${quantity} ingressos`} para ${title}`,
    body: [
      `O Colaja emitiu ${quantity === 1 ? "um ingresso de cortesia" : `${quantity} ingressos de cortesia`} para ${title} em seu nome.`,
      "Entre com este e-mail para ver o QR Code. Mostre na portaria, com um documento com foto.",
    ],
    link: { label: "Ver meus ingressos", path: "/ingressos" },
  });
}
