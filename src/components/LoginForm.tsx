"use client";

import { useState, useTransition } from "react";
import { requestCodeAction, verifyCodeAction } from "@/actions/auth";

/** Login em dois passos: e-mail, depois o código de 6 dígitos que chegou nele. */
export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sendCode = (form: FormData) =>
    startTransition(async () => {
      const result = await requestCodeAction({}, form);
      setError(result.error ?? null);
      if (result.email) setSentTo(result.email);
    });

  const verify = (form: FormData) =>
    startTransition(async () => {
      const result = await verifyCodeAction({}, form);
      setError(result?.error ?? null);
    });

  if (!sentTo) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendCode(new FormData(event.currentTarget));
        }}
      >
        <label htmlFor="email" className="label">
          Seu e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
          className="field"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm font-medium text-bad">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn mt-4 w-full">
          Receber código
        </button>
        <p className="mt-3 text-sm text-muted">Sem senha: enviamos um código de 6 dígitos para o seu e-mail.</p>
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        verify(new FormData(event.currentTarget));
      }}
    >
      <input type="hidden" name="email" value={sentTo} />
      <input type="hidden" name="next" value={next} />
      <label htmlFor="code" className="label">
        Código enviado para {sentTo}
      </label>
      <input
        id="code"
        name="code"
        required
        autoFocus
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        placeholder="000000"
        className="field text-center font-display text-2xl tracking-[0.4em]"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn mt-4 w-full">
        Entrar
      </button>
      {demo && (
        <p className="mt-3 rounded-xl bg-brand-soft p-3 text-sm text-ink-2">
          Modo de demonstração: o código aparece em{" "}
          <a href="/demo/emails" target="_blank" className="font-semibold text-brand-text underline">
            /demo/emails
          </a>
          .
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        className="btn-link mt-2 text-sm"
        onClick={() => {
          setSentTo(null);
          setError(null);
        }}
      >
        Usar outro e-mail ou pedir novo código
      </button>
    </form>
  );
}
