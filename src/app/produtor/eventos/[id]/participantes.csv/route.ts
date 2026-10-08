import { getUser } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { TICKET_STATUS } from "@/lib/labels";
import { getOwnedEvent, listParticipants } from "@/lib/producer";
import { maskCpf } from "@/lib/text";
import { formatDateTime } from "@/lib/time";

// Células que começam com =, +, - ou @ viram fórmula no Excel; o apóstrofo neutraliza.
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_request: Request, { params }: RouteContext<"/produtor/eventos/[id]/participantes.csv">) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return new Response("Entre para baixar a lista.", { status: 401 });

  try {
    const event = await getOwnedEvent(user, id);
    const people = await listParticipants(event.id);
    const rows = [
      ["Nome", "E-mail", "CPF", "Ingresso", "Pedido", "Situação", "Entrada"],
      ...people.map((p) => [
        p.name,
        p.email,
        p.cpf ? maskCpf(p.cpf) : "",
        p.typeName,
        p.orderId,
        TICKET_STATUS[p.status],
        p.usedAt ? formatDateTime(p.usedAt, event.timeZone) : "",
      ]),
    ];
    // BOM e ponto e vírgula: é como o Excel em português abre CSV com acento sem ajuste.
    const csv = "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="participantes-${event.slug}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof UserError) return new Response("Evento não encontrado.", { status: 404 });
    throw error;
  }
}
