import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createEventAction } from "@/actions/producer";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { EventFields } from "@/components/EventForm";
import { requireUser } from "@/lib/auth";
import { getProducer } from "@/lib/producer";

export const metadata: Metadata = { title: "Criar evento", robots: { index: false } };

async function Guard() {
  const user = await requireUser("/produtor/eventos/novo");
  if (!(await getProducer(user))) redirect("/produtor");
  return null;
}

export default function NewEventPage() {
  return (
    <section className="mx-auto max-w-2xl py-8">
      <Suspense>
        <Guard />
      </Suspense>
      <Link href="/produtor" className="btn-link text-sm">
        Painel
      </Link>
      <h1 className="title">Criar evento</h1>
      <p className="mt-2 mb-6 text-ink-2">Ingressos, lotes e line-up entram no passo seguinte.</p>
      <ActionForm action={createEventAction}>
        <EventFields />
        <SubmitButton className="btn mt-6 w-full sm:w-auto">Salvar e cadastrar ingressos</SubmitButton>
      </ActionForm>
    </section>
  );
}
