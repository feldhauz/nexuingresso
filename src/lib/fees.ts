// Regra de taxa do produto (docs/PLANEJAMENTO.md, seção 5). Valores sempre em centavos.

export type PaymentMethod = "pix" | "card";

const RATE: Record<PaymentMethod, number> = { pix: 0.05, card: 0.07 };
const MIN_FEE_CENTS = 250;

/** Taxa de serviço de um ingresso. Ingresso gratuito não paga taxa. */
export function ticketFee(priceCents: number, method: PaymentMethod): number {
  if (priceCents <= 0) return 0;
  return Math.max(Math.round(priceCents * RATE[method]), MIN_FEE_CENTS);
}

export type OrderLine = { priceCents: number; quantity: number };

/** Totais do pedido quando a taxa é repassada ao comprador. */
export function orderTotals(lines: OrderLine[], method: PaymentMethod) {
  let subtotal = 0;
  let fee = 0;
  for (const { priceCents, quantity } of lines) {
    subtotal += priceCents * quantity;
    fee += ticketFee(priceCents, method) * quantity;
  }
  return { subtotal, fee, total: subtotal + fee };
}

export type QuoteOptions = {
  /** Cupom, em porcentagem do preço de cada ingresso. */
  percentOff?: number;
  /** O produtor paga a taxa em vez de repassá-la ao comprador. */
  absorbFee?: boolean;
};

/**
 * Valores finais do pedido: o que o comprador paga, a taxa da plataforma e a parte do
 * produtor no split. O resultado é gravado no pedido e não é recalculado depois.
 */
export function quoteOrder(lines: OrderLine[], method: PaymentMethod, options: QuoteOptions = {}) {
  const { percentOff = 0, absorbFee = false } = options;
  let subtotal = 0;
  let discount = 0;
  let fee = 0;
  for (const { priceCents, quantity } of lines) {
    const off = Math.round((priceCents * percentOff) / 100);
    const unit = priceCents - off;
    // Absorvida, a taxa nunca passa do valor do ingresso: o produtor não fica devendo.
    const unitFee = absorbFee ? Math.min(ticketFee(unit, method), unit) : ticketFee(unit, method);
    subtotal += priceCents * quantity;
    discount += off * quantity;
    fee += unitFee * quantity;
  }
  const paid = subtotal - discount;
  return absorbFee
    ? { subtotal, discount, fee, total: paid, producer: paid - fee }
    : { subtotal, discount, fee, total: paid + fee, producer: paid };
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return cents === 0 ? "Grátis" : BRL.format(cents / 100);
}

/** Valor em reais, inclusive o zero (para extratos e totais). */
export function formatMoney(cents: number): string {
  return BRL.format(cents / 100);
}

/**
 * Preço que o comprador vê e paga por um ingresso: já com a taxa de serviço somada, a não
 * ser que o produtor a absorva. A taxa não aparece separada em nenhuma tela; as regras
 * ficam nos termos de uso.
 */
export function buyerPrice(priceCents: number, absorbFee: boolean, method: PaymentMethod = "pix"): number {
  return absorbFee ? priceCents : priceCents + ticketFee(priceCents, method);
}
