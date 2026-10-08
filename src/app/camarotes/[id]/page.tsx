import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { renameGroupAction, saveGuestsAction } from "@/actions/groups";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Icon } from "@/components/Icon";
import { Loading } from "@/components/Loading";
import { requireUser } from "@/lib/auth";
import { getGroup } from "@/lib/groups";
import { TICKET_STATUS } from "@/lib/labels";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Camarote", robots: { index: false } };

async function GroupView({ params }: { params: PageProps<"/camarotes/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/camarotes/${id}`);
  const group = await getGroup(user, id);
  if (!group) notFound();

  const { event, guests } = group;
  const named = guests.filter((guest) => guest.name.trim().length >= 3).length;

  return (
    <>
      <div className="card overflow-hidden">
        <div className="p-5" style={{ backgroundColor: event.poster.bg, color: event.poster.fg }}>
          <p className="text-sm font-medium first-letter:uppercase">{formatDate(event.startsAt, event.timeZone)}</p>
          <h1 className="font-display text-2xl leading-tight font-bold">{group.name}</h1>
          <p className="text-sm">
            {event.title} · {event.venue}, {event.city}
          </p>
        </div>
        <ActionForm action={renameGroupAction} className="p-4">
          <input type="hidden" name="groupId" value={group.id} />
          <label htmlFor="group-name" className="label">
            Nome do camarote
          </label>
          <div className="flex gap-2">
            <input id="group-name" name="name" defaultValue={group.name} required maxLength={60} className="field" />
            <SubmitButton className="btn-quiet shrink-0">Salvar</SubmitButton>
          </div>
        </ActionForm>
      </div>

      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="subtitle">Convidados</h2>
          <p className="text-sm text-muted tabular-nums">
            {group.generated ? `${guests.length} pessoas` : `${named} de ${guests.length} cadastrados`}
          </p>
        </div>

        {group.generated ? (
          <>
            <p className="mt-1 text-sm text-ink-2">
              Cada convidado tem o próprio QR Code. Abra para mostrar na portaria ou transfira para o e-mail da
              pessoa.
            </p>
            <ul className="card mt-3 divide-y divide-line">
              {guests.map((guest) => (
                <li key={guest.ticketId}>
                  <Link
                    href={`/ingressos/${guest.ticketId}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-surface-2"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
                      <Icon name="qr" className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{guest.name}</span>
                      <span className="block text-sm text-muted">
                        {guest.status === "valido" ? "Ver QR Code" : TICKET_STATUS[guest.status]}
                      </span>
                    </span>
                    <Icon name="arrow" className="size-5 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ActionForm action={saveGuestsAction} className="mt-1">
            <input type="hidden" name="groupId" value={group.id} />
            <p className="text-sm text-ink-2">
              Cadastre o nome completo de quem vai entrar, como está no documento. Com todos cadastrados, você
              gera um QR Code para cada pessoa.
            </p>
            <ol className="mt-3 space-y-2">
              {guests.map((guest, index) => (
                <li key={guest.ticketId} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center font-display font-semibold text-muted tabular-nums">
                    {index + 1}
                  </span>
                  <label htmlFor={`g_${guest.ticketId}`} className="sr-only">
                    Nome do convidado {index + 1}
                  </label>
                  <input
                    id={`g_${guest.ticketId}`}
                    name={`g_${guest.ticketId}`}
                    defaultValue={guest.name || (index === 0 ? user.name : "")}
                    maxLength={80}
                    autoComplete="off"
                    placeholder={`Convidado ${index + 1}`}
                    className="field"
                  />
                </li>
              ))}
            </ol>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <SubmitButton name="intent" value="save" className="btn-quiet">
                Salvar nomes
              </SubmitButton>
              <SubmitButton
                name="intent"
                value="generate"
                confirm="Gerar os QR Codes? Depois disso os nomes não podem mais ser alterados."
              >
                Gerar QR Codes
              </SubmitButton>
            </div>
            <p className="mt-2 text-sm text-muted">Você pode salvar aos poucos e voltar depois.</p>
          </ActionForm>
        )}
      </section>
      <p className="mt-6 text-sm text-muted">
        {group.typeName} · Pedido {group.orderId}
      </p>
    </>
  );
}

export default function GroupPage({ params }: PageProps<"/camarotes/[id]">) {
  return (
    <section className="mx-auto max-w-md py-6">
      <Link href="/ingressos" className="btn-link text-sm">
        Meus ingressos
      </Link>
      <Suspense fallback={<Loading />}>
        <GroupView params={params} />
      </Suspense>
    </section>
  );
}
