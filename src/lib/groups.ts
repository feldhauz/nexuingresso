import "server-only";
import { audit } from "./audit";
import type { User } from "./auth";
import { query, queryOne, type Row, transaction } from "./db";
import { UserError } from "./errors";

// Camarote (ou mesa): um ingresso que vale para várias pessoas. Quem compra dá nome ao
// camarote, cadastra os convidados e, com todos cadastrados, gera um QR Code para cada um.

export type Guest = { ticketId: string; name: string; status: string };

export type Group = {
  id: string;
  name: string;
  orderId: string;
  typeName: string;
  /** Os QR Codes já foram gerados; a partir daí os nomes não mudam. */
  generated: boolean;
  guests: Guest[];
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

const GROUP_SELECT = `
  SELECT g.id, g.name, g.order_id, tt.name AS type_name, e.slug, e.title, e.venue, e.city, e.starts_at,
    e.ends_at, e.time_zone, e.poster_bg, e.poster_fg,
    (SELECT coalesce(json_agg(json_build_object('ticketId', t.id, 'name', coalesce(t.holder_name, ''), 'status', t.status)
              ORDER BY t.created_at, t.id), '[]'::json)
       FROM tickets t WHERE t.group_id = g.id AND t.status <> 'cancelado') AS guests
  FROM ticket_groups g
  JOIN ticket_types tt ON tt.id = g.ticket_type_id
  JOIN events e ON e.id = g.event_id`;

function mapGroup(row: Row): Group {
  const guests = row.guests as Guest[];
  return {
    id: row.id,
    name: row.name,
    orderId: row.order_id,
    typeName: row.type_name,
    generated: guests.length > 0 && guests.every((guest) => guest.status !== "sem_nome"),
    guests,
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

/** Camarotes do usuário com pelo menos um ingresso ativo, os próximos primeiro. */
export async function listGroups(user: User): Promise<Group[]> {
  const rows = await query(`${GROUP_SELECT} WHERE g.owner_id = $1 ORDER BY (e.ends_at < now()), e.starts_at`, [user.id]);
  return rows.map(mapGroup).filter((group) => group.guests.length > 0);
}

export async function getGroup(user: User, groupId: string): Promise<Group | undefined> {
  const row = await queryOne(`${GROUP_SELECT} WHERE g.id = $1 AND g.owner_id = $2`, [groupId, user.id]);
  return row && mapGroup(row);
}

export async function renameGroup(user: User, groupId: string, rawName: string): Promise<void> {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length < 2) throw new UserError("Dê um nome ao camarote.");
  const renamed = await query(`UPDATE ticket_groups SET name = $3 WHERE id = $1 AND owner_id = $2 RETURNING id`, [
    groupId,
    user.id,
    name,
  ]);
  if (renamed.length === 0) throw new UserError("Camarote não encontrado.");
}

/**
 * Grava os nomes dos convidados. Com `generate`, exige todos preenchidos e libera os QR Codes:
 * os ingressos passam a valer na portaria e os nomes não mudam mais.
 */
export async function saveGuests(
  user: User,
  groupId: string,
  names: Map<string, string>,
  generate: boolean,
): Promise<void> {
  await transaction(async (tx) => {
    const [group] = await tx.query(`SELECT id FROM ticket_groups WHERE id = $1 AND owner_id = $2 FOR UPDATE`, [
      groupId,
      user.id,
    ]);
    if (!group) throw new UserError("Camarote não encontrado.");

    const tickets = await tx.query<{ id: string; holder_name: string | null }>(
      `SELECT id, holder_name FROM tickets WHERE group_id = $1 AND status = 'sem_nome' ORDER BY created_at, id FOR UPDATE`,
      [groupId],
    );
    if (tickets.length === 0) throw new UserError("Os QR Codes deste camarote já foram gerados.");

    for (const ticket of tickets) {
      if (!names.has(ticket.id)) continue;
      const name = names.get(ticket.id)!.trim().replace(/\s+/g, " ").slice(0, 80);
      ticket.holder_name = name || null;
      await tx.query(`UPDATE tickets SET holder_name = $2 WHERE id = $1`, [ticket.id, ticket.holder_name]);
    }
    if (!generate) return;

    const missing = tickets.filter((ticket) => !ticket.holder_name || ticket.holder_name.length < 3).length;
    if (missing > 0) {
      throw new UserError(
        missing === 1
          ? "Falta o nome completo de 1 convidado para gerar os QR Codes."
          : `Faltam os nomes completos de ${missing} convidados para gerar os QR Codes.`,
      );
    }
    await tx.query(`UPDATE tickets SET status = 'valido' WHERE group_id = $1 AND status = 'sem_nome'`, [groupId]);
    await audit(tx, user.id, "camarote_qr_gerados", "camarote", groupId, { convidados: tickets.length });
  });
}
