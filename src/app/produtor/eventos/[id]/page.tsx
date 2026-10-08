import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  addArtistAction,
  addCouponAction,
  addLotAction,
  addStaffAction,
  addTicketTypeAction,
  deleteCouponAction,
  removeArtistAction,
  removeStaffAction,
  saveLotAction,
  setBannerAction,
  submitEventAction,
  updateEventAction,
} from "@/actions/producer";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ArtistForm } from "@/components/ArtistForm";
import { BannerForm } from "@/components/BannerForm";
import { ArtistPhoto } from "@/components/Lineup";
import { EventFields } from "@/components/EventForm";
import { requireUser } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { type Event, getTicketTypes, type LotRow } from "@/lib/events";
import { formatBRL, formatMoney } from "@/lib/fees";
import { EVENT_STATUS } from "@/lib/labels";
import { activeLot } from "@/lib/lots";
import { getEventExtras, getEventStats, getOwnedEvent } from "@/lib/producer";
import { formatDate, formatDay, utcToZonedInput } from "@/lib/time";

export const metadata: Metadata = { title: "Evento", robots: { index: false } };

const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

function LotFields({ lot, timeZone, prefix }: { lot?: LotRow; timeZone: string; prefix: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div>
        <label htmlFor={`${prefix}-lotName`} className="label">
          Lote
        </label>
        <input id={`${prefix}-lotName`} name="lotName" defaultValue={lot?.name ?? "1º lote"} maxLength={40} className="field" />
      </div>
      <div>
        <label htmlFor={`${prefix}-price`} className="label">
          Preço (R$)
        </label>
        <input
          id={`${prefix}-price`}
          name="price"
          inputMode="decimal"
          required
          defaultValue={lot ? money(lot.priceCents) : ""}
          placeholder="0,00 para grátis"
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-quantity`} className="label">
          Quantidade
        </label>
        <input id={`${prefix}-quantity`} name="quantity" type="number" min={1} required defaultValue={lot?.quantity} className="field" />
      </div>
      <div>
        <label htmlFor={`${prefix}-ends`} className="label">
          Vira em (opcional)
        </label>
        <input
          id={`${prefix}-ends`}
          name="lotEndsAt"
          type="datetime-local"
          defaultValue={lot?.endsAt ? utcToZonedInput(lot.endsAt, timeZone) : ""}
          className="field"
        />
      </div>
    </div>
  );
}

async function Tickets({ event }: { event: Event }) {
  const types = await getTicketTypes(event.id);
  const now = new Date();

  return (
    <section className="mt-10">
      <h2 className="subtitle">Ingressos e lotes</h2>
      <p className="mt-1 text-sm text-ink-2">
        O lote seguinte entra sozinho quando o atual esgota ou chega à data de virada.
      </p>

      {types.map((type) => {
        const selling = activeLot(type.lots, now);
        return (
          <div key={type.id} className="card mt-4 p-4">
            <h3 className="font-display text-lg font-semibold text-ink">
              {type.name}
              {type.isHalf && <span className="ml-2 text-sm font-normal text-muted">meia-entrada</span>}
              {type.groupSize > 1 && (
                <span className="ml-2 text-sm font-normal text-muted">para {type.groupSize} pessoas</span>
              )}
            </h3>
            {type.detail && <p className="text-sm text-muted">{type.detail}</p>}
            <ul className="mt-2 divide-y divide-line">
              {type.lots.map((lot) => (
                <li key={lot.id} className="py-2">
                  <details>
                    <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-x-4 text-ink-2">
                      <span>
                        <span className="font-medium text-ink">{lot.name}</span> · {formatBRL(lot.priceCents)}
                        {lot.id === selling?.id && <span className="ml-2 text-sm font-medium text-good">à venda</span>}
                      </span>
                      <span className="text-sm tabular-nums">
                        {lot.sold} de {lot.quantity} vendidos
                      </span>
                    </summary>
                    <ActionForm action={saveLotAction} className="pt-2 pb-3">
                      <input type="hidden" name="lotId" value={lot.id} />
                      <LotFields lot={lot} timeZone={event.timeZone} prefix={lot.id} />
                      <div className="mt-3 flex gap-2">
                        <SubmitButton className="btn-quiet">Salvar lote</SubmitButton>
                        {lot.sold === 0 && (
                          <SubmitButton name="intent" value="delete" confirm="Apagar este lote?" className="btn-link px-2 text-bad">
                            Apagar
                          </SubmitButton>
                        )}
                      </div>
                    </ActionForm>
                  </details>
                </li>
              ))}
            </ul>
            <details className="border-t border-line pt-2">
              <summary className="btn-link cursor-pointer text-sm">Adicionar lote</summary>
              <ActionForm action={addLotAction} resetOnOk className="pt-2">
                <input type="hidden" name="typeId" value={type.id} />
                <LotFields timeZone={event.timeZone} prefix={`novo-${type.id}`} />
                <SubmitButton className="btn-quiet mt-3">Adicionar lote</SubmitButton>
              </ActionForm>
            </details>
          </div>
        );
      })}

      <div className="card mt-4 p-4">
        <h3 className="font-display text-lg font-semibold text-ink">Novo tipo de ingresso</h3>
        <ActionForm action={addTicketTypeAction} resetOnOk className="mt-3">
          <input type="hidden" name="eventId" value={event.id} />
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="type-name" className="label">
                Nome
              </label>
              <input id="type-name" name="name" required maxLength={60} placeholder="Pista, Camarote, Open bar" className="field" />
            </div>
            <div>
              <label htmlFor="type-detail" className="label">
                Observação (opcional)
              </label>
              <input id="type-detail" name="detail" maxLength={100} placeholder="O que está incluso" className="field" />
            </div>
          </div>
          <LotFields timeZone={event.timeZone} prefix="novo-tipo" />
          <p className="mt-2 text-sm text-muted">
            O comprador vê o preço final, conforme os{" "}
            <Link href="/termos-produtor" className="underline">
              contrato do produtor
            </Link>
            .
          </p>
          <div className="mt-3 max-w-xs">
            <label htmlFor="type-group" className="label">
              Pessoas por ingresso
            </label>
            <input id="type-group" name="groupSize" type="number" min={1} max={50} defaultValue={1} className="field" />
            <p className="mt-1 text-sm text-muted">
              Deixe 1 para ingresso comum. Em camarote ou mesa, coloque quantas pessoas entram: quem comprar
              cadastra os convidados e gera um QR Code para cada um.
            </p>
          </div>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-ink-2">
            <input type="checkbox" name="isHalf" className="size-5 accent-brand" />
            É meia-entrada (exige comprovante na portaria)
          </label>
          <SubmitButton className="btn mt-3">Adicionar ingresso</SubmitButton>
        </ActionForm>
      </div>
    </section>
  );
}

async function Extras({ event }: { event: Event }) {
  const { coupons, staff } = await getEventExtras(event.id);
  return (
    <>
      <section className="mt-10">
        <h2 className="subtitle">Cupons de desconto</h2>
        {coupons.length > 0 && (
          <ul className="card mt-3 divide-y divide-line">
            {coupons.map((coupon) => (
              <li key={coupon.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="text-ink-2">
                  <strong className="text-ink">{coupon.code}</strong> · {coupon.percent_off}% · {coupon.used}
                  {coupon.max_uses !== null && ` de ${coupon.max_uses}`} usos
                </span>
                <ActionForm action={deleteCouponAction}>
                  <input type="hidden" name="couponId" value={coupon.id} />
                  <SubmitButton confirm="Encerrar este cupom? Ele para de aceitar novos usos." className="btn-link text-sm text-bad">
                    Encerrar
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addCouponAction} resetOnOk className="mt-3">
          <input type="hidden" name="eventId" value={event.id} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="coupon-code" className="label">
                Código
              </label>
              <input id="coupon-code" name="code" required maxLength={20} placeholder="CALOURO10" className="field uppercase" />
            </div>
            <div>
              <label htmlFor="coupon-percent" className="label">
                Desconto (%)
              </label>
              <input id="coupon-percent" name="percent" type="number" min={1} max={100} required className="field" />
            </div>
            <div>
              <label htmlFor="coupon-max" className="label">
                Limite de usos
              </label>
              <input id="coupon-max" name="maxUses" type="number" min={1} placeholder="Sem limite" className="field" />
            </div>
            <SubmitButton className="btn-quiet">Criar cupom</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="mt-10">
        <h2 className="subtitle">Equipe da portaria</h2>
        <p className="mt-1 text-sm text-ink-2">
          Quem entrar no Colaja com um destes e-mails pode ler os ingressos deste evento. Você já tem acesso.
        </p>
        {staff.length > 0 && (
          <ul className="card mt-3 divide-y divide-line">
            {staff.map((email) => (
              <li key={email} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate text-ink-2">{email}</span>
                <ActionForm action={removeStaffAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="email" value={email} />
                  <SubmitButton className="btn-link text-sm text-bad">Remover</SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addStaffAction} resetOnOk className="mt-3">
          <input type="hidden" name="eventId" value={event.id} />
          <label htmlFor="staff-email" className="sr-only">
            E-mail de quem vai trabalhar na portaria
          </label>
          <div className="flex gap-2">
            <input id="staff-email" name="email" type="email" required placeholder="E-mail da pessoa" className="field" />
            <SubmitButton className="btn-quiet shrink-0">Autorizar</SubmitButton>
          </div>
        </ActionForm>
      </section>
    </>
  );
}

async function Manage({ params }: { params: PageProps<"/produtor/eventos/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/produtor/eventos/${id}`);
  let event: Event;
  try {
    event = await getOwnedEvent(user, id);
  } catch (error) {
    if (error instanceof UserError) notFound();
    throw error;
  }
  const stats = await getEventStats(event);
  const canSubmit = event.status === "rascunho" || event.status === "recusado";

  return (
    <>
      <p className="text-sm font-medium text-brand-text">{EVENT_STATUS[event.status]}</p>
      <h1 className="title">{event.title}</h1>
      <p className="text-muted first-letter:uppercase">
        {formatDate(event.startsAt, event.timeZone)} · {event.venue}, {event.city}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/e/${event.slug}`} className="btn-quiet">
          {event.status === "publicado" ? "Ver página" : "Ver prévia"}
        </Link>
        <Link href={`/produtor/eventos/${event.id}/participantes`} className="btn-quiet">
          Participantes
        </Link>
        <Link href={`/produtor/vendas?evento=${event.id}`} className="btn-quiet">
          Vendas
        </Link>
        <Link href={`/checkin/${event.id}`} className="btn-quiet">
          Abrir portaria
        </Link>
      </div>

      {canSubmit && (
        <ActionForm action={submitEventAction} className="card mt-6 p-4">
          <input type="hidden" name="eventId" value={event.id} />
          <p className="mb-3 text-ink-2">
            {event.status === "recusado"
              ? "O evento voltou para ajustes. Revise os dados e envie de novo."
              : "Quando os ingressos estiverem cadastrados, envie o evento para publicação. A análise confere os dados antes de ele aparecer na vitrine."}
          </p>
          <SubmitButton>Enviar para publicação</SubmitButton>
        </ActionForm>
      )}
      {event.status === "em_analise" && (
        <p className="card mt-6 p-4 text-ink-2">Evento em análise. Você recebe um e-mail quando ele for publicado.</p>
      )}

      <section className="mt-10">
        <h2 className="subtitle">Vendas</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Ingressos vendidos", String(stats.sold)],
            ["Entradas na portaria", String(stats.used)],
            ["Pago pelos compradores", formatMoney(stats.paidCents)],
            ["Você recebe", formatMoney(stats.producerCents)],
          ].map(([label, value]) => (
            <div key={label} className="card p-4">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-display text-2xl font-bold text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-ink-2">
          {stats.orders} pedido(s) pago(s)
          {stats.discountCents > 0 && ` · ${formatBRL(stats.discountCents)} em cupons`}.{" "}
          {stats.verified
            ? `Repasse previsto para ${formatDay(stats.payoutAt, event.timeZone)}, depois do evento.`
            : "Para sacar, confirme sua identidade em Vendas e saque."}
        </p>
        {stats.byType.length > 0 && (
          <ul className="mt-2 text-sm text-ink-2">
            {stats.byType.map((type) => (
              <li key={type.name}>
                {type.name}: {type.sold}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="subtitle">Foto do evento</h2>
        <BannerForm eventId={event.id} current={event.banner} action={setBannerAction} />
      </section>

      <Tickets event={event} />

      <section className="mt-10">
        <h2 className="subtitle">Line-up</h2>
        <p className="mt-1 text-sm text-ink-2">
          Cadastre cada atração com nome e foto. Elas aparecem na página do evento na ordem em que foram
          adicionadas.
        </p>
        {event.lineup.length > 0 && (
          <ul className="card mt-3 divide-y divide-line">
            {event.lineup.map((artist) => (
              <li key={artist.id} className="flex items-center gap-3 p-3">
                <ArtistPhoto artist={artist} className="size-14 rounded-xl text-xl" sizes="56px" />
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{artist.name}</span>
                <ActionForm action={removeArtistAction}>
                  <input type="hidden" name="artistId" value={artist.id} />
                  <SubmitButton confirm={`Remover ${artist.name} do line-up?`} className="btn-link px-2 text-sm text-bad">
                    Remover
                  </SubmitButton>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ArtistForm eventId={event.id} action={addArtistAction} />
      </section>
      <Extras event={event} />

      <section className="mt-10">
        <h2 className="subtitle">Dados do evento</h2>
        <ActionForm action={updateEventAction} className="mt-4">
          <EventFields event={event} />
          <SubmitButton className="btn mt-6">Salvar evento</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}

export default function ManageEventPage({ params }: PageProps<"/produtor/eventos/[id]">) {
  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link href="/produtor" className="btn-link text-sm">
        Painel
      </Link>
      <Suspense fallback={<Loading className="mt-4" />}>
        <Manage params={params} />
      </Suspense>
    </section>
  );
}
