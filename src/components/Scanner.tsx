"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkInAction } from "@/actions/tickets";
import type { CheckInResult } from "@/lib/tickets";

const LOOK: Record<CheckInResult["state"], { bg: string; title: string }> = {
  valido: { bg: "#0f8a55", title: "Pode entrar" },
  usado: { bg: "#b7791f", title: "Já usado" },
  invalido: { bg: "#c9362a", title: "Inválido" },
};

/**
 * Leitor da portaria: câmera traseira lendo QR sem parar. O resultado ocupa a tela inteira,
 * com cor e texto, e a leitura só volta depois de um toque.
 */
export function Scanner({ eventId }: { eventId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const [camera, setCamera] = useState<"off" | "on" | "blocked">("off");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [count, setCount] = useState(0);

  const validate = useCallback(
    async (code: string) => {
      if (busy.current || !code.trim()) return;
      busy.current = true;
      try {
        const outcome = await checkInAction(eventId, code);
        setResult(outcome);
        if (outcome.state === "valido") setCount((n) => n + 1);
        navigator.vibrate?.(outcome.state === "valido" ? 80 : [80, 60, 80]);
      } catch {
        setResult({ state: "invalido", reason: "Sem conexão. Confira a internet e leia de novo." });
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (camera !== "on") return;
    const video = videoRef.current!;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    let stream: MediaStream | undefined;
    let frame = 0;
    let stopped = false;

    const scan = () => {
      if (stopped) return;
      if (!busy.current && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Metade da resolução basta para QR e deixa a leitura leve em celular simples.
        canvas.width = video.videoWidth / 2;
        canvas.height = video.videoHeight / 2;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (found?.data) void validate(found.data);
      }
      frame = requestAnimationFrame(scan);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (media) => {
        if (stopped) return media.getTracks().forEach((track) => track.stop());
        stream = media;
        video.srcObject = media;
        await video.play();
        scan();
      })
      .catch(() => setCamera("blocked"));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [camera, validate]);

  const next = () => {
    setResult(null);
    busy.current = false;
  };

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="size-full object-cover" />
        {camera !== "on" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            {camera === "blocked" && (
              <p>Não foi possível abrir a câmera. Libere o acesso nas permissões do navegador ou digite o código.</p>
            )}
            <button type="button" className="btn" onClick={() => setCamera(navigator.mediaDevices ? "on" : "blocked")}>
              {camera === "blocked" ? "Tentar de novo" : "Abrir câmera"}
            </button>
          </div>
        )}
        {camera === "on" && <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" />}
      </div>
      <p className="mt-3 text-center text-ink-2" aria-live="polite">
        {count} entrada(s) validada(s) neste aparelho
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem("code") as HTMLInputElement;
          void validate(input.value);
          input.value = "";
        }}
      >
        <label htmlFor="code" className="label">
          Câmera não leu? Digite o código do ingresso
        </label>
        <div className="flex gap-2">
          <input id="code" name="code" autoComplete="off" autoCapitalize="off" spellCheck={false} className="field font-mono" />
          <button type="submit" className="btn-quiet shrink-0">
            Validar
          </button>
        </div>
      </form>

      {result && (
        <div
          role="alertdialog"
          aria-label={LOOK[result.state].title}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-8 text-center text-white"
          style={{ backgroundColor: LOOK[result.state].bg }}
        >
          <p className="font-display text-5xl font-bold">{LOOK[result.state].title}</p>
          {result.state === "invalido" ? (
            <p className="text-xl">{result.reason}</p>
          ) : (
            <>
              <p className="text-2xl font-semibold">{result.name}</p>
              <p className="text-xl">
                {result.typeName}
                {result.state === "valido" && result.group && ` · ${result.group}`}
              </p>
              {result.state === "valido" && result.isHalf && (
                <p className="rounded-xl bg-black/25 px-4 py-2 text-lg font-semibold">Meia-entrada: conferir comprovante</p>
              )}
              {result.state === "usado" && <p className="text-xl">Entrada registrada em {result.usedAt}</p>}
            </>
          )}
          <button
            type="button"
            autoFocus
            onClick={next}
            className="mt-6 h-14 w-full max-w-xs cursor-pointer rounded-xl bg-white text-lg font-bold text-black"
          >
            Ler o próximo
          </button>
        </div>
      )}
    </div>
  );
}
