import assert from "node:assert/strict";
import { test } from "node:test";
import { activeLot, type LotState } from "./lots.ts";

const lot = (over: Partial<LotState>): LotState => ({
  id: "a",
  name: "1º lote",
  priceCents: 4000,
  quantity: 10,
  sold: 0,
  endsAt: null,
  position: 0,
  ...over,
});

const NOW = new Date("2026-11-01T12:00:00Z");

test("vende o primeiro lote enquanto houver ingresso", () => {
  const lots = [lot({ id: "a" }), lot({ id: "b", position: 1 })];
  assert.equal(activeLot(lots, NOW)?.id, "a");
});

test("vira por quantidade quando o lote esgota", () => {
  const lots = [lot({ id: "a", sold: 10 }), lot({ id: "b", position: 1 })];
  assert.equal(activeLot(lots, NOW)?.id, "b");
});

test("vira por data quando o prazo do lote passa", () => {
  const lots = [
    lot({ id: "a", endsAt: new Date("2026-11-01T12:00:00Z") }),
    lot({ id: "b", position: 1 }),
  ];
  assert.equal(activeLot(lots, NOW)?.id, "b");
  assert.equal(activeLot(lots, new Date("2026-11-01T11:59:59Z"))?.id, "a");
});

test("respeita a ordem dos lotes, não a da lista", () => {
  const lots = [lot({ id: "b", position: 1 }), lot({ id: "a", position: 0 })];
  assert.equal(activeLot(lots, NOW)?.id, "a");
});

test("sem lote disponível, está esgotado", () => {
  assert.equal(activeLot([lot({ sold: 10 })], NOW), undefined);
});
