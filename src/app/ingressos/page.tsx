import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listGroups } from "@/lib/groups";
import { listTickets, type Ticket } from "@/lib/tickets";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Meus ingressos", robots: { index: false } };

const STATUS: Record<Ticket["status"], string> = {
  valido: "",
  usado: "Usado",
  em_transferencia: "Em transferência",
  cancelado: "Cancelado",
  sem_nome: "Sem nome",
};

async function Tickets() {
  const user = await requireUser("/ingressos");
  const [tickets, groups] = await Promise.all([listTickets(user), listGroups(user)]);
  const now = new Date();

  if (tickets.length === 0 && groups.length === 0) {
    return (
      <>
        <p className="mt-3 max-w-prose text-ink-2">
          Os ingressos que você comprar ou receber por transferência aparecem aqui, cada um com o seu QR Code.
        </p>
        <Link href="/" className="btn mt-6">
          Ver eventos
        </Link>
      </>
    );
  }

  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {groups.map((group) => {
        const named = group.guests.filter((guest) => guest.name.trim().length >= 3).length;
        return (
          <li key={group.id}>
            <Link
              href={`/camarotes/${group.id}`}
              className={`card flex items-stretch overflow-hidden transition-colors hover:bg-surface-2 ${group.event.endsAt < now ? "opacity-60" : ""}`}
            >
              <span className="w-3 shrink-0" style={{ backgroundColor: group.event.poster.bg }} aria-hidden="true" />
              <span className="min-w-0 flex-1 p-4">
                <span className="block text-sm font-medium text-brand-text first-letter:uppercase">
                  {formatDate(group.event.startsAt, group.event.timeZone)}
                </span>
                <span className="block font-display text-lg font-semibold text-ink">{group.name}</span>
                <span className="block text-sm text-muted">
                  {group.event.title} · {group.guests.length} pessoas
                </span>
                <span className={`mt-1 block text-sm font-medium ${group.generated ? "text-ink-2" : "text-brand-text"}`}>
                  {group.generated
                    ? "QR Codes gerados"
                    : `Cadastre os convidados (${named} de ${group.guests.length})`}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
      {tickets.map((ticket) => {
        const past = ticket.event.endsAt < now;
        return (
          <li key={ticket.id}>
            <Link
              href={`/ingressos/${ticket.id}`}
              className={`card flex items-stretch overflow-hidden transition-colors hover:bg-surface-2 ${past ? "opacity-60" : ""}`}
            >
              <span className="w-3 shrink-0" style={{ backgroundColor: ticket.event.poster.bg }} aria-hidden="true" />
              <span className="min-w-0 flex-1 p-4">
                <span className="block text-sm font-medium text-brand-text first-letter:uppercase">
                  {formatDate(ticket.event.startsAt, ticket.event.timeZone)}
                </span>
                <span className="block font-display text-lg font-semibold text-ink">{ticket.event.title}</span>
                <span className="block text-sm text-muted">
                  {ticket.typeName} · {ticket.event.venue}
                </span>
                {(STATUS[ticket.status] || past) && (
                  <span className="mt-1 block text-sm font-medium text-ink-2">
                    {STATUS[ticket.status] || "Evento encerrado"}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function TicketsPage() {
  return (
    <section className="py-8">
      <h1 className="title">Meus ingressos</h1>
      <Suspense fallback={<Loading className="mt-6" />}>
        <Tickets />
      </Suspense>
    </section>
  );
}
