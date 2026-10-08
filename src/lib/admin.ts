import "server-only";
import { audit } from "./audit";
import type { User } from "./auth";
import { query } from "./db";
import { getEventBySlug, getTicketTypes } from "./events";
import { UserError } from "./errors";
import { sendMail } from "./mail";

// Toda função aqui recebe o usuário já conferido por requireAdmin().

export async function listPendingProducers() {
  return query<{ id: string; name: string; document: string; phone: string; email: string }>(
    `SELECT p.id, p.name, p.document, p.phone, u.email FROM producers p JOIN users u ON u.id = p.user_id
     WHERE p.status = 'pendente' ORDER BY p.created_at`,
  );
}

export async function setProducerStatus(admin: User, producerId: string, approve: boolean): Promise<void> {
  const [row] = await query(
    `UPDATE producers p SET status = $2 FROM users u
     WHERE p.id = $1 AND u.id = p.user_id AND p.status = 'pendente' RETURNING u.email`,
    [producerId, approve ? "aprovado" : "recusado"],
  );
  if (!row) throw new UserError("Cadastro já analisado.");
  await audit({ query }, admin.id, approve ? "produtor_aprovado" : "produtor_recusado", "produtor", producerId);
  await sendMail({
    to: row.email,
    subject: approve ? "Seu cadastro de produtor foi aprovado" : "Seu cadastro de produtor não foi aprovado",
    body: [
      approve
        ? "Você já pode enviar eventos para publicação no Colaja."
        : "Não conseguimos aprovar o cadastro com os dados enviados. Responda este e-mail para revisarmos.",
    ],
    link: approve ? { label: "Abrir o painel", path: "/produtor" } : undefined,
  });
}

export async function listPendingEvents() {
  return query<{ id: string; slug: string; title: string; city: string; starts_at: Date; time_zone: string; producer: string; producer_status: string }>(
    `SELECT e.id, e.slug, e.title, e.city, e.starts_at, e.time_zone, p.name AS producer, p.status AS producer_status
     FROM events e JOIN producers p ON p.id = e.producer_id
     WHERE e.status = 'em_analise' ORDER BY e.created_at`,
  );
}

export async function setEventStatus(admin: User, eventId: string, approve: boolean): Promise<void> {
  const [row] = await query(
    `UPDATE events e SET status = $2 FROM producers p, users u
     WHERE e.id = $1 AND p.id = e.producer_id AND u.id = p.user_id AND e.status = 'em_analise'
     RETURNING u.email, e.title, e.slug, p.id AS producer_id, p.name AS producer_name`,
    [eventId, approve ? "publicado" : "recusado"],
  );
  if (!row) throw new UserError("Este evento já foi analisado.");
  await audit({ query }, admin.id, approve ? "evento_publicado" : "evento_recusado", "evento", eventId);
  await sendMail({
    to: row.email,
    subject: approve ? `${row.title} está no ar` : `${row.title} não foi publicado`,
    body: [
      approve
        ? "Seu evento foi publicado e já pode vender. Compartilhe o link pelo botão abaixo."
        : "O evento precisa de ajustes antes de ir ao ar. Edite no painel e envie de novo.",
    ],
    link: approve ? { label: "Ver página do evento", path: `/e/${row.slug}` } : { label: "Abrir o painel", path: "/produtor" },
  });

  if (!approve) return;
  const followers = await query<{ email: string }>(
    `SELECT u.email FROM producer_followers f JOIN users u ON u.id = f.user_id WHERE f.producer_id = $1`,
    [row.producer_id],
  );
  for (const follower of followers) {
    await sendMail({
      to: follower.email,
      subject: `${row.producer_name} anunciou ${row.title}`,
      body: [
        `${row.producer_name}, que você segue no Colaja, publicou um evento novo: ${row.title}.`,
        "Para não receber mais estes avisos, abra o perfil do produtor e toque em Seguindo.",
      ],
      link: { label: "Ver evento", path: `/e/${row.slug}` },
    });
  }
}

