// Virada de lote (docs/PLANEJAMENTO.md, seção 4): por data ou por quantidade.

export type LotState = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  sold: number;
  endsAt: Date | null;
  position: number;
};

/** O lote à venda agora: o primeiro, na ordem, que ainda tem ingresso e não passou da data. */
export function activeLot<T extends LotState>(lots: T[], now: Date): T | undefined {
  return [...lots]
    .sort((a, b) => a.position - b.position)
    .find((lot) => lot.sold < lot.quantity && (!lot.endsAt || now < lot.endsAt));
}

export function remaining(lot: LotState): number {
  return lot.quantity - lot.sold;
}
