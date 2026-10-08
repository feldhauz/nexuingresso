"use client";

import { useRef, useState, useTransition } from "react";
import { cropToJpeg } from "@/lib/image-client";
import type { FormAction } from "./ActionForm";

/** Foto do evento: escolhe, recorta em 16:9 no navegador e envia. */
export function BannerForm({
  eventId,
  current,
  action,
}: {
  eventId: string;
  current: string | null;
  action: FormAction;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = (file: File | undefined, remove = false) => {
    if (!file && !remove) return;
    setError(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("eventId", eventId);
      try {
        if (file) data.set("photo", await cropToJpeg(file, 1280, 720), "evento.jpg");
      } catch {
        setError("Não foi possível abrir esta imagem. Tente uma foto em JPG ou PNG.");
        return;
      }
      const result = await action({}, data);
      setError(result.error ?? null);
      if (fileInput.current) fileInput.current.value = "";
    });
  };

  return (
    <div className="card mt-3 p-4">
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-surface-2">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Foto atual do evento" className="size-full object-cover" />
        ) : (
          <p className="flex size-full items-center justify-center p-4 text-center text-sm text-muted">
            Sem foto, a página usa o cartaz com a cor escolhida.
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className={`btn-quiet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand ${pending ? "pointer-events-none opacity-40" : ""}`}>
          {pending ? "Enviando…" : current ? "Trocar foto" : "Escolher foto"}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={pending}
            onChange={(event) => send(event.target.files?.[0])}
          />
        </label>
        {current && (
          <button type="button" disabled={pending} onClick={() => send(undefined, true)} className="btn-link px-2 text-bad">
            Remover foto
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <p className="mt-2 text-sm text-muted">
        A foto é recortada na horizontal (16:9), pelo centro. Evite texto pequeno: no celular ela aparece
        estreita.
      </p>
    </div>
  );
}
