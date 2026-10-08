"use client";

import { useRef, useState, useTransition } from "react";
import type { ContractPage } from "@/lib/contract";
import type { FormAction } from "./ActionForm";

/**
 * Contrato do produtor em páginas. O aceite só aparece na última, depois que ele passou por
 * todas; é o passo antes do envio dos documentos.
 */
export function ContractSteps({ pages, version, accept }: { pages: ContractPage[]; version: string; accept: FormAction }) {
  const top = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const page = pages[step];
  const last = step === pages.length - 1;
  const go = (next: number) => {
    setStep(next);
    top.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div ref={top} className="card mt-4 scroll-mt-20 p-5">
      <p className="text-sm font-semibold tracking-widest text-brand-text uppercase">
        Contrato do produtor · {step + 1} de {pages.length}
      </p>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {pages.map((_, index) => (
          <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-brand" : "bg-surface-2"}`} />
        ))}
      </div>

      <h2 className="mt-4 font-display text-2xl leading-tight font-bold text-ink">{page.title}</h2>
      <p className="mt-2 text-ink-2">{page.intro}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-2">
        {page.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {last && (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-surface-2 p-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-brand"
          />
          <span className="text-ink">
            Li as {pages.length} páginas e aceito o contrato do produtor (versão {version}).
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-bad">
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" disabled={step === 0 || pending} onClick={() => go(step - 1)} className="btn-quiet">
          Voltar
        </button>
        {last ? (
          <button
            type="button"
            disabled={!agreed || pending}
            className="btn"
            onClick={() =>
              startTransition(async () => {
                const data = new FormData();
                data.set("version", version);
                const result = await accept({}, data);
                setError(result.error ?? null);
              })
            }
          >
            Aceitar
          </button>
        ) : (
          <button type="button" onClick={() => go(step + 1)} className="btn">
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
