import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import type { Event } from "@/lib/events";
import { TICKET_STATUS } from "@/lib/labels";
import { getOwnedEvent, listParticipants } from "@/lib/producer";
import { maskCpf } from "@/lib/text";

export const metadata: Metadata = { title: "Participantes", robots: { index: false } };

type Props = PageProps<"/produtor/eventos/[id]/participantes">;

async function Participants({ params }: { params: Props["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/produtor/eventos/${id}/participantes`);
  let event: Event;
  try {
    event = await getOwnedEvent(user, id);
  } catch (error) {
    if (error instanceof UserError) notFound();
    throw error;
  }
  const people = await listParticipants(event.id);
  const inside = people.filter((p) => p.status === "usado").length;

  return (
    <>
      <Link href={`/produtor/eventos/${event.id}`} className="btn-link text-sm">
        {event.title}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="title">Participantes</h1>
          <p className="text-muted">
            {people.length} ingresso(s) · {inside} já entraram
          </p>
        </div>
        {/* Download de arquivo: link comum, sem navegação do app. */}
        <a href={`/produtor/eventos/${event.id}/participantes.csv`} className="btn-quiet" download>
          Baixar CSV
        </a>
      </div>

      {people.length === 0 ? (
        <p className="mt-8 text-ink-2">Nenhum ingresso vendido ainda.</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">CPF</th>
                <th className="px-4 py-3 font-medium">Ingresso</th>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-2">
              {people.map((person, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <span className="block font-medium text-ink">{person.name}</span>
                    {person.email}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{person.cpf ? maskCpf(person.cpf) : "—"}</td>
                  <td className="px-4 py-3">{person.typeName}</td>
                  <td className="px-4 py-3 font-mono">{person.orderId}</td>
                  <td className="px-4 py-3">{TICKET_STATUS[person.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ParticipantsPage({ params }: Props) {
  return (
    <section className="py-8">
      <Suspense fallback={<Loading />}>
        <Participants params={params} />
      </Suspense>
    </section>
  );
}
