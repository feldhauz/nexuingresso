import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { courtesyAction, payoutPaidAction, refundAction, reviewEventAction, reviewKycAction } from "@/actions/admin";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { Loading } from "@/components/Loading";
import { findCourtesyEvent, getOverview, listPendingEvents, listRecentOrders, listSalesByEvent } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/fees";
import { KYC_DOCS, listKycQueue } from "@/lib/kyc";
import { METHOD, ORDER_STATUS } from "@/lib/labels";
import { listPayoutRequests } from "@/lib/sales";
import { formatDate, formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Colaja", robots: { index: false, follow: false } };

const REFUND_CONFIRM = "Estornar este pedido? O valor volta ao comprador e os ingressos são cancelados.";

function Number({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="card p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-2xl font-bold text-ink tabular-nums">{value}</dd>
      {detail && <dd className="text-sm text-ink-2 tabular-nums">{detail}</dd>}
    </div>
  );
}

async function Panel({ searchParams }: { searchParams: PageProps<"/feldhauspanel">["searchParams"] }) {
  await requireAdmin();
  const link = (await searchParams).evento;
  const [overview, kyc, events, sales, orders, payouts, courtesy] = await Promise.all([
    getOverview(),
    listKycQueue(),
    listPendingEvents(),
    listSalesByEvent(),
    listRecentOrders(),
    listPayoutRequests(),
    typeof link === "string" && link.trim() ? findCourtesyEvent(link) : null,
  ]);

  return (
    <>
      <h1 className="title">Painel</h1>
      <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Number label="Vendas" value={formatMoney(overview.total)} detail={`${formatMoney(overview.total30)} em 30 dias`} />
        <Number label="Lucro (taxas)" value={formatMoney(overview.fee)} detail={`${formatMoney(overview.fee30)} em 30 dias`} />
        <Number label="Pedidos pagos" value={String(overview.orders)} detail={`${overview.orders30} em 30 dias`} />
        <Number label="Pessoas com conta" value={String(overview.users)} detail={`${overview.usersWeek} novas na semana`} />
        <Number label="Entraram em 30 dias" value={String(overview.activeMonth)} />
        <Number label="Produtores" value={String(overview.producers)} detail={`${overview.producersVerified} verificados`} />
        <Number label="Eventos no ar" value={String(overview.eventsLive)} />
        <Number label="Aguardando você" value={String(kyc.length + events.length + payouts.length)} />
      </dl>

      <section className="mt-10">
        <h2 className="subtitle">Verificações de produtor</h2>
        {kyc.length === 0 ? (
          <p className="mt-2 text-muted">Nenhuma verificação pendente.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {kyc.map((request) => (
              <li key={request.id} className="card p-4">
                <p className="font-semibold text-ink">{request.name}</p>
                <p className="text-sm text-ink-2">
                  {request.document.length === 14 ? "CNPJ" : "CPF"} {request.document} · nascimento{" "}
                  {request.birth_date ?? "não informado"} · {request.email} · telefone {request.phone}
                </p>
                {request.cnpj_info && <p className="text-sm text-ink-2">{request.cnpj_info}</p>}
                <p className="text-sm text-ink-2">Contrato do produtor: {request.contract ?? "não aceito"}</p>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {request.docs.map((doc) => (
                    <li key={doc.id}>
                      {/* Abre em outra aba no tamanho original, para conferir os dados. */}
                      <a href={`/feldhauspanel/doc/${doc.id}`} target="_blank" rel="noopener" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/feldhauspanel/doc/${doc.id}`}
                          alt={KYC_DOCS[doc.kind]?.label ?? doc.kind}
                          className="aspect-[4/3] w-full rounded-xl border border-line object-cover"
                        />
                        <span className="mt-1 block text-xs text-ink-2">{KYC_DOCS[doc.kind]?.label ?? doc.kind}</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <ActionForm action={reviewKycAction} className="mt-3">
                  <input type="hidden" name="producerId" value={request.id} />
                  <label htmlFor={`note-${request.id}`} className="label">
                    Motivo, se for recusar (o produtor recebe por e-mail)
                  </label>
                  <input id={`note-${request.id}`} name="note" maxLength={300} className="field" />
                  <div className="mt-3 flex gap-2">
                    <SubmitButton name="decision" value="approve" className="btn h-11 px-4 text-sm">
                      Aprovar
                    </SubmitButton>
                    <SubmitButton name="decision" value="reject" className="btn-quiet h-11 px-4 text-sm">
                      Recusar
                    </SubmitButton>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="subtitle">Saques pedidos</h2>
        {payouts.length === 0 ? (
          <p className="mt-2 text-muted">Nenhum saque pendente.</p>
        ) : (
          <ul className="card mt-3 divide-y divide-line">
            {payouts.map((payout) => (
              <li key={payout.id} className="p-4">
                <ActionForm action={payoutPaidAction} className="flex flex-wrap items-center justify-between gap-3">
                  <input type="hidden" name="payoutId" value={payout.id} />
                  <p className="text-sm text-ink-2">
                    <span className="block text-base font-semibold text-ink tabular-nums">
                      {formatMoney(payout.amount_cents)} · {payout.producer}
                    </span>
                    Chave Pix: <span className="font-mono select-all">{payout.pix_key}</span>
                    <span className="block">
                      Documento {payout.document} · {payout.email} · pedido em {formatDateTime(payout.created_at)}
                    </span>
                  </p>
                  <SubmitButton
                    confirm="Marcar como pago? Faça o Pix antes: isto só registra que o valor foi enviado."
                    className="btn h-11 px-4 text-sm"
                  >
                    Marcar como pago
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="subtitle">Eventos aguardando publicação</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-muted">Nenhum evento em análise.</p>
        ) : (
          <ul className="card mt-3 divide-y divide-line">
            {events.map((event) => (
              <li key={event.id} className="p-4">
                <ActionForm action={reviewEventAction} className="flex flex-wrap items-center justify-between gap-3">
                  <input type="hidden" name="eventId" value={event.id} />
                  <p className="text-sm text-ink-2">
                    <Link href={`/e/${event.slug}`} className="block text-base font-semibold text-ink underline">
                      {event.title}
                    </Link>
                    {formatDate(event.starts_at, event.time_zone)} · {event.city} · {event.producer}
                  </p>
                  <div className="flex gap-2">
                    <SubmitButton name="decision" value="approve" className="btn h-11 px-4 text-sm">
                      Publicar
                    </SubmitButton>
                    <SubmitButton name="decision" value="reject" className="btn-quiet h-11 px-4 text-sm">
                      Devolver
                    </SubmitButton>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="subtitle">Vendas por evento</h2>
        {sales.length === 0 ? (
          <p className="mt-2 text-muted">Nenhuma venda ainda.</p>
        ) : (
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 text-right font-medium">Pedidos</th>
                  <th className="px-4 py-3 text-right font-medium">Vendas</th>
                  <th className="px-4 py-3 text-right font-medium">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink-2 tabular-nums">
                {sales.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-ink">{row.title}</span>
                      {row.producer}
                    </td>
                    <td className="px-4 py-3 text-right">{row.orders}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(row.total)}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink">{formatMoney(row.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 max-w-xl">
        <h2 className="subtitle">Gerar ingressos de cortesia</h2>
        <p className="mt-1 text-sm text-ink-2">
          Cole o link do evento. Os ingressos saem sem cobrança, vão para o e-mail informado e não mexem no
          estoque do lote.
        </p>
        <form action="/feldhauspanel" className="mt-3 flex gap-2">
          <label htmlFor="evento" className="sr-only">
            Link do evento
          </label>
          <input
            id="evento"
            name="evento"
            required
            defaultValue={typeof link === "string" ? link : ""}
            placeholder="colajaingressos.com.br/e/nome-do-evento"
            className="field"
          />
          <button type="submit" className="btn-quiet shrink-0">
            Buscar
          </button>
        </form>
        {typeof link === "string" && link.trim() && !courtesy && (
          <p role="alert" className="mt-2 text-sm font-medium text-bad">
            Nenhum evento com ingressos cadastrados neste link.
          </p>
        )}
        {courtesy && (
          <ActionForm action={courtesyAction} resetOnOk className="card mt-3 grid gap-3 p-4">
            <input type="hidden" name="eventId" value={courtesy.event.id} />
            <p className="font-semibold text-ink">
              {courtesy.event.title}
              <span className="block text-sm font-normal text-muted first-letter:uppercase">
                {formatDate(courtesy.event.startsAt, courtesy.event.timeZone)} · {courtesy.event.city}
              </span>
            </p>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <div>
                <label htmlFor="c-type" className="label">
                  Tipo de ingresso
                </label>
                <select id="c-type" name="typeId" className="field">
                  {courtesy.types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                      {type.groupSize > 1 ? ` (${type.groupSize} pessoas)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="c-qty" className="label">
                  Quantidade
                </label>
                <input id="c-qty" name="quantity" type="number" min={1} max={50} defaultValue={1} required className="field" />
              </div>
            </div>
            <div>
              <label htmlFor="c-email" className="label">
                E-mail de quem recebe
              </label>
              <input id="c-email" name="email" type="email" required className="field" />
            </div>
            <div>
              <label htmlFor="c-name" className="label">
                Nome (opcional)
              </label>
              <input id="c-name" name="name" maxLength={120} className="field" />
            </div>
            <SubmitButton>Gerar ingressos</SubmitButton>
          </ActionForm>
        )}
      </section>

      <section className="mt-10">
        <h2 className="subtitle">Pedidos recentes</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-muted">Nenhum pedido ainda.</p>
        ) : (
          <ul className="card mt-3 divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-2">
                    <span className="block text-base font-semibold text-ink">
                      <span className="font-mono">{order.id}</span> · {formatMoney(order.total_cents)}
                    </span>
                    {order.title} · {order.email}
                    <span className="block">
                      {ORDER_STATUS[order.status]}
                      {order.method && ` · ${METHOD[order.method]}`} · lucro {formatMoney(order.fee_cents)} ·{" "}
                      {formatDateTime(order.created_at)}
                    </span>
                  </p>
                  {order.status === "pago" && (
                    <ActionForm action={refundAction} className="flex gap-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton name="decision" value="approve" confirm={REFUND_CONFIRM} className="btn-quiet h-11 px-4 text-sm">
                        {order.method === "cortesia" ? "Cancelar" : "Estornar"}
                      </SubmitButton>
                      {order.refund_reason !== null && (
                        <SubmitButton name="decision" value="reject" className="btn-quiet h-11 px-4 text-sm">
                          Negar reembolso
                        </SubmitButton>
                      )}
                    </ActionForm>
                  )}
                </div>
                {order.refund_reason !== null && order.status === "pago" && (
                  <p className="mt-2 rounded-xl bg-brand-soft p-3 text-sm text-ink-2">
                    Reembolso pedido pelo comprador{order.refund_reason ? `: “${order.refund_reason}”` : "."}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function PanelPage({ searchParams }: PageProps<"/feldhauspanel">) {
  return (
    <section className="py-8">
      {/* Nada do painel vai no HTML inicial: quem não é admin só vê "página não encontrada". */}
      <Suspense fallback={<Loading />}>
        <Panel searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