export async function listRecentOrders() {
  return query<{
    id: string;
    status: string;
    method: string | null;
    total_cents: number;
    fee_cents: number;
    created_at: Date;
    email: string;
    title: string;
    refund_reason: string | null;
  }>(
    `SELECT o.id, o.status, o.method, o.total_cents, o.fee_cents, o.created_at, u.email, e.title,
       (SELECT r.reason FROM refund_requests r WHERE r.order_id = o.id AND r.status = 'aberto' LIMIT 1) AS refund_reason
     FROM orders o JOIN users u ON u.id = o.user_id JOIN events e ON e.id = o.event_id
     WHERE o.status IN ('aguardando', 'pago', 'reembolsado')
     ORDER BY (EXISTS (SELECT 1 FROM refund_requests r WHERE r.order_id = o.id AND r.status = 'aberto')) DESC,
       o.created_at DESC
     LIMIT 100`,
  );
}

export async function rejectRefund(admin: User, orderId: string): Promise<void> {
  const rows = await query(
    `UPDATE refund_requests SET status = 'recusado' WHERE order_id = $1 AND status = 'aberto' RETURNING id`,
    [orderId],
  );
  if (rows.length === 0) throw new UserError("Não há pedido de reembolso aberto.");
  await audit({ query }, admin.id, "reembolso_recusado", "pedido", orderId);
}

// ---- Painel: números, vendas e cortesias ----

export async function getOverview() {
  const [row] = await query(
    `SELECT
       (SELECT count(*)::int FROM users) AS users,
       (SELECT count(*)::int FROM users WHERE created_at > now() - interval '7 days') AS users_week,
       (SELECT count(DISTINCT user_id)::int FROM sessions WHERE created_at > now() - interval '30 days') AS active_month,
       (SELECT count(*)::int FROM producers) AS producers,
       (SELECT count(*)::int FROM producers WHERE kyc_status = 'aprovado') AS producers_verified,
       (SELECT count(*)::int FROM events WHERE status = 'publicado' AND ends_at > now()) AS events_live,
       count(*)::int AS orders,
       coalesce(sum(total_cents), 0)::int AS total,
       coalesce(sum(fee_cents), 0)::int AS fee,
       count(*) FILTER (WHERE paid_at > now() - interval '30 days')::int AS orders30,
       coalesce(sum(total_cents) FILTER (WHERE paid_at > now() - interval '30 days'), 0)::int AS total30,
       coalesce(sum(fee_cents) FILTER (WHERE paid_at > now() - interval '30 days'), 0)::int AS fee30
     FROM orders WHERE status = 'pago' AND method <> 'cortesia'`,
  );
  return {
    users: row.users as number,
    usersWeek: row.users_week as number,
    activeMonth: row.active_month as number,
    producers: row.producers as number,
    producersVerified: row.producers_verified as number,
    eventsLive: row.events_live as number,
    orders: row.orders as number,
    total: row.total as number,
    fee: row.fee as number,
    orders30: row.orders30 as number,
    total30: row.total30 as number,
    fee30: row.fee30 as number,
  };
}

export async function listSalesByEvent() {
  return query<{ id: string; title: string; producer: string; orders: number; total: number; fee: number }>(
    `SELECT e.id, e.title, p.name AS producer, count(o.id)::int AS orders,
       coalesce(sum(o.total_cents), 0)::int AS total, coalesce(sum(o.fee_cents), 0)::int AS fee
     FROM orders o JOIN events e ON e.id = o.event_id JOIN producers p ON p.id = e.producer_id
     WHERE o.status = 'pago' AND o.method <> 'cortesia'
     GROUP BY e.id, e.title, p.name ORDER BY total DESC LIMIT 50`,
  );
}

/** Evento a partir do link colado (ou só do final dele), com os tipos de ingresso que têm lote. */
export async function findCourtesyEvent(link: string) {
  const slug = link.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() ?? "";
  const event = await getEventBySlug(slug.toLowerCase());
  if (!event) return null;
  const types = (await getTicketTypes(event.id)).filter((type) => type.lots.length > 0);
  return types.length > 0 ? { event, types } : null;
}
