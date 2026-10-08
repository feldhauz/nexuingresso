import Link from "next/link";
import type { EventCard } from "@/lib/events";
import { buyerPrice, formatBRL } from "@/lib/fees";
import { formatDate } from "@/lib/time";
import { Poster } from "./Poster";

export function EventGrid({ events }: { events: EventCard[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li key={event.id}>
          <Link href={`/e/${event.slug}`} className="group block">
            <Poster
              title={event.title}
              poster={event.poster}
              image={event.banner}
              startsAt={event.startsAt}
              timeZone={event.timeZone}
              city={event.city}
              className="transition-transform duration-200 group-hover:-translate-y-1"
            />
            <p className="mt-3 text-sm font-medium text-brand-text first-letter:uppercase">
              {formatDate(event.startsAt, event.timeZone)}
            </p>
            <h3 className="font-display text-lg font-semibold text-ink group-hover:underline">{event.title}</h3>
            <p className="text-sm text-muted">
              {event.venue}, {event.city}
            </p>
            <p className="mt-2 inline-flex h-8 items-center rounded-full bg-surface-2 px-3 text-sm font-semibold text-ink">
              {event.fromCents === null
                ? "Esgotado"
                : event.fromCents === 0
                  ? "Grátis"
                  : `A partir de ${formatBRL(buyerPrice(event.fromCents, event.absorbFee))}`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Espaço reservado enquanto a lista carrega, para a página não pular. */
export function EventGridSkeleton() {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i}>
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-surface-2" />
          <div className="mt-3 h-4 w-32 rounded bg-surface-2" />
          <div className="mt-2 h-5 w-48 rounded bg-surface-2" />
        </li>
      ))}
    </ul>
  );
}
