import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DEMO } from "./config";
import type { Db } from "./db";
import { newId } from "./ids";
import { MIGRATE_LINEUP } from "./schema";
import { slugify } from "./text";

// Eventos de exemplo do modo de demonstração. Só entram em banco vazio.

const DAY = 24 * 60 * 60 * 1000;

type Lot = [name: string, priceCents: number, quantity: number];
type Ticket = { name: string; detail?: string; isHalf?: boolean; groupSize?: number; lots: Lot[] };

const EVENTS: {
  title: string;
  inDays: number;
  hour: number;
  hours: number;
  venue: string;
  address: string;
  city: string;
  minAge: number;
  description: string;
  poster: [string, string];
  coupon?: [string, number];
  lineup?: string[];
  moods?: string[];
  tickets: Ticket[];
}[] = [
  {
    title: "Baile da República",
    inDays: 38,
    hour: 22,
    hours: 7,
    venue: "Galpão 12",
    address: "Rua das Palmeiras, 120",
    city: "Florianópolis",
    minAge: 18,
    description: "Festa universitária com três pistas. Abertura dos portões às 22h, entrada até 1h.",
    poster: ["#ff5a36", "#1a0f0a"],
    coupon: ["CALOURO", 10],
    lineup: ["DJ Marola", "Coletivo Vinil 48", "MC Tainha"],
    moods: ["funk", "house"],
    tickets: [
      { name: "Pista", lots: [["1º lote", 4000, 3], ["2º lote", 5000, 200]] },
      { name: "Pista meia-entrada", detail: "Com comprovante na portaria", isHalf: true, lots: [["1º lote", 2000, 80]] },
      { name: "Open bar", lots: [["1º lote", 9000, 60]] },
      { name: "Camarote", detail: "Mesa reservada e entrada sem fila", groupSize: 8, lots: [["Lote único", 96000, 6]] },
    ],
  },
  {
    title: "Samba de Domingo",
    inDays: 46,
    hour: 16,
    hours: 6,
    venue: "Quintal da Vila",
    address: "Travessa do Samba, 8",
    city: "Florianópolis",
    minAge: 16,
    description: "Roda de samba ao ar livre, com feijoada até as 18h.",
    poster: ["#0f7a5c", "#f4f1e4"],
    lineup: ["Roda do Quintal", "Dona Lia e convidados"],
    moods: ["samba", "pagode"],
    tickets: [
      { name: "Entrada", lots: [["Lote único", 3000, 150]] },
      { name: "Mesa", detail: "Inclui as quatro entradas", groupSize: 4, lots: [["Lote único", 16000, 12]] },
    ],
  },
  {
    title: "Noite de Talentos",
    inDays: 59,
    hour: 19,
    hours: 3,
    venue: "Teatro do Centro",
    address: "Praça da Matriz, 1",
    city: "Joinville",
    minAge: 0,
    description: "Mostra de música e teatro dos alunos. Entrada gratuita com retirada de ingresso.",
    poster: ["#1b1b3a", "#ffd21f"],
    tickets: [{ name: "Entrada gratuita", lots: [["Lote único", 0, 300]] }],
  },
  {
    title: "Festival Praia Norte",
    inDays: 73,
    hour: 15,
    hours: 12,
    venue: "Arena Praia Norte",
    address: "Avenida Atlântica, 4000",
    city: "Balneário Camboriú",
    minAge: 18,
    description: "Doze horas de música em dois palcos, à beira-mar.",
    poster: ["#f2c8e0", "#3a0f2c"],
    lineup: ["Banda Maré Alta", "DJ Marola", "Trio Litoral", "Selecta Norte"],
    moods: ["eletrônica", "pop"],
    tickets: [
      { name: "Pista", lots: [["2º lote", 12000, 500]] },
      { name: "Frontstage", lots: [["1º lote", 22000, 120]] },
    ],
  },
];

export async function seed(db: Db): Promise<void> {
  if (DEMO) await seedEvents(db);
  for (const statement of MIGRATE_LINEUP) await db.query(statement);
  if (DEMO) await demoPhotos(db);
  if (DEMO) await demoGroups(db);
}

/** Banco de demonstração criado antes de existir camarote: completa os exemplos uma vez. */
async function demoGroups(db: Db): Promise<void> {
  const [event] = await db.query(
    `SELECT e.id FROM events e JOIN producers p ON p.id = e.producer_id JOIN users u ON u.id = p.user_id
     WHERE u.email = $1 AND e.slug = 'baile-da-republica-florianopolis'
       AND NOT EXISTS (SELECT 1 FROM ticket_types t JOIN events x ON x.id = t.event_id
                       WHERE x.producer_id = p.id AND t.group_size > 1)`,
    ["produtor@exemplo.com"],
  );
  if (!event) return;
  await db.query(
    `UPDATE ticket_types SET name = 'Mesa', group_size = 4 WHERE name = 'Mesa para 4'
       AND event_id IN (SELECT id FROM events WHERE producer_id = (SELECT producer_id FROM events WHERE id = $1))
       AND NOT EXISTS (SELECT 1 FROM order_items i WHERE i.ticket_type_id = ticket_types.id)`,
    [event.id],
  );
  const typeId = newId();
  await db.query(
    `INSERT INTO ticket_types (id, event_id, name, detail, position, group_size) VALUES ($1, $2, 'Camarote', $3, 9, 8)`,
    [typeId, event.id, "Mesa reservada e entrada sem fila"],
  );
  await db.query(
    `INSERT INTO lots (id, ticket_type_id, name, price_cents, quantity) VALUES ($1, $2, 'Lote único', 96000, 6)`,
    [newId(), typeId],
  );
}

