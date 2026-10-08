"use client";

import { useState } from "react";
import { startCheckoutAction } from "@/actions/checkout";
import type { Offer } from "@/lib/events";
import { buyerPrice, formatBRL, quoteOrder } from "@/lib/fees";
import { ActionForm, SubmitButton } from "./ActionForm";

type Props = {
  eventId: string;
  slug: string;
  offers: Offer[];
  maxPerCpf: number;
  absorbFee: boolean;
  initial: Record<string, number>;
};

export function TicketPicker({ eventId, slug, offers, maxPerCpf, absorbFee, initial }: Props) {
  const [quantities, setQuantities] = useState(initial);
  const count = offers.reduce((sum, offer) => sum + (quantities[offer.typeId] ?? 0), 0);

  const change = (offer: Offer, delta: number) => {
    setQuantities((current) => {
      const next = Math.min(Math.max((current[offer.typeId] ?? 0) + delta, 0), offer.lot?.remaining ?? 0);
      return { ...current, [offer.typeId]: next };
    });
  };

  const lines = offers.map((offer) => ({
    priceCents: offer.lot?.priceCents ?? 0,
    quantity: quantities[offer.typeId] ?? 0,
  }));
  const { total } = quoteOrder(lines, "pix", { absorbFee });
  const hasHalf = offers.some((offer) => offer.isHalf && (quantities[offer.typeId] ?? 0) > 0);

  return (
    <ActionForm action={startCheckoutAction} className="md:sticky md:top-6 md:self-start">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <h2 id="ingressos" className="subtitle">
        Ingressos
      </h2>
      <ul aria-labelledby="ingressos" className="card mt-3 divide-y divide-line">
        {offers.map((offer) => {
          const quantity = quantities[offer.typeId] ?? 0;
          return (
            <li key={offer.typeId} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{offer.name}</p>
                <p className="text-sm text-muted">
                  {[offer.groupSize > 1 && `Para ${offer.groupSize} pessoas`, offer.lot?.name, offer.detail]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {offer.lot ? (
                  <p className="mt-1 text-sm text-ink-2">
                    {/* Preço final, como será cobrado no Pix. */}
                    {formatBRL(buyerPrice(offer.lot.priceCents, absorbFee))}
                    {offer.lot.remaining <= 10 && (
                      <span className="text-muted">
                        {" "}
                        · {offer.lot.remaining === 1 ? "resta 1" : `restam ${offer.lot.remaining}`}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-medium text-muted">Esgotado</p>
                )}
              </div>
              {offer.lot && (
                <div className="flex shrink-0 items-center gap-1">
                  <input type="hidden" name={`q_${offer.typeId}`} value={quantity} />
                  <button
                    type="button"
                    onClick={() => change(offer, -1)}
                    disabled={quantity === 0}
                    aria-label={`Remover um ingresso ${offer.name}`}
                    className="size-11 cursor-pointer rounded-xl border border-line text-xl text-ink transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-semibold text-ink tabular-nums" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => change(offer, 1)}
                    disabled={count >= maxPerCpf || quantity >= offer.lot.remaining}
                    aria-label={`Adicionar um ingresso ${offer.name}`}
                    className="size-11 cursor-pointer rounded-xl border border-line text-xl text-ink transition-colors hover:bg-surface-2 disabled:cursor-default disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {count >= maxPerCpf && (
        <p className="mt-2 text-sm text-muted">Limite de {maxPerCpf} ingressos por CPF neste evento.</p>
      )}
      {hasHalf && (
        <p className="mt-2 text-sm text-muted">
          Meia-entrada exige comprovante do direito na portaria, junto com documento com foto.
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:static md:mt-4 md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 md:block">
          <div className="md:mb-3">
            <p className="font-display text-xl font-bold text-ink tabular-nums">
              {count === 0 ? "Escolha os ingressos" : formatBRL(total)}
            </p>
            {count > 0 && total > 0 && <p className="text-sm text-muted">Valor final no Pix</p>}
          </div>
          <SubmitButton disabled={count === 0} className="btn shrink-0 md:w-full">
            Comprar
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
