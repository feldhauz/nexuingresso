import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { Loading } from "@/components/Loading";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/fees";
import { METHOD, TICKET_STATUS } from "@/lib/labels";
import { getProducer, listProducerEvents } from "@/lib/producer";
import { getBalance, getSalesSummary, listBoxes, listNames, listSales } from "@/lib/sales";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Vendas", robots: { index: false } };

type Props = PageProps<"/produtor/vendas">;

const VIEWS = [
  { id: "vendas", label: "Vendas" },
  { id: "nomes", label: "Nomes" },
  { id: "camarotes", label: "Camarotes" },
] as const;

type View = (typeof VIEWS)[number]["id"];

async function Sales({ searchParams }: { searchParams: Props["searchParams"] }) {
  const user = await requireUser("/produtor/vendas");
  const producer = await getProducer(user);
  if (!producer) redirect("/produtor");

  const params = await searchParams;
  const events = await listProducerEvents(producer);
  const eventId = events.find((event) => event.id === params.evento)?.id ?? null;
  const view: View = VIEWS.find((v) => v.id === params.ver)?.id ?? "vendas";
  const href = (next: { ver?: View; evento?: string | null }) => {
    const query = new URLSearchParams();
    const event = next.evento === undefined ? eventId : next.evento;
    if (event) query.set("evento", event);
    if ((next.ver ?? view) !== "vendas") query.set("ver", next.ver ?? view);
    return `/produtor/vendas${query.size ? `?${query}` : ""}`;
  };

  const [summary, balance] = await Promise.all([getSalesSummary(producer, eventId), getBalance(producer)]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="title">Vendas</h1>
        <p className="text-muted">{producer.name}</p>
      </div>

      {events.length > 1 && (
        <nav aria-label="Evento" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {[{ id: null as string | null, title: "Todos os eventos" }, ...events].map((event) => (
            <Link
              key={event.id ?? "todos"}
              href={href({ evento: event.id })}
              aria-current={event.id === eventId ? "true" : undefined}
              className={`flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
                event.id === eventId ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-ink-2 hover:border-brand"
              }`}
            >
              {event.title}
            </Link>
          ))}
        </nav>
      )}

      {/* Resumo: o que ele vendeu e quanto é dele. */}
      <div className="card mt-4 p-5">
        <p className="text-sm text-muted">Você recebe{eventId ? " neste evento" : ""}</p>
        <p className="font-display text-4xl font-bold text-ink tabular-nums">{formatMoney(summary.earned)}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
          {[
            ["Ingressos", summary.tickets],
            ["Vendas", summary.orders],
            ["Já entraram", `${summary.used} de ${summary.people}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-display text-xl font-bold text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm text-ink-2">
            <span className="block font-semibold text-ink tabular-nums">{formatMoney(balance.available)} disponível para saque</span>
            {balance.upcoming > 0 && `${formatMoney(balance.upcoming)} liberam depois dos eventos`}
          </p>
          <Link href="/produtor/saque" className="btn">
            Sacar
          </Link>
        </div>
      </div>

      <nav aria-label="O que mostrar" className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {VIEWS.map((option) => (
          <Link
            key={option.id}
            href={href({ ver: option.id })}
            aria-current={option.id === view ? "true" : undefined}
            className={`flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-200 ${
              option.id === view ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {view === "vendas" && <SalesList producer={producer} eventId={eventId} />}
      {view === "nomes" && <Names producer={producer} eventId={eventId} />}
      {view === "camarotes" && <Boxes producer={producer} eventId={eventId} />}
    </>
  );
}

type ListProps = { producer: NonNullable<Awaited<ReturnType<typeof getProducer>>>; eventId: string | null };

function Empty({ text }: { text: string }) {
  return (
    <div className="card mt-3 flex flex-col items-start gap-3 p-6 text-ink-2">
      <Icon name="ticket" className="size-8 text-muted" />
      {text}
    </div>
  );
}

async function SalesList({ producer, eventId }: ListProps) {
  const sales = await listSales(producer, eventId);
  if (sales.length === 0) return <Empty text="Nenhuma venda ainda. Elas aparecem aqui assim que o pagamento é confirmado." />;
  return (
    <ul className="card mt-3 divide-y divide-line">
      {sales.map((sale) => (
        <li key={sale.id} className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{sale.buyer_name || sale.email}</p>
            <p className="text-sm text-ink-2">{sale.items}</p>
            <p className="text-sm text-muted">
              {!eventId && `${sale.title} · `}
              {formatDateTime(sale.paid_at, sale.time_zone)} · {METHOD[sale.method] ?? sale.method}
            </p>
          </div>
          <p className="shrink-0 font-display font-bold text-ink tabular-nums">
            {sale.method === "cortesia" ? "Cortesia" : formatMoney(sale.producer_cents)}
          </p>
        </li>
      ))}
    </ul>
  );
}

async function Names({ producer, eventId }: ListProps) {
  const names = await listNames(producer, eventId);
  if (names.length === 0) return <Empty text="Ainda não há nomes. Convidados de camarote entram na lista depois de cadastrados." />;
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-2">{names.length} pessoa(s), em ordem alfabética</p>
        {eventId && (
          // Download de arquivo: link comum, sem navegação do app.
          <a href={`/produtor/eventos/${eventId}/participantes.csv`} className="btn-link text-sm" download>
            Baixar CSV
          </a>
        )}
      </div>
      <ul className="card mt-2 divide-y divide-line">
        {names.map((person, index) => (
          <li key={index} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{person.name}</span>
              <span className="block truncate text-sm text-muted">
                {person.type_name}
                {!eventId && ` · ${person.title}`}
              </span>
            </span>
            {person.status !== "valido" && (
              <span className="shrink-0 text-sm font-medium text-ink-2">{TICKET_STATUS[person.status]}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

async function Boxes({ producer, eventId }: ListProps) {
  const boxes = await listBoxes(producer, eventId);
  if (boxes.length === 0) return <Empty text="Nenhum camarote ou mesa vendido ainda." />;
  return (
    <ul className="mt-3 space-y-3">
      {boxes.map((box) => (
        <li key={box.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-ink">{box.name}</p>
              <p className="text-sm text-muted">
                {box.type_name}
                {!eventId && ` · ${box.title}`} · comprado por {box.buyer_name ?? "—"}
              </p>
            </div>
            <p className="shrink-0 text-sm font-medium text-ink-2 tabular-nums">{box.size} pessoas</p>
          </div>
          <p className="mt-2 border-t border-line pt-2 text-sm text-ink-2">
            {box.guests || "Nenhum convidado cadastrado ainda."}
          </p>
          {box.generated < box.size && (
            <p className="mt-1 text-sm text-muted">QR Codes ainda não gerados: esses ingressos não entram na portaria.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function SalesPage({ searchParams }: Props) {
  return (
    <section className="mx-auto max-w-2xl py-6">
      <Link href="/produtor" className="btn-link text-sm">
        Painel
      </Link>
      <Suspense fallback={<Loading />}>
        <Sales searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
