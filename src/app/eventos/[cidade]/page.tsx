import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventGrid, EventGridSkeleton } from "@/components/EventGrid";
import { listPublicEvents } from "@/lib/events";

type Props = PageProps<"/eventos/[cidade]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cidade } = await params;
  const [first] = await listPublicEvents({ citySlug: cidade });
  if (!first) return {};
  return {
    title: `Festas e shows em ${first.city}`,
    description: `Ingressos para eventos em ${first.city}. Compre pelo celular e receba o QR Code na hora.`,
    alternates: { canonical: `/eventos/${cidade}` },
  };
}

async function CityEvents({ params }: { params: Props["params"] }) {
  const { cidade } = await params;
  const events = await listPublicEvents({ citySlug: cidade });
  if (events.length === 0) notFound();
  return (
    <>
      <h1 className="title">Eventos em {events[0].city}</h1>
      <div className="mt-6">
        <EventGrid events={events} />
      </div>
    </>
  );
}

export default function CityPage({ params }: Props) {
  return (
    <section className="py-8">
      <Link href="/" className="btn-link text-sm">
        Todos os eventos
      </Link>
      <Suspense fallback={<EventGridSkeleton />}>
        <CityEvents params={params} />
      </Suspense>
    </section>
  );
}
