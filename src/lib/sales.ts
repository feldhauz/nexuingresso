import "server-only";
import { audit } from "./audit";
import type { User } from "./auth";
import { ADMIN_EMAILS } from "./config";
import { query, transaction } from "./db";
import { UserError } from "./errors";
import { newId } from "./ids";
import { sendMail } from "./mail";
import { getProducer, hasAcceptedContract, type Producer } from "./producer";

// Painel de vendas do produtor e saque. O valor de um evento só fica disponível depois que
// o evento termina (docs/PLANEJAMENTO.md, risco R1), e sacar exige identidade verificada.
// Enquanto não há gateway com repasse automático, o saque é um pedido: o dono da plataforma
// paga por Pix e marca como pago no painel dele.

const PAID = `o.status = 'pago' AND o.method <> 'cortesia'`;

export type Balance = {
  /** Tudo o que as vendas renderam ao produtor. */
  earned: number;
  /** De eventos que ainda não terminaram. */
  upcoming: number;
  /** Pode ser sacado agora. */
  available: number;
  requested: number;
  paid: number;
};

async function balanceOf(producerId: string, db = { query }): Promise<Balance> {
  const [sales] = await db.query(
    `SELECT coalesce(sum(o.producer_cents), 0)::int AS earned,
       coalesce(sum(o.producer_cents) FILTER (WHERE e.ends_at > now()), 0)::int AS upcoming
     FROM orders o JOIN events e ON e.id = o.event_id WHERE e.producer_id = $1 AND ${PAID}`,
    [producerId],
  );
  const [out] = await db.query(
    `SELECT coalesce(sum(amount_cents) FILTER (WHERE status = 'solicitado'), 0)::int AS requested,
       coalesce(sum(amount_cents) FILTER (WHERE status = 'pago'), 0)::int AS paid
     FROM payouts WHERE producer_id = $1`,
    [producerId],
  );
  return {
    earned: sales.earned,
    upcoming: sales.upcoming,
    requested: out.requested,
    paid: out.paid,
    available: Math.max(0, sales.earned - sales.upcoming - out.requested - out.paid),
  };
}

export const getBalance = (producer: Producer) => balanceOf(producer.id);

/** Números do cartão de resumo; com `eventId`, só daquele evento. */
export async function getSalesSummary(producer: Producer, eventId: string | null) {
  const [row] = await query(
    `SELECT count(*)::int AS orders, coalesce(sum(o.producer_cents), 0)::int AS earned,
       coalesce((SELECT sum(i.quantity) FROM order_items i JOIN orders o2 ON o2.id = i.order_id JOIN events e2 ON e2.id = o2.event_id
                 WHERE e2.producer_id = $1 AND o2.status = 'pago' AND o2.method <> 'cortesia'
                   AND ($2::text IS NULL OR e2.id = $2)), 0)::int AS tickets,
       (SELECT count(*)::int FROM tickets t JOIN events e3 ON e3.id = t.event_id
         WHERE e3.producer_id = $1 AND t.status <> 'cancelado' AND ($2::text IS NULL OR e3.id = $2)) AS people,
       (SELECT count(*)::int FROM tickets t JOIN events e4 ON e4.id = t.event_id
         WHERE e4.producer_id = $1 AND t.status = 'usado' AND ($2::text IS NULL OR e4.id = $2)) AS used
     FROM orders o JOIN events e ON e.id = o.event_id
     WHERE e.producer_id = $1 AND ${PAID} AND ($2::text IS NULL OR e.id = $2)`,
    [producer.id, eventId],
  );
  return {
    orders: row.orders as number,
    earned: row.earned as number,
    tickets: row.tickets as number,
    people: row.people as number,
    used: row.used as number,
  };
}

export type Sale = {
  id: string;
  paid_at: Date;
  title: string;
  time_zone: string;
  buyer_name: string | null;
  email: string;
  method: string;
  producer_cents: number;
  items: string;
};

export async function listSales(producer: Producer, eventId: string | null): Promise<Sale[]> {
  return query<Sale>(
    `SELECT o.id, o.paid_at, e.title, e.time_zone, o.buyer_name, u.email, o.method, o.producer_cents,
       (SELECT string_agg(i.quantity || ' × ' || tt.name, ', ') FROM order_items i
          JOIN ticket_types tt ON tt.id = i.ticket_type_id WHERE i.order_id = o.id) AS items
     FROM orders o JOIN events e ON e.id = o.event_id JOIN users u ON u.id = o.user_id
     WHERE e.producer_id = $1 AND o.status = 'pago' AND ($2::text IS NULL OR e.id = $2)
     ORDER BY o.paid_at DESC LIMIT 300`,
    [producer.id, eventId],
  );
}

export type Attendee = { name: string; type_name: string; title: string; status: string };

/** Nomes de quem tem ingresso, em ordem alfabética. */
export async function listNames(producer: Producer, eventId: string | null): Promise<Attendee[]> {
  return query<Attendee>(
    `SELECT coalesce(t.holder_name, nullif(u.name, ''), CASE WHEN t.owner_id = o.user_id THEN o.buyer_name END, u.email) AS name,
       tt.name || coalesce(' · ' || g.name, '') AS type_name, e.title, t.status
     FROM tickets t
     JOIN events e ON e.id = t.event_id
     JOIN users u ON u.id = t.owner_id
     JOIN orders o ON o.id = t.order_id
     JOIN ticket_types tt ON tt.id = t.ticket_type_id
     LEFT JOIN ticket_groups g ON g.id = t.group_id
     WHERE e.producer_id = $1 AND t.status NOT IN ('cancelado', 'sem_nome') AND ($2::text IS NULL OR e.id = $2)
     ORDER BY 1, e.starts_at LIMIT 1000`,
    [producer.id, eventId],
  );
}

