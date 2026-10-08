"use client";

import { createContext, type ReactNode, use, useState, useTransition } from "react";
import type { FormState } from "@/lib/errors";

export type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

const Pending = createContext(false);

/**
 * Formulário ligado a uma ação do servidor. Mostra o erro ou a confirmação abaixo dos campos
 * e mantém o que foi digitado quando a ação recusa o envio.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnOk = false,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form, (event.nativeEvent as SubmitEvent).submitter);
        startTransition(async () => {
          const result = await action({}, data);
          setState(result);
          if (result.ok && resetOnOk) form.reset();
        });
      }}
    >
      <Pending value={pending}>{children}</Pending>
      {state.error && (
        <p role="alert" className="mt-2 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="mt-2 text-sm font-medium text-good">
          {state.ok}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  className = "btn",
  name,
  value,
  disabled = false,
  confirm,
}: {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  /** Pergunta mostrada antes de enviar; para ações que não têm volta. */
  confirm?: string;
}) {
  const pending = use(Pending);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className={className}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
