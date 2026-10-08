import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requestRefundAction } from "@/actions/checkout";
import { cancelTransferAction, transferAction } from "@/actions/tickets";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { QrCode } from "@/components/QrCode";
import { requireUser } from "@/lib/auth";
import { MAX_TRANSFERS, TRANSFER_CLOSES_HOURS } from "@/lib/config";
import { getTicket } from "@/lib/tickets";
import { formatDate, formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Ingresso", robots: { index: false } };

async function TicketView({ params }: { params: PageProps<"/ingressos/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/ingressos/${id}`);
  const ticket = await getTicket(user, id);
  if (!ticket) notFound();

  const { event } = ticket;
  const now = new Date();
  const transferOpen =
    ticket.status === "valido" &&
    ticket.transferCount < MAX_TRANSFERS &&
    now.getTime() < event.startsAt.getTime() - TRANSFER_CLOSES_HOURS * 60 * 60 * 1000;

  return (
    <>
      <div className="card overflow-hidden">
        <div className="p-5" style={{ backgroundColor: event.poster.bg, color: event.poster.fg }}>
          <p className="text-sm font-medium first-letter:uppercase">{formatDate(event.startsAt, event.timeZone)}</p>
          <h1 className="font-display text-2xl leading-tight font-bold">{event.title}</h1>
          <p className="text-sm">
            {event.venue}, {event.city}
          </p>
        </div>
        {/* Picote: a linha tracejada e os dois recortes laterais. */}
        <div className="relative border-t-2 border-dashed border-line" aria-hidden="true">
          <span className="absolute -top-3 -left-3 size-6 rounded-full border border-line bg-bg" />
          <span className="absolute -top-3 -right-3 size-6 rounded-full border border-line bg-bg" />
        </div>
        <div className="p-5 text-center">
          {ticket.status === "valido" && (
            <>
              <QrCode value={ticket.code} className="mx-auto w-full max-w-64 rounded-xl" />
              <p className="mt-3 text-sm text-muted">Mostre este código na portaria, com documento com foto.</p>
              {/* Para a portaria digitar quando a câmera não consegue ler a tela. */}
              <p className="mt-1 font-mono text-xs break-all text-muted select-all">{ticket.code}</p>
            </>
          )}
          {ticket.status === "usado" && (
            <p className="py-8 font-display text-xl font-semibold text-ink">
              Ingresso usado
              {ticket.usedAt && (
                <span className="block text-sm font-normal text-muted">
                  Entrada em {formatDateTime(ticket.usedAt, event.timeZone)}
                </span>
              )}
            </p>
          )}
          {ticket.status === "em_transferencia" && (
            <p className="py-8 text-ink-2">
              <span className="block font-display text-xl font-semibold text-ink">Em transferência</span>
              Aguardando {ticket.pendingTo} aceitar. Enquanto isso, o QR Code não vale.
            </p>
          )}
          {ticket.status === "sem_nome" && (
            <p className="py-8 text-ink-2">
              <span className="block font-display text-xl font-semibold text-ink">Convidado sem nome</span>
              O QR Code aparece depois que o dono do camarote cadastra os convidados.
            </p>
          )}
          {ticket.status === "cancelado" && (
            <p className="py-8 font-display text-xl font-semibold text-ink">Ingresso cancelado</p>
          )}
          <p className="mt-2 font-semibold text-ink">{ticket.typeName}</p>
          <p className="text-sm text-muted">
            {ticket.holderName || user.name || user.email} · Pedido {ticket.orderId}
          </p>
          {ticket.group &&
            (ticket.group.mine ? (
              <Link href={`/camarotes/${ticket.group.id}`} className="btn-link text-sm">
                {ticket.group.name}
              </Link>
            ) : (
              <p className="text-sm text-ink-2">{ticket.group.name}</p>
            ))}
          {ticket.isHalf && (
            <p className="mt-2 text-sm text-ink-2">Meia-entrada: leve o comprovante do direito ao benefício.</p>
          )}
        </div>
      </div>

      {ticket.status === "em_transferencia" && (
        <ActionForm action={cancelTransferAction} className="mt-4">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <SubmitButton className="btn-quiet w-full">Cancelar transferência</SubmitButton>
        </ActionForm>
      )}

      {transferOpen && (
        <section className="mt-6">
          <h2 className="subtitle">Não vai mais? Transfira</h2>
          <p className="mt-1 text-sm text-ink-2">
            A pessoa recebe um e-mail e, ao aceitar, ganha um QR Code novo. O seu para de valer agora. É grátis,
            e o Colaja não intermedeia pagamento entre vocês: o que combinarem é por conta de vocês.
            {ticket.isHalf && " Quem recebe uma meia-entrada também precisa ter direito a ela."}
          </p>
          <ActionForm action={transferAction} className="mt-3">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label htmlFor="email" className="sr-only">
              E-mail de quem vai receber
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="email" name="email" type="email" required placeholder="E-mail de quem vai receber" className="field" />
              <SubmitButton confirm="Transferir este ingresso? O seu QR Code para de valer agora." className="btn shrink-0">
                Transferir
              </SubmitButton>
            </div>
          </ActionForm>
        </section>
      )}
      {ticket.status === "valido" && !transferOpen && (
        <p className="mt-4 text-sm text-muted">
          {ticket.transferCount >= MAX_TRANSFERS
            ? `Este ingresso já foi transferido ${MAX_TRANSFERS} vezes, que é o limite.`
            : `A transferência fecha ${TRANSFER_CLOSES_HOURS} horas antes do evento.`}
        </p>
      )}

      {ticket.isBuyer && ticket.status !== "usado" && ticket.status !== "cancelado" && (
        <details className="mt-8 border-t border-line pt-4">
          <summary className="btn-link cursor-pointer text-sm text-ink-2">Pedir reembolso</summary>
          {ticket.refundRequested ? (
            <p className="mt-2 text-sm text-ink-2">Seu pedido de reembolso está em análise. A resposta chega por e-mail.</p>
          ) : (
            <ActionForm action={requestRefundAction} className="mt-2">
              <input type="hidden" name="orderId" value={ticket.orderId} />
              <p className="text-sm text-ink-2">
                O reembolso vale para o pedido {ticket.orderId} inteiro e cancela todos os ingressos dele. Veja as
                regras na{" "}
                <Link href="/reembolso" className="underline">
                  política de reembolso
                </Link>
                .
              </p>
              <label htmlFor="reason" className="label mt-3">
                Motivo (opcional)
              </label>
              <textarea id="reason" name="reason" rows={2} maxLength={500} className="field h-auto py-3" />
              <SubmitButton className="btn-quiet mt-3">Enviar pedido de reembolso</SubmitButton>
            </ActionForm>
          )}
        </details>
      )}
    </>
  );
}

export default function TicketPage({ params }: PageProps<"/ingressos/[id]">) {
  return (
    <section className="mx-auto max-w-md py-6">
      <Link href="/ingressos" className="btn-link text-sm">
        Meus ingressos
      </Link>
      <Suspense fallback={<Loading className="mt-4" />}>
        <TicketView params={params} />
      </Suspense>
    </section>
  );
}
