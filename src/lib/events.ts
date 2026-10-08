import "server-only";
import { type Db, query, queryOne, type Row } from "./db";
import { activeLot, remaining } from "./lots";
import { normalize } from "./text";
import { utcToZonedInput } from "./time";

export type EventStatus = "rascunho" | "em_analise" | "publicado" | "recusado" | "cancelado";

export type Event = {
  id: string;
  producerId: string;
  producerName: string;
  producerSlug: string;
  slug: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  city: string;
  citySlug: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  minAge: number;
  poster: { bg: string; fg: string };
  /** Endereço da foto do evento, se o produtor enviou uma. */
  banner: string | null;
  status: EventStatus;
  absorbFee: boolean;
  maxPerCpf: number;
  /** Atrações, na ordem em que o produtor cadastrou. */
  lineup: Artist[];
  /** Estilos musicais, em minúsculas. */
  moods: string[];
};

export type Artist = { id: string; name: string; hasPhoto: boolean };

export type EventCard = Event & { fromCents: number | null };

/** Um tipo de ingresso com o lote que está à venda agora; lot nulo é esgotado. */
export type Offer = {
  typeId: string;
  name: string;
  detail: string;
  isHalf: boolean;
  /** Quantas pessoas entram com um ingresso deste tipo; mais de 1 é camarote ou mesa. */
  groupSize: number;
  lot: { id: string; name: string; priceCents: number; remaining: number } | null;
};

const EVENT_COLUMNS = `e.id, e.producer_id, e.slug, e.title, e.description, e.venue, e.address, e.city,
  e.city_slug, e.starts_at, e.ends_at, e.time_zone, e.min_age, e.poster_bg, e.poster_fg, e.status,
  e.absorb_fee, e.max_per_cpf, e.moods, (e.banner IS NOT NULL) AS has_banner, e.banner_version,
  p.name AS producer_name, p.slug AS producer_slug,
  (SELECT coalesce(json_agg(json_build_object('id', a.id, 'name', a.name, 'hasPhoto', a.photo IS NOT NULL)
            ORDER BY a.position, a.created_at), '[]'::json)
     FROM lineup_artists a WHERE a.event_id = e.id) AS artists`;
const EVENT_FROM = `events e JOIN producers p ON p.id = e.producer_id`;

export function mapEvent(row: Row): Event {
  return {
    id: row.id,
    producerId: row.producer_id,
    producerName: row.producer_name,
    producerSlug: row.producer_slug,
    slug: row.slug,
    title: row.title,
    description: row.description,
    venue: row.venue,
    address: row.address,
    city: row.city,
    citySlug: row.city_slug,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timeZone: row.time_zone,
    minAge: row.min_age,
    poster: { bg: row.poster_bg, fg: row.poster_fg },
    banner: row.has_banner ? `/banner/${row.id}/${row.banner_version}` : null,
    status: row.status,
    absorbFee: row.absorb_fee,
    maxPerCpf: row.max_per_cpf,
    lineup: row.artists,
    moods: splitList(row.moods, ","),
  };
}

