import Link from "next/link";
import { Suspense } from "react";
import { EventGrid, EventGridSkeleton } from "@/components/EventGrid";
import { Icon, type IconName } from "@/components/Icon";
import { DEMO } from "@/lib/config";
import { listCities, listPublicEvents } from "@/lib/events";

const PROMISES: { icon: IconName; title: string; text: string }[] = [
  { icon: "tag", title: "O preço que você vê é o que paga", text: "O valor final está na tela desde a escolha do ingresso." },
  { icon: "swap", title: "Não vai mais? Transfira", text: "Envie o ingresso para o e-mail de outra pessoa, sem custo." },
  { icon: "qr", title: "Um QR Code por ingresso", text: "Cada código vale uma entrada e é lido na portaria." },
];

const param = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

async function Results({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const q = param(params.q);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param(params.data)) ? param(params.data) : "";
  const [events, cities] = await Promise.all([listPublicEvents({ q, date }), listCities()]);
  const filtered = Boolean(q || date);

  return (
    <>
      {cities.length > 1 && (
        <nav aria-label="Cidades" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {cities.map(({ city, citySlug }) => (
            <Link
              key={citySlug}
              href={`/eventos/${citySlug}`}
              className="flex h-11 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink-2 transition-colors duration-200 hover:border-brand hover:text-ink"
            >
              {city}
            </Link>
          ))}
        </nav>
      )}

      {filtered && (
        <p className="mb-4 flex flex-wrap items-center gap-x-3 text-ink-2">
          {events.length} {events.length === 1 ? "evento encontrado" : "eventos encontrados"}
          <Link href="/" className="btn-link text-sm">
            Limpar busca
          </Link>
        </p>
      )}

      {events.length > 0 ? (
        <EventGrid events={events} />
      ) : (
        <div className="card flex flex-col items-start gap-3 p-6 text-ink-2">
          <Icon name="search" className="size-8 text-muted" />
          {filtered
            ? "Nenhum evento encontrado. Tente o nome da cidade, parte do nome do evento ou outra data."
            : "Ainda não há eventos publicados. Volte em breve."}
        </div>
      )}
      {DEMO && events.length > 0 && <p className="mt-6 text-sm text-muted">Eventos de exemplo, para demonstração.</p>}
    </>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="py-10 md:py-16">
        <p className="text-sm font-semibold tracking-widest text-brand-text uppercase">Ingressos para festas e shows</p>
        <h1 className="mt-2 font-display text-5xl leading-none font-bold tracking-tight text-ink md:text-7xl">
          Qual é a boa?
        </h1>
        <form
          action="/"
          className="card mt-7 flex max-w-2xl flex-col gap-1 p-1.5 shadow-lg shadow-ink/5 focus-within:border-brand sm:flex-row sm:items-center"
        >
          <label htmlFor="q" className="sr-only">
            Buscar por evento, atração ou cidade
          </label>
          <span className="flex min-w-0 items-center pl-3 text-muted sm:flex-[2]">
            <Icon name="search" />
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Evento, atração ou cidade"
              className="h-12 w-full min-w-0 bg-transparent px-3 text-base text-ink placeholder:text-muted focus:outline-none"
            />
          </span>
          <label htmlFor="data" className="sr-only">
            Data do evento
          </label>
          <input
            id="data"
            name="data"
            type="date"
            className="h-12 min-w-0 shrink-0 border-t border-line bg-transparent px-4 sm:flex-1 text-base text-ink focus:outline-none sm:border-t-0 sm:border-l"
          />
          <button type="submit" className="btn shrink-0">
            Buscar
          </button>
        </form>
      </section>

      <section aria-labelledby="eventos">
        <h2 id="eventos" className="sr-only">
          Eventos
        </h2>
        <Suspense fallback={<EventGridSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {PROMISES.map((item) => (
          <div key={item.title} className="card p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
              <Icon name={item.icon} className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-ink">{item.title}</h2>
            <p className="mt-1 text-ink-2">{item.text}</p>
          </div>
        ))}
      </section>

      {/* O amarelo da marca só aparece sobre o azul. */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-brand p-6 text-on-brand md:p-10">
        <span className="absolute -top-24 -right-16 size-72 rounded-full border-[2.5rem] border-white/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl leading-tight font-bold tracking-tight md:text-4xl">
              Organiza festa ou show?
            </h2>
            <p className="mt-2 text-white/85">
              Crie o evento, venda por Pix e cartão e valide a entrada pelo celular.
            </p>
          </div>
          <Link
            href="/produtor"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-[#0b1020] transition-opacity duration-200 hover:opacity-90"
          >
            Venda seus ingressos
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </>
  );
}
