"use client";

import { useRef, useState, useTransition } from "react";
import { cropToJpeg } from "@/lib/image-client";
import type { FormAction } from "./ActionForm";

/** Cadastro de uma atração do line-up: foto (da galeria ou da câmera do celular) e nome. */
export function ArtistForm({ eventId, action }: { eventId: string; action: FormAction }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clearPhoto = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const blob = await cropToJpeg(file, 640, 640);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError("Não foi possível abrir esta imagem. Tente uma foto em JPG ou PNG.");
    }
  };

  const submit = () => {
    const data = new FormData();
    data.set("eventId", eventId);
    data.set("name", name);
    if (photo) data.set("photo", photo.blob, "foto.jpg");
    startTransition(async () => {
      const result = await action({}, data);
      setError(result.error ?? null);
      if (!result.error) {
        setName("");
        clearPhoto();
      }
    });
  };

  return (
    <form
      className="card mt-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-4">
        <label
          className="relative flex size-24 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 text-center text-xs font-medium text-ink-2 transition-colors duration-200 hover:border-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
        >
          {photo ? (
            // Pré-visualização local, direto da memória do navegador.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="Foto escolhida" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="mb-1 size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8a2 2 0 0 1 2-2h1.5l1.2-1.8h6.6L16.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Zm8 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              </svg>
              Escolher foto
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void pick(event.target.files?.[0])}
          />
        </label>
        <div className="min-w-0 flex-1">
          <label htmlFor="artist-name" className="label">
            Nome da atração
          </label>
          <input
            id="artist-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={60}
            placeholder="DJ Fulana"
            className="field"
          />
          {photo && (
            <button type="button" onClick={clearPhoto} className="btn-link text-sm text-ink-2">
              Tirar a foto
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn mt-4 w-full sm:w-auto">
        Adicionar ao line-up
      </button>
      <p className="mt-2 text-sm text-muted">A foto é recortada em quadrado, pelo centro. Sem foto, aparece a inicial do nome.</p>
    </form>
  );
}
