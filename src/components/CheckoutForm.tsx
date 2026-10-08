"use client";

import { useState } from "react";
import { payAction } from "@/actions/checkout";
import { formatBRL, type PaymentMethod, quoteOrder } from "@/lib/fees";
import { ActionForm, SubmitButton } from "./ActionForm";

type Props = {
  orderId: string;
  lines: { priceCents: number; quantity: number }[];
  percentOff: number;
  absorbFee: boolean;
  defaultName: string;
  defaultCpf: string;
  paymentsAvailable: boolean;
};

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "pix", label: "Pix" },
  { id: "card", label: "Cartão de crédito" },
];

/**
 * Dados do comprador e forma de pagamento. O valor de cada forma aparece na própria opção e
 * o total fica visível o tempo todo; é sempre o valor final, sem cobrança extra depois.
 */
export function CheckoutForm({ orderId, lines, percentOff, absorbFee, defaultName, defaultCpf, paymentsAvailable }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const quotes = {
    pix: quoteOrder(lines, "pix", { percentOff, absorbFee }),
    card: quoteOrder(lines, "card", { percentOff, absorbFee }),
  };
  const quote = quotes[method];
  const free = quote.total === 0;

  return (
    <ActionForm action={payAction}>
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">
            Nome completo
          </label>
          <input id="name" name="name" required minLength={3} autoComplete="name" defaultValue={defaultName} className="field" />
        </div>
        <div>
          <label htmlFor="cpf" className="label">
            CPF
          </label>
          <input
            id="cpf"
            name="cpf"
            required
            inputMode="numeric"
            placeholder="000.000.000-00"
            defaultValue={defaultCpf}
            className="field"
          />
        </div>
      </div>

      {!free && (
        <fieldset className="mt-6">
          <legend className="label">Forma de pagamento</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {METHODS.map((option) => (
              <label
                key={option.id}
                className={`card flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 ${method === option.id ? "border-brand ring-1 ring-brand" : ""}`}
              >
                <input
                  type="radio"
                  name="method"
                  value={option.id}
                  checked={method === option.id}
                  onChange={() => setMethod(option.id)}
                  className="size-5 accent-brand"
                />
                <span>
                  <span className="block font-semibold text-ink">{option.label}</span>
                  <span className="block text-sm text-muted tabular-nums">{formatBRL(quotes[option.id].total)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <dl className="mt-6 space-y-1 border-t border-line pt-4 text-ink-2">
        {quote.discount > 0 && (
          <>
            <div className="flex justify-between">
              <dt>Ingressos</dt>
              <dd className="tabular-nums">{formatBRL(quote.total + quote.discount)}</dd>
            </div>
            <div className="flex justify-between text-good">
              <dt>Cupom ({percentOff}%)</dt>
              <dd className="tabular-nums">− {formatBRL(quote.discount)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between pt-2 font-display text-xl font-bold text-ink">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatBRL(quote.total)}</dd>
        </div>
      </dl>

      <SubmitButton className="btn mt-5 w-full" disabled={!free && !paymentsAvailable}>
        {free ? "Confirmar ingressos" : method === "pix" ? "Pagar com Pix" : "Pagar com cartão"}
      </SubmitButton>
      {!free && !paymentsAvailable && (
        <p className="mt-2 text-sm text-muted">O pagamento ainda não está disponível neste site.</p>
      )}
    </ActionForm>
  );
}
