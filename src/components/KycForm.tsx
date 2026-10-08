"use client";

import { useState, useTransition } from "react";
import { shrinkToJpeg } from "@/lib/image-client";
import type { FormAction } from "./ActionForm";

type Doc = { kind: string; label: string; hint: string; sent: boolean };

/** Envio dos documentos da verificação: uma foto por vez, reduzida no navegador. */
export function KycForm({ docs, upload, submit }: { docs: Doc[]; upload: FormAction; submit: FormAction }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allSent = docs.every((doc) => doc.sent);

  const send = (kind: string, file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(kind);
    startTransition(async () => {
      const data = new FormData();
      data.set("kind", kind);
      try {
        data.set("photo", await shrinkToJpeg(file, 1600), `${kind}.jpg`);
      } catch {
        setError("Não foi possível abrir esta imagem. Tente uma foto em JPG ou PNG.");
        setBusy(null);
        return;
      }
      const result = await upload({}, data);
      setError(result.error ?? null);
      setBusy(null);
    });
  };

  return (
    <div className="mt-4">
      <ul className="card divide-y divide-line">
        {docs.map((doc) => (
          <li key={doc.kind} className="flex items-center justify-between gap-3 p-4">
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{doc.label}</span>
              <span className="block text-sm text-muted">{doc.sent ? "Enviado" : doc.hint}</span>
            </span>
            <label
              className={`btn-quiet h-11 shrink-0 px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${pending ? "pointer-events-none opacity-40" : ""}`}
            >
              {busy === doc.kind ? "Enviando…" : doc.sent ? "Trocar" : "Enviar foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={pending}
                onChange={(event) => {
                  send(doc.kind, event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending || !allSent}
        className="btn mt-4 w-full sm:w-auto"
        onClick={() =>
          startTransition(async () => {
            const result = await submit({}, new FormData());
            setError(result.error ?? null);
          })
        }
      >
        Enviar para análise
      </button>
      {!allSent && <p className="mt-2 text-sm text-muted">Envie todas as fotos para liberar o botão.</p>}
    </div>
  );
}