function splitList(text: string, separator: string): string[] {
  return text
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

type Filter = { q?: string; citySlug?: string; date?: string; producerId?: string; excludeId?: string };

/** Eventos publicados e já encerrados de um produtor, do mais recente ao mais antigo. */
export async function listPastEvents(producerId: string): Promise<Event[]> {
  const rows = await query(
    `SELECT ${EVENT_COLUMNS} FROM ${EVENT_FROM}
     WHERE e.status = 'publicado' AND e.ends_at <= now() AND e.producer_id = $1
     ORDER BY e.starts_at DESC LIMIT 30`,
    [producerId],
  );
  return rows.map(mapEvent);
}

/** Eventos publicados que ainda não terminaram, do mais próximo ao mais distante. */
export async function listPublicEvents(filter: Filter = {}): Promise<EventCard[]> {
  const rows = await query(
    `SELECT ${EVENT_COLUMNS},
       (SELECT min(l.price_cents) FROM lots l JOIN ticket_types t ON t.id = l.ticket_type_id
         WHERE t.event_id = e.id AND l.sold < l.quantity AND (l.ends_at IS NULL OR l.ends_at > now())
       ) AS from_cents
     FROM ${EVENT_FROM}
     WHERE e.status = 'publicado' AND e.ends_at > now()
       AND ($1::text IS NULL OR e.city_slug = $1)
       AND ($2::text IS NULL OR e.producer_id = $2)
       AND ($3::text IS NULL OR e.id <> $3)
     ORDER BY e.starts_at`,
    [filter.citySlug ?? null, filter.producerId ?? null, filter.excludeId ?? null],
  );
  const q = normalize(filter.q?.trim() ?? "");
  return rows
    .map((row) => ({ ...mapEvent(row), fromCents: row.from_cents as number | null }))
    .filter((e) => !q || normalize(`${e.title} ${e.city} ${e.venue} ${e.producerName} ${e.lineup.map((artist) => artist.name).join(" ")}`).includes(q))
    .filter((e) => !filter.date || utcToZonedInput(e.startsAt, e.timeZone).startsWith(filter.date));
}

export async function listCities(): Promise<{ city: string; citySlug: string }[]> {
  const rows = await query(
    `SELECT DISTINCT city, city_slug FROM events WHERE status = 'publicado' AND ends_at > now() ORDER BY city`,
  );
  return rows.map((row) => ({ city: row.city, citySlug: row.city_slug }));
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
  const row = await queryOne(`SELECT ${EVENT_COLUMNS} FROM ${EVENT_FROM} WHERE e.slug = $1`, [slug]);
  return row && mapEvent(row);
}

/** Evento que já usou este final de link e depois trocou: devolve o endereço atual. */
export async function findMovedSlug(oldSlug: string): Promise<string | undefined> {
  const row = await queryOne<{ slug: string }>(
    `SELECT e.slug FROM slug_redirects r JOIN events e ON e.id = r.event_id WHERE r.slug = $1`,
    [oldSlug],
  );
  return row?.slug;
}

export async function getEventById(id: string, db: Db = { query }): Promise<Event | undefined> {
  const [row] = await db.query(`SELECT ${EVENT_COLUMNS} FROM ${EVENT_FROM} WHERE e.id = $1`, [id]);
  return row && mapEvent(row);
}

export type LotRow = {
  id: string;
  typeId: string;
  name: string;
  priceCents: number;
  quantity: number;
  sold: number;
  endsAt: Date | null;
  position: number;
};

export type TicketTypeRow = {
  id: string;
  name: string;
  detail: string;
  isHalf: boolean;
  groupSize: number;
  lots: LotRow[];
};

/** Tipos de ingresso do evento com todos os lotes. `lock` trava os lotes até o fim da transação. */
export async function getTicketTypes(eventId: string, db: Db = { query }, lock = false): Promise<TicketTypeRow[]> {
  const types = await db.query(`SELECT * FROM ticket_types WHERE event_id = $1 ORDER BY position, name`, [eventId]);
  const lots = await db.query(
    `SELECT l.* FROM lots l JOIN ticket_types t ON t.id = l.ticket_type_id
     WHERE t.event_id = $1 ORDER BY l.position ${lock ? "FOR UPDATE OF l" : ""}`,
    [eventId],
  );
  return types.map((type) => ({
    id: type.id,
    name: type.name,
    detail: type.detail,
    isHalf: type.is_half,
    groupSize: type.group_size,
    lots: lots
      .filter((lot) => lot.ticket_type_id === type.id)
      .map((lot) => ({
        id: lot.id,
        typeId: type.id,
        name: lot.name,
        priceCents: lot.price_cents,
        quantity: lot.quantity,
        sold: lot.sold,
        endsAt: lot.ends_at,
        position: lot.position,
      })),
  }));
}

export function toOffers(types: TicketTypeRow[], now: Date): Offer[] {
  return types.map((type) => {
    const lot = activeLot(type.lots, now);
    return {
      typeId: type.id,
      name: type.name,
      detail: type.detail,
      isHalf: type.isHalf,
      groupSize: type.groupSize,
      lot: lot ? { id: lot.id, name: lot.name, priceCents: lot.priceCents, remaining: remaining(lot) } : null,
    };
  });
}
