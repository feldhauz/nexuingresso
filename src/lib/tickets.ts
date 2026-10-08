import "server-only";
import { audit } from "./audit";
import type { User } from "./auth";
import { MAX_TRANSFERS, TRANSFER_CLOSES_HOURS } from "./config";
import { query, queryOne, type Row, transaction } from "./db";
import { UserError } from "./errors";
import { newId, newToken, sha256 } from "./ids";
import { sendMail } from "./mail";
import { isEmail } from "./text";

export type TicketStatus = "valido" | "usado" | "em_transferencia" | "cancelado" | "sem_nome";

export type Ticket = {
  id: string;
  orderId: string;
  code: string;
  status: TicketStatus;
  usedAt: Date | null;
  transferCount: number;
  typeName: string;
  isHalf: boolean;
  /** Para quem o ingresso está sendo transferido, se houver transferência aberta. */
  pendingTo: string | null;
  /** Quem comprou é quem pode pedir reembolso do pedido. */
  isBuyer: boolean;
  refundRequested: boolean;
  /** Ingresso de camarote: nome do convidado e o camarote a que pertence. */
  holderName: string | null;
  group: { id: string; name: string; mine: boolean } | null;
  event: {
    slug: string;
    title: string;
    venue: string;
    city: string;
    startsAt: Date;
    endsAt: Date;
    timeZone: string;
    poster: { bg: string; fg: string };
  };
};

const TICKET_SELECT = `
  SELECT t.*, tt.name AS type_name, tt.is_half, e.slug, e.title, e.venue, e.city, e.starts_at, e.ends_at,
    e.time_zone, e.poster_bg, e.poster_fg, o.user_id AS buyer_id, g.name AS group_name, g.owner_id AS group_owner,
    (SELECT to_email FROM transfers tr WHERE tr.ticket_id = t.id AND tr.status = 'pendente' LIMIT 1) AS pending_to,
    EXISTS (SELECT 1 FROM refund_requests r WHERE r.order_id = t.order_id AND r.status = 'aberto') AS refund_requested
  FROM tickets t
  JOIN ticket_types tt ON tt.id = t.ticket_type_id
  JOIN events e ON e.id = t.event_id
  JOIN orders o ON o.id = t.order_id
  LEFT JOIN ticket_groups g ON g.id = t.group_id`;

function mapTicket(row: Row, userId: string): Ticket {
  return {
    id: row.id,
    orderId: row.order_id,
    code: row.code,
    status: row.status,
    usedAt: row.used_at,
    transferCount: row.transfer_count,
    typeName: row.type_name,
    isHalf: row.is_half,
    pendingTo: row.pending_to,
    isBuyer: row.buyer_id === userId,
    refundRequested: row.refund_requested,
    holderName: row.holder_name,
    group: row.group_id ? { id: row.group_id, name: row.group_name, mine: row.group_owner === userId } : null,
    event: {
      slug: row.slug,
      title: row.title,
      venue: row.venue,
      city: row.city,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timeZone: row.time_zone,
      poster: { bg: row.poster_bg, fg: row.poster_fg },
    },
  };
}

/** Ingressos do usuário: os próximos primeiro, os de eventos passados no fim. */
export async function listTickets(user: User): Promise<Ticket[]> {
  const rows = await query(
    `${TICKET_SELECT} WHERE t.owner_id = $1 AND t.status <> 'cancelado'
       AND (t.group_id IS NULL OR g.owner_id <> $1)
     ORDER BY (e.ends_at < now()), e.starts_at, t.created_at`,
    [user.id],
  );
  return rows.map((row) => mapTicket(row, user.id));
}

export async function getTicket(user: User, ticketId: string): Promise<Ticket | undefined> {
  const row = await queryOne(`${TICKET_SELECT} WHERE t.id = $1 AND t.owner_id = $2`, [ticketId, user.id]);
  return row && mapTicket(row, user.id);
}