const DEMO_PHOTOS = 6;

/** Fotos ilustrativas (geradas, não são pessoas reais) para as atrações dos eventos de exemplo. */
async function demoPhotos(db: Db): Promise<void> {
  const artists = await db.query<{ id: string; name: string }>(
    `SELECT a.id, a.name FROM lineup_artists a
     JOIN events e ON e.id = a.event_id JOIN producers p ON p.id = e.producer_id JOIN users u ON u.id = p.user_id
     WHERE u.email = $1 AND a.photo IS NULL`,
    ["produtor@exemplo.com"],
  );
  for (const artist of artists) {
    // O mesmo nome recebe sempre a mesma foto.
    const index = [...artist.name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % DEMO_PHOTOS;
    const photo = await readFile(join(process.cwd(), "src", "lib", "seed-photos", `${index + 1}.jpg`)).catch(() => null);
    if (!photo) return;
    await db.query(`UPDATE lineup_artists SET photo = $2, photo_type = 'image/jpeg' WHERE id = $1`, [artist.id, photo]);
  }
}

async function seedEvents(db: Db): Promise<void> {
  const [{ n }] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM events`);
  if (n > 0) return backfill(db);

  const userId = newId();
  const producerId = newId();
  await db.query(`INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`, [
    userId,
    "produtor@exemplo.com",
    "Produtora Exemplo",
  ]);
  const [user] = await db.query(`SELECT id FROM users WHERE email = $1`, ["produtor@exemplo.com"]);
  await db.query(
    `INSERT INTO producers (id, user_id, slug, name, bio, document, phone, status)
     VALUES ($1, $2, 'produtora-exemplo', $3, $4, $5, $6, 'aprovado')`,
    [
      producerId,
      user.id,
      "Produtora Exemplo",
      "Produtora fictícia que organiza os eventos de exemplo do modo de demonstração.",
      "00000000000",
      "48900000000",
    ],
  );

  const today = new Date();
  for (const e of EVENTS) {
    // Horário de Brasília (UTC−3).
    const startsAt = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + e.inDays, e.hour + 3),
    );
    const eventId = newId();
    await db.query(
      `INSERT INTO events (id, producer_id, slug, title, description, venue, address, city, city_slug,
         starts_at, ends_at, min_age, poster_bg, poster_fg, lineup, moods, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'publicado')`,
      [eventId, producerId, slugify(`${e.title} ${e.city}`), e.title, e.description, e.venue, e.address, e.city,
        slugify(e.city), startsAt, new Date(startsAt.getTime() + e.hours * (DAY / 24)), e.minAge, e.poster[0], e.poster[1],
        (e.lineup ?? []).join("\n"), (e.moods ?? []).join(",")],
    );
    if (e.coupon) {
      await db.query(`INSERT INTO coupons (id, event_id, code, percent_off) VALUES ($1, $2, $3, $4)`, [
        newId(),
        eventId,
        ...e.coupon,
      ]);
    }
    for (const [position, ticket] of e.tickets.entries()) {
      const typeId = newId();
      await db.query(
        `INSERT INTO ticket_types (id, event_id, name, detail, is_half, position, group_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [typeId, eventId, ticket.name, ticket.detail ?? "", ticket.isHalf ?? false, position, ticket.groupSize ?? 1],
      );
      for (const [lotPosition, [name, price, quantity]] of ticket.lots.entries()) {
        await db.query(
          `INSERT INTO lots (id, ticket_type_id, name, price_cents, quantity, position) VALUES ($1, $2, $3, $4, $5, $6)`,
          [newId(), typeId, name, price, quantity, lotPosition],
        );
      }
    }
  }
}

/** Banco de demonstração criado antes de existir line-up e perfil: completa os exemplos. */
async function backfill(db: Db): Promise<void> {
  const [demo] = await db.query(
    `SELECT p.id FROM producers p JOIN users u ON u.id = p.user_id WHERE u.email = $1 AND p.bio = ''`,
    ["produtor@exemplo.com"],
  );
  if (!demo) return;
  await db.query(`UPDATE producers SET slug = 'produtora-exemplo', bio = $2 WHERE id = $1`, [
    demo.id,
    "Produtora fictícia que organiza os eventos de exemplo do modo de demonstração.",
  ]);
  for (const e of EVENTS) {
    await db.query(
      `UPDATE events SET lineup = $3, moods = $4 WHERE producer_id = $1 AND slug = $2 AND lineup = '' AND moods = ''`,
      [demo.id, slugify(`${e.title} ${e.city}`), (e.lineup ?? []).join("\n"), (e.moods ?? []).join(",")],
    );
  }
}
