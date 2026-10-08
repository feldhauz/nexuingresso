import "server-only";
import { audit } from "./audit";
import type { User } from "./auth";
import { PAYOUT_DAYS_AFTER_EVENT } from "./config";
import { query, queryOne, transaction } from "./db";
import { UserError } from "./errors";
import { type Event, getEventById } from "./events";
import { newId } from "./ids";
import { lookupCnpj } from "./receita";
import { ageOn, isCnpj, isCpf, isEmail, onlyDigits, slugify } from "./text";
import { CONTRACT_VERSION } from "./contract";
import { DEFAULT_TIME_ZONE, isTimeZone, zonedToUtc } from "./time";

export type Producer = {
  id: string;
  slug: string;
  bio: string;
  instagram: string;
  name: string;
  document: string;
  phone: string;
  status: "pendente" | "aprovado" | "recusado";
  /** Verificação de identidade; sem ela aprovada o repasse fica bloqueado. */
  kycStatus: "nao_enviado" | "em_analise" | "aprovado" | "recusado";
  kycNote: string;
  /** Versão do contrato do produtor que ele aceitou, se aceitou. */
  contractVersion: string | null;
};

export const POSTERS = [
  { bg: "#2b3bff", fg: "#ffffff", label: "Azul" },
  { bg: "#ff5a36", fg: "#1a0f0a", label: "Laranja" },
  { bg: "#0f7a5c", fg: "#f4f1e4", label: "Verde" },
  { bg: "#1b1b3a", fg: "#ffd21f", label: "Noite" },
  { bg: "#f2c8e0", fg: "#3a0f2c", label: "Rosa" },
  { bg: "#111111", fg: "#ffffff", label: "Preto" },
];

export async function getProducer(user: User): Promise<Producer | undefined> {
  return queryOne<Producer>(`SELECT id, slug, bio, instagram, name, document, phone, status, kyc_status AS "kycStatus", kyc_note AS "kycNote",
       contract_version AS "contractVersion"\n     FROM producers WHERE user_id = $1`, [user.id]);
}

export async function registerProducer(user: User, form: FormData): Promise<void> {
  const name = text(form, "name", 120);
  const document = onlyDigits(text(form, "document", 20));
  const phone = onlyDigits(text(form, "phone", 20));
  if (name.length < 3) throw new UserError("Digite o nome da produtora ou o seu nome.");
  if (!(document.length === 11 ? isCpf(document) : isCnpj(document))) {
    throw new UserError("Digite um CPF ou CNPJ válido. Confira os números.");
  }
  if (phone.length < 10) throw new UserError("Digite o telefone com DDD.");
  const birth = text(form, "birthDate", 10);
  const age = ageOn(birth, new Date());
  if (age === null) throw new UserError("Informe a data de nascimento.");
  if (age < 18) throw new UserError("É preciso ter 18 anos ou mais para vender ingressos no Colaja.");
  if (await getProducer(user)) throw new UserError("Você já tem cadastro de produtor.");

  const id = newId();
  const slug = await freeSlug("producers", slugify(name) || "produtor");
  const cnpjInfo = document.length === 14 ? await lookupCnpj(document) : "";
  // Com documento válido e maioridade, a conta já nasce liberada para criar eventos. Receber
  // o dinheiro depende da verificação de identidade.
  await query(
    `INSERT INTO producers (id, user_id, slug, name, document, phone, birth_date, cnpj_info, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, 'aprovado')`,
    [id, user.id, slug, name, document, phone, birth, cnpjInfo],
  );
  await audit({ query }, user.id, "cadastro_de_produtor", "produtor", id);
}

/** O evento, se for do usuário (ou se ele for admin). A autorização é sempre conferida aqui. */
export async function getOwnedEvent(user: User, eventId: string): Promise<Event> {
  const row = await queryOne(
    `SELECT e.id FROM events e JOIN producers p ON p.id = e.producer_id WHERE e.id = $1 AND (p.user_id = $2 OR $3)`,
    [eventId, user.id, user.isAdmin],
  );
  const event = row && (await getEventById(eventId));
  if (!event) throw new UserError("Evento não encontrado.");
  return event;
}