/** Abre a transferência: o QR atual para de valer na hora. */
export async function startTransfer(user: User, ticketId: string, rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) throw new UserError("Confira o e-mail de quem vai receber.");
  if (email === user.email) throw new UserError("Este ingresso já é seu.");

  const token = newToken();
  const title = await transaction(async (tx) => {
    const [ticket] = await tx.query(
      `SELECT t.status, t.transfer_count, e.title,
         now() >= e.starts_at - make_interval(hours => $3) AS closed
       FROM tickets t JOIN events e ON e.id = t.event_id
       WHERE t.id = $1 AND t.owner_id = $2 FOR UPDATE OF t`,
      [ticketId, user.id, TRANSFER_CLOSES_HOURS],
    );
    if (!ticket) throw new UserError("Ingresso não encontrado.");
    if (ticket.status === "usado") throw new UserError("Ingresso já usado na portaria não pode ser transferido.");
    if (ticket.status !== "valido") throw new UserError("Este ingresso não pode ser transferido agora.");
    if (ticket.closed) {
      throw new UserError(`A transferência fecha ${TRANSFER_CLOSES_HOURS} horas antes do evento.`);
    }
    if (ticket.transfer_count >= MAX_TRANSFERS) {
      throw new UserError(`Este ingresso já foi transferido ${MAX_TRANSFERS} vezes, que é o limite.`);
    }
    await tx.query(`UPDATE tickets SET status = 'em_transferencia' WHERE id = $1`, [ticketId]);
    await tx.query(
      `INSERT INTO transfers (id, ticket_id, from_user_id, to_email, token_hash) VALUES ($1, $2, $3, $4, $5)`,
      [newId(), ticketId, user.id, email, sha256(token)],
    );
    await audit(tx, user.id, "transferencia_aberta", "ingresso", ticketId, { para: email });
    return ticket.title as string;
  });

  await sendMail({
    to: email,
    subject: `Você recebeu um ingresso para ${title}`,
    body: [
      `${user.name || user.email} está transferindo um ingresso de ${title} para você.`,
      "Para aceitar, entre com este e-mail pelo botão abaixo. O ingresso ganha um QR Code novo, só seu.",
      "A transferência é gratuita. O Colaja não intermedeia pagamento entre vocês.",
    ],
    link: { label: "Aceitar ingresso", path: `/transferencia/${token}` },
  });
}

/** Enquanto ninguém aceitou, o dono pode desistir e o ingresso volta a valer. */
export async function cancelTransfer(user: User, ticketId: string): Promise<void> {
  await transaction(async (tx) => {
    const [ticket] = await tx.query(
      `SELECT status FROM tickets WHERE id = $1 AND owner_id = $2 FOR UPDATE`,
      [ticketId, user.id],
    );
    if (!ticket || ticket.status !== "em_transferencia") throw new UserError("Não há transferência aberta.");
    await tx.query(
      `UPDATE transfers SET status = 'cancelada', resolved_at = now() WHERE ticket_id = $1 AND status = 'pendente'`,
      [ticketId],
    );
    await tx.query(`UPDATE tickets SET status = 'valido' WHERE id = $1`, [ticketId]);
    await audit(tx, user.id, "transferencia_cancelada", "ingresso", ticketId);
  });
}

export type TransferOffer = {
  status: "pendente" | "aceita" | "cancelada";
  toEmail: string;
  fromName: string;
  typeName: string;
  isHalf: boolean;
  title: string;
  venue: string;
  city: string;
  startsAt: Date;
  timeZone: string;
};

export async function getTransfer(token: string): Promise<TransferOffer | undefined> {
  const row = await queryOne(
    `SELECT tr.status, tr.to_email, u.name, u.email, tt.name AS type_name, tt.is_half,
       e.title, e.venue, e.city, e.starts_at, e.time_zone
     FROM transfers tr
     JOIN users u ON u.id = tr.from_user_id
     JOIN tickets t ON t.id = tr.ticket_id
     JOIN ticket_types tt ON tt.id = t.ticket_type_id
     JOIN events e ON e.id = t.event_id
     WHERE tr.token_hash = $1`,
    [sha256(token)],
  );
  return (
    row && {
      status: row.status,
      toEmail: row.to_email,
      fromName: row.name || row.email,
      typeName: row.type_name,
      isHalf: row.is_half,
      title: row.title,
      venue: row.venue,
      city: row.city,
      startsAt: row.starts_at,
      timeZone: row.time_zone,
    }
  );
}

