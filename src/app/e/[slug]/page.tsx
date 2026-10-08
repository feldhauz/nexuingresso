import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { EventGrid } from "@/components/EventGrid";
import { Icon } from "@/components/Icon";
import { Lineup } from "@/components/Lineup";
import { MoodTags, OrganizerCard } from "@/components/Organizer";
import { Poster } from "@/components/Poster";
import { TicketPicker } from "@/components/TicketPicker";
import { getUser } from "@/lib/auth";
import { PUBLIC_URL } from "@/lib/config";
import { queryOne } from "@/lib/db";
import { type Event, findMovedSlug, getEventBySlug, getTicketTypes, listPublicEvents, type Offer, toOffers } from "@/lib/events";
import { buyerPrice } from "@/lib/fees";
import { expireOrders } from "@/lib/orders";
import { getProducerProfile } from "@/lib/producer";
import { formatDate } from "@/lib/time";

type Props = PageProps<"/e/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  if (!event || event.status !== "publicado") return {};
  const when = formatDate(event.startsAt, event.timeZone);
  return {
    title: `${event.title} em ${event.city}`,
    description: `${when}, ${event.venue}. ${event.description}`.slice(0, 160),
    alternates: { canonical: `/e/${event.slug}` },
    openGraph: { title: `${event.title} — ${when}`, description: `${event.venue}, ${event.city}` },
  };
}

/** Dados estruturados que o Google usa para mostrar data, local e preço do evento. */
function jsonLd(event: Event, offers: Offer[], ended: boolean) {
  const url = `${PUBLIC_URL}/e/${event.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventStatus: `https://schema.org/${event.status === "cancelado" ? "EventCancelled" : "EventScheduled"}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url,
    image: event.banner ? `${PUBLIC_URL}${event.banner}` : `${url}/opengraph-image`,
    location: {
      "@type": "Place",
      name: event.venue,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address,
        addressLocality: event.city,
        addressCountry: "BR",
      },
    },
    organizer: { "@type": "Organization", name: event.producerName, url: `${PUBLIC_URL}/p/${event.producerSlug}` },
    performer: event.lineup.map((artist) => ({
      "@type": "PerformingGroup",
      name: artist.name,
      ...(artist.hasPhoto && { image: `${PUBLIC_URL}/lineup/${artist.id}/foto` }),
    })),
    offers: offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      url,
      priceCurrency: "BRL",
      price: (buyerPrice(offer.lot?.priceCents ?? 0, event.absorbFee) / 100).toFixed(2),
      availability: `https://schema.org/${offer.lot && !ended ? "InStock" : "SoldOut"}`,
    })),
  };
}

/** Lê a escolha que voltou do login: "tipo.2_tipo.1". */
function parseSelection(raw: string | string[] | undefined): Record<string, number> {
  if (typeof raw !== "string") return {};
  const entries = raw.split("_").map((part) => {
    const dot = part.lastIndexOf(".");
    return [part.slice(0, dot), Number(part.slice(dot + 1))] as const;
  });
  return Object.fromEntries(entries.filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0));
}