export type Box = {
  id: string;
  name: string;
  title: string;
  type_name: string;
  buyer_name: string | null;
  size: number;
  generated: number;
  guests: string;
};

export async function listBoxes(producer: Producer, eventId: string | null): Promise<Box[]> {
  return query<Box>(
    `SELECT g.id, g.name, e.title, tt.name AS type_name, o.buyer_name,
       (SELECT count(*)::int FROM tickets t WHERE t.group_id = g.id AND t.status <> 'cancelado') AS size,
       (SELECT count(*)::int FROM tickets t WHERE t.group_id = g.id AND t.status NOT IN ('cancelado', 'sem_nome')) AS generated,
       (SELECT coalesce(string_agg(t.holder_name, ', ' ORDER BY t.created_at, t.id), '') FROM tickets t
         WHERE t.group_id = g.id AND t.holder_name IS NOT NULL AND t.status <> 'cancelado') AS guests
     FROM ticket_groups g
     JOIN events e ON e.id = g.event_id
     JOIN ticket_types tt ON tt.id = g.ticket_type_id
     JOIN orders o ON o.id = g.order_id
     WHERE e.producer_id = $1 AND o.status = 'pago' AND ($2::text IS NULL OR e.id = $2)
     ORDER BY e.starts_at, g.name`,
    [producer.id, eventId],
  );
}

// ---- Saque ----

export type Payout = { id: string; amount_cents: number; status: "solicitado" | "pago"; created_at: Date; paid_at: Date | null };

export async function listPayouts(producer: Producer): Promise<Payout[]> {
  return query<Payout>(
    `SELECT id, amount_cents, status, created_at, paid_at FROM payouts WHERE producer_id = $1 ORDER BY created_at DESC`,
    [producer.id],
  );
}

/** Pede o saque de todo o valor disponível. */
export async function requestPayout(user: User, rawPixKey: string): Promise<void> {
  const producer = await getProducer(user);
  if (!producer) throw new UserError("Cadastro de produtor não encontrado.");
  if (!hasAcceptedContract(producer)) throw new UserError("Leia e aceite o contrato do produtor para sacar.");
  if (producer.kycStatus !== "aprovado") throw new UserError("Envie os documentos e aguarde a aprovação para sacar.");
  const pixKey = rawPixKey.trim();
  if (pixKey.length < 5 || pixKey.length > 140) throw new UserError("Informe a chave Pix que vai receber o valor.");

  const amount = await transaction(async (tx) => {
    // A trava no cadastro impede dois pedidos simultâneos de sacar o mesmo saldo.
    await tx.query(`SELECT id FROM producers WHERE id = $1 FOR UPDATE`, [producer.id]);
    const { available } = await balanceOf(producer.id, tx);
    if (available <= 0) throw new UserError("Não há valor disponível para saque agora.");
    const id = newId();
    await tx.query(`INSERT INTO payouts (id, producer_id, amount_cents, pix_key) VALUES ($1, $2, $3, $4)`, [
      id,
      producer.id,
      available,
      pixKey,
    ]);
    await audit(tx, user.id, "saque_solicitado", "saque", id, { valor: available });
    return available;
  });

  for (const admin of ADMIN_EMAILS) {
    await sendMail({
      to: admin,
      subject: `Saque solicitado por ${producer.name}`,
      body: [`${producer.name} pediu o saque de R$ ${(amount / 100).toFixed(2).replace(".", ",")}.`],
      link: { label: "Abrir o painel", path: "/feldhauspanel" },
    });
  }
}

// ---- Admin ----

export async function listPayoutRequests() {
  return query<{ id: string; amount_cents: number; pix_key: string; created_at: Date; producer: string; document: string; email: string }>(
    `SELECT y.id, y.amount_cents, y.pix_key, y.created_at, p.name AS producer, p.document, u.email
     FROM payouts y JOIN producers p ON p.id = y.producer_id JOIN users u ON u.id = p.user_id
     WHERE y.status = 'solicitado' ORDER BY y.created_at`,
  );
}

/** O admin fez o Pix por fora e registra que pagou. */
export async function markPayoutPaid(admin: User, payoutId: string): Promise<void> {
  const [row] = await query(
    `UPDATE payouts y SET status = 'pago', paid_at = now() FROM producers p, users u
     WHERE y.id = $1 AND y.status = 'solicitado' AND p.id = y.producer_id AND u.id = p.user_id
     RETURNING u.email, y.amount_cents`,
    [payoutId],
  );
  if (!row) throw new UserError("Este saque já foi marcado como pago.");
  await audit({ query }, admin.id, "saque_pago", "saque", payoutId, { valor: row.amount_cents });
  await sendMail({
    to: row.email,
    subject: "Seu saque foi pago",
    body: [`O saque de R$ ${(row.amount_cents / 100).toFixed(2).replace(".", ",")} foi enviado para a sua chave Pix.`],
    link: { label: "Ver vendas", path: "/produtor/vendas" },
  });
}
