import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventGrid } from "@/components/EventGrid";
import { Lineup } from "@/components/Lineup";
import { FollowButton, MoodTags, ProducerAvatar, ProducerCounts } from "@/components/Organizer";
import { getUser } from "@/lib/auth";
import { type Artist, listPastEvents, listPublicEvents } from "@/lib/events";
import { getProducerProfile } from "@/lib/producer";
import { formatDay } from "@/lib/time";

type Props = PageProps<"/p/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProducerProfile({ slug }, null);
  if (!profile) return {};
  return {
    title: `Eventos de ${profile.name}`,
    description: (profile.bio || `Próximos eventos e ingressos de ${profile.name} no Colaja.`).slice(0, 160),
    alternates: { canonical: `/p/${profile.slug}` },
  };
}

async function Profile({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const profile = await getProducerProfile({ slug }, await getUser());
  if (!profile) notFound();

  const [upcoming, past] = await Promise.all([
    listPublicEvents({ producerId: profile.id }),
    listPastEvents(profile.id),
  ]);
  // Atrações de todos os eventos do produtor, sem repetir.
  // Um cartão por nome; se o mesmo nome aparece em mais de um evento, fica o que tem foto.
  const byName = new Map<string, Artist>();
  for (const artist of [...upcoming, ...past].flatMap((event) => event.lineup)) {
    const key = artist.name.toLowerCase();
    if (!byName.get(key)?.hasPhoto) byName.set(key, artist);
  }
  const played = [...byName.values()];

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <ProducerAvatar name={profile.name} className="size-20 text-4xl" />
          <div className="min-w-0">
            <h1 className="title break-words">{profile.name}</h1>
            <ProducerCounts profile={profile} />
          </div>
        </div>
        <FollowButton profile={profile} back={`/p/${profile.slug}`} />
      </header>
      <p className="mt-2 text-sm text-muted">Quem segue recebe um e-mail quando sai evento novo.</p>

      <section className="mt-10">
        <h2 className="subtitle mb-4">Próximos eventos</h2>
        {upcoming.length > 0 ? (
          <EventGrid events={upcoming} />
        ) : (
          <p className="text-ink-2">Nenhum evento à venda agora. Siga para saber do próximo.</p>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="subtitle mb-3">Eventos passados</h2>
          <ul className="card divide-y divide-line">
            {past.map((event) => (
              <li key={event.id}>
                <Link href={`/e/${event.slug}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4 hover:bg-surface-2">
                  <span>
                    <span className="block font-display text-lg font-semibold text-ink">{event.title}</span>
                    <span className="block text-sm text-muted">
                      {formatDay(event.startsAt, event.timeZone)} · {event.venue}, {event.city}
                    </span>
                  </span>
                  <MoodTags moods={event.moods} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {played.length > 0 && (
        <section className="mt-10">
          <h2 className="subtitle mb-3">Atrações dos eventos</h2>
          <Lineup artists={played} />
        </section>
      )}

      <section className="mt-10 max-w-prose">
        <h2 className="subtitle mb-2">Sobre</h2>
        {profile.bio && <p className="whitespace-pre-line text-ink-2">{profile.bio}</p>}
        {profile.instagram && (
          <a href={`https://www.instagram.com/${profile.instagram}`} rel="noopener nofollow" className="btn-link">
            Instagram @{profile.instagram}
          </a>
        )}
        <p className="mt-1 text-sm text-muted">No Colaja desde {profile.since}.</p>
      </section>
    </>
  );
}

export default function ProducerProfilePage({ params }: Props) {
  return (
    <section className="py-8">
      <Suspense fallback={<Loading />}>
        <Profile params={params} />
      </Suspense>
    </section>
  );
}