/** No aceite o ingresso muda de dono e ganha um código novo; o antigo nunca mais funciona. */
export async function acceptTransfer(user: User, token: string): Promise<string> {
  const { ticketId, fromEmail, title } = await transaction(async (tx) => {
    const [transfer] = await tx.query(
      `SELECT tr.id, tr.ticket_id, tr.to_email, tr.status, u.email AS from_email, e.title
       FROM transfers tr
       JOIN users u ON u.id = tr.from_user_id
       JOIN tickets t ON t.id = tr.ticket_id
       JOIN events e ON e.id = t.event_id
       WHERE tr.token_hash = $1 FOR UPDATE OF tr, t`,
      [sha256(token)],
    );
    if (!transfer || transfer.status !== "pendente") {
      throw new UserError("Esta transferência não está mais disponível.");
    }
    if (transfer.to_email !== user.email) {
      throw new UserError(`Este ingresso foi enviado para ${transfer.to_email}. Entre com esse e-mail para aceitar.`);
    }
    await tx.query(
      `UPDATE tickets SET owner_id = $2, code = $3, status = 'valido', transfer_count = transfer_count + 1
       WHERE id = $1 AND status = 'em_transferencia'`,
      [transfer.ticket_id, user.id, newToken()],
    );
    await tx.query(`UPDATE transfers SET status = 'aceita', resolved_at = now() WHERE id = $1`, [transfer.id]);
    await audit(tx, user.id, "transferencia_aceita", "ingresso", transfer.ticket_id);
    return { ticketId: transfer.ticket_id as string, fromEmail: transfer.from_email as string, title: transfer.title as string };
  });

  await sendMail({
    to: fromEmail,
    subject: `Seu ingresso para ${title} foi transferido`,
    body: [`${user.email} aceitou o ingresso de ${title}. O QR Code antigo não vale mais.`],
  });
  return ticketId;
}

// ---- Check-in ----

/** Pode validar ingressos: o produtor do evento, quem ele autorizou por e-mail, ou o admin. */
export async function canCheckIn(user: User, eventId: string): Promise<boolean> {
  if (user.isAdmin) return true;
  const row = await queryOne(
    `SELECT 1 AS ok FROM events e JOIN producers p ON p.id = e.producer_id
     WHERE e.id = $1 AND (p.user_id = $2 OR EXISTS
       (SELECT 1 FROM checkin_staff s WHERE s.event_id = e.id AND s.email = $3))`,
    [eventId, user.id, user.email],
  );
  return !!row;
}

export type CheckInResult =
  | { state: "valido"; name: string; typeName: string; isHalf: boolean; group: string | null }
  | { state: "usado"; name: string; typeName: string; usedAt: string }
  | { state: "invalido"; reason: string };

/**
 * Valida um ingresso. A baixa é uma única atualização "marcar como usado se ainda não foi",
 * para dois leitores na mesma portaria não liberarem o mesmo ingresso.
 */
export async function checkIn(actor: User, eventId: string, rawCode: string): Promise<CheckInResult> {
  if (!(await canCheckIn(actor, eventId))) throw new UserError("Você não tem acesso à portaria deste evento.");
  const code = rawCode.trim();

  const detail = `(SELECT name FROM ticket_types WHERE id = t.ticket_type_id) AS type_name,
    (SELECT is_half FROM ticket_types WHERE id = t.ticket_type_id) AS is_half,
    coalesce(t.holder_name, (SELECT coalesce(nullif(u.name, ''), u.email) FROM users u WHERE u.id = t.owner_id)) AS owner_name,
    (SELECT g.name FROM ticket_groups g WHERE g.id = t.group_id) AS group_name`;

  const marked = await queryOne(
    `UPDATE tickets t SET status = 'usado', used_at = now(), used_by = $3
     WHERE t.code = $1 AND t.event_id = $2 AND t.status = 'valido'
     RETURNING ${detail}`,
    [code, eventId, actor.id],
  );
  if (marked) {
    return {
      state: "valido",
      name: marked.owner_name,
      typeName: marked.type_name,
      isHalf: marked.is_half,
      group: marked.group_name,
    };
  }

  const ticket = await queryOne(
    `SELECT t.status, t.event_id, t.used_at, e.time_zone, ${detail}
     FROM tickets t JOIN events e ON e.id = t.event_id WHERE t.code = $1`,
    [code],
  );
  if (!ticket) return { state: "invalido", reason: "Código não encontrado. Pode ser um ingresso transferido: peça o QR atual." };
  if (ticket.event_id !== eventId) return { state: "invalido", reason: "Ingresso de outro evento." };
  if (ticket.status === "usado") {
    const usedAt = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: ticket.time_zone,
    }).format(ticket.used_at);
    return { state: "usado", name: ticket.owner_name, typeName: ticket.type_name, usedAt };
  }
  if (ticket.status === "em_transferencia") return { state: "invalido", reason: "Ingresso em transferência. O QR só volta a valer com o novo dono." };
  if (ticket.status === "sem_nome") {
    return { state: "invalido", reason: "Ingresso de camarote ainda sem convidado cadastrado. O dono do camarote precisa gerar os QR Codes." };
  }
  return { state: "invalido", reason: "Ingresso cancelado." };
}