async function EventContent({ params, searchParams }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    // O produtor trocou o final do link: o endereço antigo leva ao novo.
    const moved = await findMovedSlug(slug);
    if (moved) permanentRedirect(`/e/${moved}`);
    notFound();
  }

  // Evento ainda não publicado só aparece, como prévia, para o produtor e o admin.
  let preview = false;
  const user = await getUser();
  if (event.status !== "publicado" && event.status !== "cancelado") {
    const owner =
      user &&
      (user.isAdmin ||
        (await queryOne(`SELECT 1 AS x FROM producers WHERE id = $1 AND user_id = $2`, [event.producerId, user.id])));
    if (!owner) notFound();
    preview = true;
  }

  await expireOrders();
  const now = new Date();
  const ended = now >= event.endsAt;
  const cancelled = event.status === "cancelado";
  const offers = toOffers(await getTicketTypes(event.id), now);
  const selling = !ended && !cancelled && !preview;
  const more = selling ? [] : await listPublicEvents({ producerId: event.producerId, excludeId: event.id });
  const organizer = await getProducerProfile({ id: event.producerId }, user);

  const available = Object.fromEntries(offers.map((offer) => [offer.typeId, offer.lot?.remaining ?? 0]));
  const initial = Object.fromEntries(
    Object.entries(parseSelection((await searchParams).i))
      .filter(([typeId]) => available[typeId])
      .map(([typeId, quantity]) => [typeId, Math.min(quantity, available[typeId])]),
  );

  return (
    <article className="grid gap-8 py-6 md:grid-cols-[1fr_22rem] md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(event, offers, ended)).replace(/</g, "\\u003c") }}
      />
      <div className="min-w-0">
        <Poster
          title={event.title}
          poster={event.poster}
          image={event.banner}
          startsAt={event.startsAt}
          timeZone={event.timeZone}
          city={event.city}
          className="sm:aspect-[16/9]"
        />
        <h1 className="mt-6 font-display text-3xl leading-tight font-bold tracking-tight text-ink md:text-5xl">
          {event.title}
        </h1>
        <p className="text-ink-2">
          Por{" "}
          {organizer ? (
            <Link href={`/p/${organizer.slug}`} className="font-semibold text-ink underline-offset-4 hover:underline">
              {organizer.name}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{event.producerName}</span>
          )}
        </p>
        <ul className="mt-5 space-y-3 border-y border-line py-4 text-ink-2">
          <li className="flex gap-3">
            <Icon name="calendar" className="mt-0.5 size-5 text-brand-text" />
            <span className="font-medium text-ink first-letter:uppercase">
              {formatDate(event.startsAt, event.timeZone)}
            </span>
          </li>
          <li className="flex gap-3">
            <Icon name="pin" className="mt-0.5 size-5 text-brand-text" />
            <span>
              <span className="block font-medium text-ink">
                {event.venue}, {event.city}
              </span>
              {event.address && <span className="block text-sm text-muted">{event.address}</span>}
            </span>
          </li>
          <li className="flex gap-3">
            <Icon name="id" className="mt-0.5 size-5 text-brand-text" />
            {event.minAge === 0 ? "Livre para todas as idades" : `Entrada a partir de ${event.minAge} anos`}
          </li>
        </ul>
        {event.moods.length > 0 && (
          <div className="mt-4">
            <MoodTags moods={event.moods} />
          </div>
        )}
        <p className="mt-5 max-w-prose whitespace-pre-line text-ink-2">{event.description}</p>

        {event.lineup.length > 0 && (
          <section className="mt-8">
            <h2 className="subtitle mb-3">Line-up</h2>
            <Lineup artists={event.lineup} />
          </section>
        )}

        {organizer && (
          <section className="mt-8">
            <h2 className="subtitle mb-3">Organizado por</h2>
            <OrganizerCard profile={organizer} back={`/e/${event.slug}`} />
          </section>
        )}
      </div>

      {selling ? (
        <TicketPicker
          // A escolha que volta do login precisa substituir a que estava na tela.
          key={JSON.stringify(initial)}
          eventId={event.id}
          slug={event.slug}
          offers={offers}
          maxPerCpf={event.maxPerCpf}
          absorbFee={event.absorbFee}
          initial={initial}
        />
      ) : (
        <aside className="card self-start p-5">
          <h2 className="subtitle">
            {preview ? "Prévia do evento" : cancelled ? "Evento cancelado" : "Evento encerrado"}
          </h2>
          <p className="mt-2 text-ink-2">
            {preview
              ? "Esta página só aparece para você. A venda começa quando o evento for publicado."
              : cancelled
                ? "A venda foi interrompida. Quem comprou recebe as instruções por e-mail."
                : "Este evento já aconteceu e não vende mais ingressos."}
          </p>
          {preview && (
            <Link href={`/produtor/eventos/${event.id}`} className="btn-quiet mt-4 w-full">
              Voltar ao painel
            </Link>
          )}
        </aside>
      )}

      {more.length > 0 && (
        <section className="md:col-span-2">
          <h2 className="subtitle mb-4">Próximos eventos de {event.producerName}</h2>
          <EventGrid events={more} />
        </section>
      )}
    </article>
  );
}

function EventSkeleton() {
  return (
    <div className="py-6 md:py-10" aria-hidden="true">
      <div className="aspect-[16/9] max-w-2xl rounded-2xl bg-surface-2" />
      <div className="mt-5 h-5 w-40 rounded bg-surface-2" />
      <div className="mt-2 h-9 w-72 rounded bg-surface-2" />
    </div>
  );
}

export default function EventPage(props: Props) {
  return (
    <Suspense fallback={<EventSkeleton />}>
      <EventContent {...props} />
    </Suspense>
  );
}