/** O endereço pedido, ou o mesmo com -2, -3… se já estiver em uso. */
async function freeSlug(table: "events" | "producers", base: string): Promise<string> {
  const taken = await query<{ slug: string }>(`SELECT slug FROM ${table} WHERE slug LIKE $1`, [`${base}%`]);
  let slug = base;
  for (let n = 2; taken.some((row) => row.slug === slug); n++) slug = `${base}-${n}`;
  return slug;
}

function text(form: FormData, key: string, max: number): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** "40", "40,5" ou "1.200,00" em centavos. */
export function parseMoney(raw: string): number | null {
  const clean = raw.replace(/[R$\s.]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

function parseInteger(raw: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= min && value <= max ? value : null;
}

/** Tira vazios e repetidos e limita a quantidade e o tamanho de cada item. */
function cleanList(items: string[], maxItems: number, maxLength: number): string[] {
  const clean = items.map((item) => item.trim().replace(/\s+/g, " ").slice(0, maxLength)).filter(Boolean);
  return [...new Set(clean)].slice(0, maxItems);
}

function readEvent(form: FormData) {
  const title = text(form, "title", 100);
  const venue = text(form, "venue", 100);
  const city = text(form, "city", 60);
  const timeZone = text(form, "timeZone", 40) || DEFAULT_TIME_ZONE;
  const startsAt = zonedToUtc(text(form, "startsAt", 16), timeZone);
  const endsAt = zonedToUtc(text(form, "endsAt", 16), timeZone);
  const minAge = parseInteger(text(form, "minAge", 2) || "0", 0, 21);
  const maxPerCpf = parseInteger(text(form, "maxPerCpf", 2) || "6", 1, 20);
  const [bg, fg] = text(form, "poster", 20).split("|");

  if (title.length < 3) throw new UserError("Dê um nome ao evento.");
  if (!venue) throw new UserError("Informe o local.");
  if (!city) throw new UserError("Informe a cidade.");
  if (!isTimeZone(timeZone)) throw new UserError("Fuso horário inválido.");
  if (!startsAt || !endsAt) throw new UserError("Informe data e hora de início e de término.");
  if (endsAt <= startsAt) throw new UserError("O término precisa ser depois do início.");
  if (minAge === null) throw new UserError("Idade mínima inválida.");
  if (maxPerCpf === null) throw new UserError("O limite por CPF vai de 1 a 20.");
  const poster = POSTERS.find((p) => p.bg === bg && p.fg === fg) ?? POSTERS[0];

  return {
    title,
    description: text(form, "description", 2000),
    venue,
    address: text(form, "address", 160),
    city,
    citySlug: slugify(city),
    timeZone,
    startsAt,
    endsAt,
    minAge,
    maxPerCpf,
    poster,
    absorbFee: form.get("absorbFee") === "on",
    moods: cleanList(text(form, "moods", 120).toLowerCase().split(","), 4, 24).join(","),
  };
}

export async function createEvent(user: User, form: FormData): Promise<string> {
  const producer = await getProducer(user);
  if (!producer) throw new UserError("Faça o cadastro de produtor antes de criar um evento.");
  const e = readEvent(form);
  if (e.startsAt <= new Date()) throw new UserError("A data do evento já passou.");

  const slug = await freeSlug("events", slugify(`${e.title} ${e.city}`) || "evento");

  const id = newId();
  await query(
    `INSERT INTO events (id, producer_id, slug, title, description, venue, address, city, city_slug,
       starts_at, ends_at, time_zone, min_age, poster_bg, poster_fg, absorb_fee, max_per_cpf, moods)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [id, producer.id, slug, e.title, e.description, e.venue, e.address, e.city, e.citySlug, e.startsAt,
      e.endsAt, e.timeZone, e.minAge, e.poster.bg, e.poster.fg, e.absorbFee, e.maxPerCpf, e.moods],
  );
  return id;
}

/** Troca o final do link do evento. O endereço antigo passa a redirecionar para o novo. */
async function changeSlug(event: Event, rawSlug: string): Promise<void> {
  const slug = slugify(rawSlug);
  if (slug === event.slug) return;
  if (slug.length < 3) throw new UserError("O final do link precisa de pelo menos 3 letras ou números.");
  const [taken] = await query(
    `SELECT 1 AS x FROM events WHERE slug = $1 AND id <> $2
     UNION ALL SELECT 1 FROM slug_redirects WHERE slug = $1 AND event_id <> $2 LIMIT 1`,
    [slug, event.id],
  );
  if (taken) throw new UserError("Este final de link já está em uso por outro evento.");
  await transaction(async (tx) => {
    await tx.query(`DELETE FROM slug_redirects WHERE slug = $1`, [slug]);
    await tx.query(
      `INSERT INTO slug_redirects (slug, event_id) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET event_id = EXCLUDED.event_id`,
      [event.slug, event.id],
    );
    await tx.query(`UPDATE events SET slug = $2 WHERE id = $1`, [event.id, slug]);
  });
}

export async function updateEvent(user: User, eventId: string, form: FormData): Promise<void> {
  const event = await getOwnedEvent(user, eventId);
  const e = readEvent(form);
  if (form.has("slug")) await changeSlug(event, text(form, "slug", 80));
  await query(
    `UPDATE events SET title = $2, description = $3, venue = $4, address = $5, city = $6, city_slug = $7,
       starts_at = $8, ends_at = $9, time_zone = $10, min_age = $11, poster_bg = $12, poster_fg = $13,
       absorb_fee = $14, max_per_cpf = $15, moods = $16
     WHERE id = $1`,
    [eventId, e.title, e.description, e.venue, e.address, e.city, e.citySlug, e.startsAt, e.endsAt,
      e.timeZone, e.minAge, e.poster.bg, e.poster.fg, e.absorbFee, e.maxPerCpf, e.moods],
  );
  await audit({ query }, user.id, "evento_editado", "evento", eventId);
}

function readLot(form: FormData, timeZone: string) {
  const name = text(form, "lotName", 40) || "Lote único";
  const price = parseMoney(text(form, "price", 12) || "0");
  const quantity = parseInteger(text(form, "quantity", 6), 1, 100000);
  const rawEnd = text(form, "lotEndsAt", 16);
  const endsAt = rawEnd ? zonedToUtc(rawEnd, timeZone) : null;
  if (price === null) throw new UserError("Preço inválido. Use o formato 40,00.");
  if (quantity === null) throw new UserError("Informe a quantidade de ingressos do lote.");
  if (rawEnd && !endsAt) throw new UserError("Data de virada inválida.");
  return { name, price, quantity, endsAt };
}

async function nextPosition(table: "ticket_types" | "lots", column: string, parentId: string): Promise<number> {
  const [{ n }] = await query<{ n: number }>(
    `SELECT coalesce(max(position), -1)::int + 1 AS n FROM ${table} WHERE ${column} = $1`,
    [parentId],
  );
  return n;
}

export async function addTicketType(user: User, eventId: string, form: FormData): Promise<void> {
  const event = await getOwnedEvent(user, eventId);
  const name = text(form, "name", 60);
  if (!name) throw new UserError("Dê um nome ao ingresso (ex.: Pista).");
  const lot = readLot(form, event.timeZone);
  const groupSize = parseInteger(text(form, "groupSize", 2) || "1", 1, 50);
  if (groupSize === null) throw new UserError("Um camarote ou mesa aceita de 2 a 50 pessoas.");
  const typeId = newId();
  const position = await nextPosition("ticket_types", "event_id", eventId);
  await transaction(async (tx) => {
    await tx.query(
      `INSERT INTO ticket_types (id, event_id, name, detail, is_half, position, group_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [typeId, eventId, name, text(form, "detail", 100), form.get("isHalf") === "on", position, groupSize],
    );
    await tx.query(
      `INSERT INTO lots (id, ticket_type_id, name, price_cents, quantity, ends_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [newId(), typeId, lot.name, lot.price, lot.quantity, lot.endsAt],
    );
  });
}

async function ownedType(user: User, typeId: string) {
  const row = await queryOne(`SELECT event_id FROM ticket_types WHERE id = $1`, [typeId]);
  if (!row) throw new UserError("Ingresso não encontrado.");
  return getOwnedEvent(user, row.event_id);
}

async function ownedLot(user: User, lotId: string) {
  const row = await queryOne(`SELECT ticket_type_id FROM lots WHERE id = $1`, [lotId]);
  if (!row) throw new UserError("Lote não encontrado.");
  return ownedType(user, row.ticket_type_id);
}

export async function addLot(user: User, typeId: string, form: FormData): Promise<void> {
  const event = await ownedType(user, typeId);
  const lot = readLot(form, event.timeZone);
  const position = await nextPosition("lots", "ticket_type_id", typeId);
  await query(
    `INSERT INTO lots (id, ticket_type_id, name, price_cents, quantity, ends_at, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [newId(), typeId, lot.name, lot.price, lot.quantity, lot.endsAt, position],
  );
}

export async function updateLot(user: User, lotId: string, form: FormData): Promise<void> {
  const event = await ownedLot(user, lotId);
  const lot = readLot(form, event.timeZone);
  const updated = await query(
    `UPDATE lots SET name = $2, price_cents = $3, quantity = $4, ends_at = $5
     WHERE id = $1 AND sold <= $4 RETURNING id`,
    [lotId, lot.name, lot.price, lot.quantity, lot.endsAt],
  );
  if (updated.length === 0) throw new UserError("A quantidade não pode ficar abaixo do que já foi vendido.");
  await audit({ query }, user.id, "lote_editado", "lote", lotId, { preco: lot.price, quantidade: lot.quantity });
}

export async function deleteLot(user: User, lotId: string): Promise<void> {
  await ownedLot(user, lotId);
  const [used] = await query(`SELECT 1 AS x FROM order_items WHERE lot_id = $1 LIMIT 1`, [lotId]);
  if (used) throw new UserError("Este lote já teve pedidos e não pode ser apagado. Reduza a quantidade para encerrar.");
  await transaction(async (tx) => {
    const [lot] = await tx.query(`DELETE FROM lots WHERE id = $1 RETURNING ticket_type_id`, [lotId]);
    const [left] = await tx.query(`SELECT 1 AS x FROM lots WHERE ticket_type_id = $1 LIMIT 1`, [lot.ticket_type_id]);
    if (!left) await tx.query(`DELETE FROM ticket_types WHERE id = $1`, [lot.ticket_type_id]);
  });
}

export async function addCoupon(user: User, eventId: string, form: FormData): Promise<void> {
  await getOwnedEvent(user, eventId);
  const code = text(form, "code", 20).toUpperCase();
  const percent = parseInteger(text(form, "percent", 3), 1, 100);
  const rawMax = text(form, "maxUses", 6);
  const maxUses = rawMax ? parseInteger(rawMax, 1, 100000) : null;
  if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new UserError("O código do cupom usa de 3 a 20 letras e números.");
  if (percent === null) throw new UserError("O desconto vai de 1 a 100%.");
  if (rawMax && maxUses === null) throw new UserError("Limite de usos inválido.");
  const created = await query(
    `INSERT INTO coupons (id, event_id, code, percent_off, max_uses) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id, code) DO NOTHING RETURNING id`,
    [newId(), eventId, code, percent, maxUses],
  );
  if (created.length === 0) throw new UserError("Já existe um cupom com este código.");
}

export async function deleteCoupon(user: User, couponId: string): Promise<void> {
  const row = await queryOne(`SELECT event_id FROM coupons WHERE id = $1`, [couponId]);
  if (!row) throw new UserError("Cupom não encontrado.");
  await getOwnedEvent(user, row.event_id);
  const [used] = await query(`SELECT 1 AS x FROM orders WHERE coupon_id = $1 LIMIT 1`, [couponId]);
  // Cupom já usado não some do histórico: só para de aceitar novos usos.
  if (used) await query(`UPDATE coupons SET max_uses = used WHERE id = $1`, [couponId]);
  else await query(`DELETE FROM coupons WHERE id = $1`, [couponId]);
}

export async function addStaff(user: User, eventId: string, rawEmail: string): Promise<void> {
  await getOwnedEvent(user, eventId);
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) throw new UserError("Confira o e-mail.");
  await query(`INSERT INTO checkin_staff (event_id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [eventId, email]);
  await audit({ query }, user.id, "portaria_autorizada", "evento", eventId, { email });
}

export async function removeStaff(user: User, eventId: string, email: string): Promise<void> {
  await getOwnedEvent(user, eventId);
  await query(`DELETE FROM checkin_staff WHERE event_id = $1 AND email = $2`, [eventId, email]);
  await audit({ query }, user.id, "portaria_removida", "evento", eventId, { email });
}

/** Envia o evento para aprovação. Só depois de aprovado ele aparece na vitrine. */
export async function submitEvent(user: User, eventId: string): Promise<void> {
  const event = await getOwnedEvent(user, eventId);
  if (event.status !== "rascunho" && event.status !== "recusado") {
    throw new UserError("Este evento já foi enviado.");
  }
  const [lot] = await query(
    `SELECT 1 AS x FROM lots l JOIN ticket_types t ON t.id = l.ticket_type_id WHERE t.event_id = $1 LIMIT 1`,
    [eventId],
  );
  if (!lot) throw new UserError("Cadastre pelo menos um ingresso antes de publicar.");
  await query(`UPDATE events SET status = 'em_analise' WHERE id = $1`, [eventId]);
  await audit({ query }, user.id, "evento_enviado", "evento", eventId);
}

export type EventSummary = {
  id: string;
  slug: string;
  title: string;
  status: Event["status"];
  startsAt: Date;
  timeZone: string;
  sold: number;
  capacity: number;
  producerCents: number;
};

export async function listProducerEvents(producer: Producer): Promise<EventSummary[]> {
  const rows = await query(
    `SELECT e.id, e.slug, e.title, e.status, e.starts_at, e.time_zone,
       (SELECT coalesce(sum(i.quantity), 0)::int FROM order_items i JOIN orders o ON o.id = i.order_id
         WHERE o.event_id = e.id AND o.status = 'pago') AS sold,
       (SELECT coalesce(sum(l.quantity), 0)::int FROM lots l JOIN ticket_types tt ON tt.id = l.ticket_type_id
         WHERE tt.event_id = e.id) AS capacity,
       (SELECT coalesce(sum(o.producer_cents), 0)::int FROM orders o
         WHERE o.event_id = e.id AND o.status = 'pago') AS producer_cents
     FROM events e WHERE e.producer_id = $1 ORDER BY e.starts_at DESC`,
    [producer.id],
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    startsAt: row.starts_at,
    timeZone: row.time_zone,
    sold: row.sold,
    capacity: row.capacity,
    producerCents: row.producer_cents,
  }));
}

/** Extrato do evento. Com split, não há saque: o gateway repassa depois do evento. */
export async function getEventStats(event: Event) {
  const [totals] = await query(
    `SELECT count(*)::int AS orders, coalesce(sum(total_cents), 0)::int AS paid_cents,
       coalesce(sum(fee_cents), 0)::int AS fee_cents, coalesce(sum(producer_cents), 0)::int AS producer_cents,
       coalesce(sum(discount_cents), 0)::int AS discount_cents
     FROM orders WHERE event_id = $1 AND status = 'pago'`,
    [event.id],
  );
  const [tickets] = await query(
    `SELECT (SELECT coalesce(sum(i.quantity), 0)::int FROM order_items i JOIN orders o ON o.id = i.order_id
              WHERE o.event_id = $1 AND o.status = 'pago') AS sold,
       count(*) FILTER (WHERE status = 'usado')::int AS used
     FROM tickets WHERE event_id = $1`,
    [event.id],
  );
  const [kyc] = await query(`SELECT kyc_status FROM producers WHERE id = $1`, [event.producerId]);
  const byType = await query<{ name: string; sold: number }>(
    `SELECT tt.name, (SELECT coalesce(sum(i.quantity), 0)::int FROM order_items i JOIN orders o ON o.id = i.order_id
                       WHERE i.ticket_type_id = tt.id AND o.status = 'pago') AS sold
     FROM ticket_types tt WHERE tt.event_id = $1 ORDER BY tt.position`,
    [event.id],
  );
  return {
    orders: totals.orders as number,
    paidCents: totals.paid_cents as number,
    feeCents: totals.fee_cents as number,
    producerCents: totals.producer_cents as number,
    discountCents: totals.discount_cents as number,
    sold: tickets.sold as number,
    used: tickets.used as number,
    byType,
    payoutAt: new Date(event.endsAt.getTime() + PAYOUT_DAYS_AFTER_EVENT * 24 * 60 * 60 * 1000),
    verified: kyc?.kyc_status === "aprovado",
  };
}

export type Participant = {
  name: string;
  email: string;
  cpf: string;
  typeName: string;
  orderId: string;
  status: string;
  usedAt: Date | null;
};

/** Lista da portaria: também é o plano B se a internet falhar (docs/PLANEJAMENTO.md, risco R4). */
export async function listParticipants(eventId: string): Promise<Participant[]> {
  const rows = await query(
    `SELECT u.name, u.email, o.buyer_name, o.buyer_cpf, t.order_id, t.status, t.used_at, t.holder_name,
       tt.name || coalesce(' · ' || g.name, '') AS type_name,
       (t.owner_id = o.user_id) AS is_buyer
     FROM tickets t
     JOIN users u ON u.id = t.owner_id
     JOIN orders o ON o.id = t.order_id
     JOIN ticket_types tt ON tt.id = t.ticket_type_id
     LEFT JOIN ticket_groups g ON g.id = t.group_id
     WHERE t.event_id = $1 AND t.status <> 'cancelado'
     ORDER BY coalesce(t.holder_name, nullif(u.name, ''), o.buyer_name), t.created_at`,
    [eventId],
  );
  return rows.map((row) => ({
    name: row.holder_name || row.name || (row.is_buyer ? row.buyer_name : "") || row.email,
    email: row.email,
    // O CPF é o de quem comprou; ingresso transferido fica sem CPF na lista.
    cpf: row.is_buyer && !row.holder_name ? (row.buyer_cpf ?? "") : "",
    typeName: row.type_name,
    orderId: row.order_id,
    status: row.status,
    usedAt: row.used_at,
  }));
}

export async function getEventExtras(eventId: string) {
  const coupons = await query<{ id: string; code: string; percent_off: number; max_uses: number | null; used: number }>(
    `SELECT id, code, percent_off, max_uses, used FROM coupons WHERE event_id = $1 ORDER BY code`,
    [eventId],
  );
  const staff = await query<{ email: string }>(`SELECT email FROM checkin_staff WHERE event_id = $1 ORDER BY email`, [eventId]);
  return { coupons, staff: staff.map((s) => s.email) };
}

// ---- Perfil público e seguidores ----

export type ProducerProfile = {
  id: string;
  slug: string;
  name: string;
  bio: string;
  instagram: string;
  since: number;
  followers: number;
  events: number;
  following: boolean;
};

/** Perfil público. Só existe para produtor aprovado. */
export async function getProducerProfile(
  key: { slug: string } | { id: string },
  viewer: User | null,
): Promise<ProducerProfile | undefined> {
  const row = await queryOne(
    `SELECT p.id, p.slug, p.name, p.bio, p.instagram, extract(year FROM p.created_at)::int AS since,
       (SELECT count(*)::int FROM producer_followers f WHERE f.producer_id = p.id) AS followers,
       (SELECT count(*)::int FROM events e WHERE e.producer_id = p.id AND e.status = 'publicado') AS events,
       EXISTS (SELECT 1 FROM producer_followers f WHERE f.producer_id = p.id AND f.user_id = $2) AS following
     FROM producers p
     WHERE p.status = 'aprovado' AND ${"slug" in key ? "p.slug" : "p.id"} = $1`,
    ["slug" in key ? key.slug : key.id, viewer?.id ?? null],
  );
  return row as ProducerProfile | undefined;
}

/** Seguir ou deixar de seguir. Quem segue é avisado por e-mail de cada evento novo. */
export async function toggleFollow(user: User, producerId: string): Promise<void> {
  const removed = await query(
    `DELETE FROM producer_followers WHERE producer_id = $1 AND user_id = $2 RETURNING user_id`,
    [producerId, user.id],
  );
  if (removed.length > 0) return;
  const added = await query(
    `INSERT INTO producer_followers (producer_id, user_id)
     SELECT id, $2 FROM producers WHERE id = $1 AND status = 'aprovado'
     ON CONFLICT DO NOTHING RETURNING user_id`,
    [producerId, user.id],
  );
  if (added.length === 0) throw new UserError("Produtor não encontrado.");
}

export async function updateProfile(user: User, form: FormData): Promise<void> {
  const producer = await getProducer(user);
  if (!producer) throw new UserError("Cadastro de produtor não encontrado.");
  const name = text(form, "name", 120);
  const instagram = text(form, "instagram", 80)
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
  if (name.length < 3) throw new UserError("Digite o nome da produtora.");
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) throw new UserError("Confira o @ do Instagram.");
  await query(`UPDATE producers SET name = $2, bio = $3, instagram = $4 WHERE id = $1`, [
    producer.id,
    name,
    text(form, "bio", 600),
    instagram,
  ]);
}

// ---- Line-up: uma atração por vez, com foto ----

const MAX_ARTISTS = 40;
const MAX_PHOTO_BYTES = 400 * 1024;

/** Confere pelo conteúdo, não pelo nome do arquivo, se é JPEG, PNG ou WebP. */
export function imageType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function addArtist(user: User, eventId: string, form: FormData): Promise<void> {
  await getOwnedEvent(user, eventId);
  const name = text(form, "name", 60).replace(/\s+/g, " ");
  if (!name) throw new UserError("Digite o nome da atração.");

  let photo: Buffer | null = null;
  let photoType: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES) throw new UserError("A foto ficou grande demais. Tente outra imagem.");
    photo = Buffer.from(await file.arrayBuffer());
    photoType = imageType(photo);
    if (!photoType) throw new UserError("Use uma foto em JPG, PNG ou WebP.");
  }

  const [{ n, next }] = await query<{ n: number; next: number }>(
    `SELECT count(*)::int AS n, coalesce(max(position), -1)::int + 1 AS next FROM lineup_artists WHERE event_id = $1`,
    [eventId],
  );
  if (n >= MAX_ARTISTS) throw new UserError(`O line-up aceita até ${MAX_ARTISTS} atrações.`);
  await query(
    `INSERT INTO lineup_artists (id, event_id, name, position, photo, photo_type) VALUES ($1, $2, $3, $4, $5, $6)`,
    [newId(), eventId, name, next, photo, photoType],
  );
}

export async function removeArtist(user: User, artistId: string): Promise<void> {
  const row = await queryOne(`SELECT event_id FROM lineup_artists WHERE id = $1`, [artistId]);
  if (!row) throw new UserError("Atração não encontrada.");
  await getOwnedEvent(user, row.event_id);
  await query(`DELETE FROM lineup_artists WHERE id = $1`, [artistId]);
}

/** Foto pública da atração. O endereço muda quando a atração é recadastrada, então pode ficar em cache. */
export async function getArtistPhoto(artistId: string): Promise<{ bytes: Uint8Array; type: string } | undefined> {
  const row = await queryOne(`SELECT photo, photo_type FROM lineup_artists WHERE id = $1 AND photo IS NOT NULL`, [artistId]);
  return row && { bytes: row.photo, type: row.photo_type };
}

// ---- Foto do evento ----

const MAX_BANNER_BYTES = 700 * 1024;

/** Troca a foto do evento; sem arquivo no formulário, remove. */
export async function setBanner(user: User, eventId: string, form: FormData): Promise<void> {
  await getOwnedEvent(user, eventId);
  const file = form.get("photo");
  let bytes: Buffer | null = null;
  let type: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BANNER_BYTES) throw new UserError("A foto ficou grande demais. Tente outra imagem.");
    bytes = Buffer.from(await file.arrayBuffer());
    type = imageType(bytes);
    if (!type) throw new UserError("Use uma foto em JPG, PNG ou WebP.");
  }
  await query(
    `UPDATE events SET banner = $2, banner_type = $3, banner_version = banner_version + 1 WHERE id = $1`,
    [eventId, bytes, type],
  );
}

export async function getEventBanner(eventId: string): Promise<{ bytes: Uint8Array; type: string } | undefined> {
  const row = await queryOne(`SELECT banner, banner_type FROM events WHERE id = $1 AND banner IS NOT NULL`, [eventId]);
  return row && { bytes: row.banner, type: row.banner_type };
}

// ---- Contrato do produtor ----

export const hasAcceptedContract = (producer: Producer) => producer.contractVersion === CONTRACT_VERSION;

/** Registra o aceite eletrônico da versão atual do contrato, com data e hora. */
export async function acceptContract(user: User, version: string): Promise<void> {
  const producer = await getProducer(user);
  if (!producer) throw new UserError("Cadastro de produtor não encontrado.");
  if (version !== CONTRACT_VERSION) throw new UserError("O contrato foi atualizado. Recarregue a página e leia a versão atual.");
  await query(`UPDATE producers SET contract_version = $2, contract_accepted_at = now() WHERE id = $1`, [
    producer.id,
    CONTRACT_VERSION,
  ]);
  await audit({ query }, user.id, "contrato_aceito", "produtor", producer.id, { versao: CONTRACT_VERSION });
}
