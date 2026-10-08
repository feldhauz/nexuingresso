import type { ReactNode } from "react";

/** Moldura das páginas de termos, privacidade e reembolso. */
export function Legal({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-prose py-8 text-ink-2 [&_a]:text-brand-text [&_a]:underline [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="title">{title}</h1>
      <p className="text-sm text-muted">Atualizado em {updated}.</p>
      {children}
    </article>
  );
}
