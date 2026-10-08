import assert from "node:assert/strict";
import { test } from "node:test";
import { orderTotals, quoteOrder, ticketFee } from "./fees.ts";

test("Pix cobra 5% e cartão 7%", () => {
  assert.equal(ticketFee(10000, "pix"), 500);
  assert.equal(ticketFee(10000, "card"), 700);
});

test("taxa mínima de R$ 2,50 por ingresso", () => {
  assert.equal(ticketFee(2000, "pix"), 250);
  assert.equal(ticketFee(3000, "card"), 250);
});

test("ingresso gratuito não paga taxa", () => {
  assert.equal(ticketFee(0, "pix"), 0);
});

test("arredonda para o centavo", () => {
  assert.equal(ticketFee(7990, "card"), 559);
});

test("total soma a taxa de cada ingresso, não a do subtotal", () => {
  const totals = orderTotals(
    [
      { priceCents: 2000, quantity: 3 },
      { priceCents: 8000, quantity: 1 },
    ],
    "pix",
  );
  assert.deepEqual(totals, { subtotal: 14000, fee: 1150, total: 15150 });
});

test("cupom reduz o preço antes da taxa", () => {
  const quote = quoteOrder([{ priceCents: 10000, quantity: 2 }], "pix", { percentOff: 50 });
  assert.deepEqual(quote, { subtotal: 20000, discount: 10000, fee: 500, total: 10500, producer: 10000 });
});

test("cupom de 100% zera a taxa", () => {
  const quote = quoteOrder([{ priceCents: 4000, quantity: 1 }], "card", { percentOff: 100 });
  assert.deepEqual(quote, { subtotal: 4000, discount: 4000, fee: 0, total: 0, producer: 0 });
});

test("taxa absorvida sai da parte do produtor", () => {
  const quote = quoteOrder([{ priceCents: 10000, quantity: 1 }], "card", { absorbFee: true });
  assert.deepEqual(quote, { subtotal: 10000, discount: 0, fee: 700, total: 10000, producer: 9300 });
});

test("taxa absorvida nunca deixa o produtor devendo", () => {
  const quote = quoteOrder([{ priceCents: 200, quantity: 1 }], "pix", { absorbFee: true });
  assert.equal(quote.producer, 0);
});

test("comprador e produtor somam o total mais a taxa repassada", () => {
  const quote = quoteOrder([{ priceCents: 7990, quantity: 3 }], "card");
  assert.equal(quote.total, quote.producer + quote.fee);
});
