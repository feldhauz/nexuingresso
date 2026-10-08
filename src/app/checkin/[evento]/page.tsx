import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Scanner } from "@/components/Scanner";
import { requireUser } from "@/lib/auth";
import { getEventById } from "@/lib/events";
import { canCheckIn } from "@/lib/tickets";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Portaria", robots: { index: false } };

async function CheckIn({ params }: { params: PageProps<"/checkin/[evento]">["params"] }) {
  const { evento } = await params;
  const user = await requireUser(`/checkin/${evento}`);
  const event = await getEventById(evento);
  if (!event) notFound();

  if (!(await canCheckIn(user, event.id))) {
    return (
      <>
        <h1 className="title">Sem acesso à portaria</h1>
        <p className="mt-2 text-ink-2">
          {user.email} não está na equipe de {event.title}. Peça ao produtor para autorizar este e-mail.
        </p>
        <Link href="/" className="btn mt-6">
          Voltar
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink">{event.title}</h1>
      <p className="mb-4 text-sm text-muted first-letter:uppercase">
        Portaria · {formatDate(event.startsAt, event.timeZone)}
      </p>
      <Scanner eventId={event.id} />
    </>
  );
}

export default function CheckInPage({ params }: PageProps<"/checkin/[evento]">) {
  return (
    <section className="mx-auto max-w-md py-6">
      <Suspense fallback={<Loading />}>
        <CheckIn params={params} />
      </Suspense>
    </section>
  );
}
