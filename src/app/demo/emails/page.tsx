import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DEMO } from "@/lib/config";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "E-mails de demonstração", robots: { index: false } };

// Caixa de saída do modo de demonstração. Fora dele a página não existe: ela mostra os
// códigos de login.
async function Emails() {
  await connection();
  if (!DEMO) notFound();
  const emails = await query<{ id: string; to_email: string; subject: string; body: string; link: string | null; created_at: Date }>(
    `SELECT * FROM emails ORDER BY created_at DESC LIMIT 50`,
  );

  if (emails.length === 0) return <p className="mt-6 text-ink-2">Nenhum e-mail enviado ainda.</p>;
  return (
    <ul className="mt-6 space-y-3">
      {emails.map((email) => (
        <li key={email.id} className="card p-4">
          <p className="text-sm text-muted">
            Para {email.to_email} · {formatDateTime(email.created_at)}
          </p>
          <p className="font-semibold text-ink">{email.subject}</p>
          <p className="mt-1 text-sm whitespace-pre-line text-ink-2">{email.body}</p>
          {email.link && (
            <a href={email.link} className="btn-link text-sm break-all">
              {email.link}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DemoEmailsPage() {
  return (
    <section className="mx-auto max-w-2xl py-8">
      <h1 className="title">E-mails de demonstração</h1>
      <p className="mt-2 text-ink-2">
        No modo de demonstração os e-mails do site aparecem aqui em vez de serem enviados. Atualize a página
        para ver os novos.
      </p>
      <Suspense fallback={<Loading className="mt-6" />}>
        <Emails />
      </Suspense>
    </section>
  );
}
