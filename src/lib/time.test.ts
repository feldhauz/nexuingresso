import assert from "node:assert/strict";
import { test } from "node:test";
import { utcToZonedInput, zonedToUtc } from "./time.ts";

test("22h em Brasília são 1h UTC do dia seguinte", () => {
  assert.equal(zonedToUtc("2026-11-14T22:00", "America/Sao_Paulo")?.toISOString(), "2026-11-15T01:00:00.000Z");
});

test("a meia-noite do lote é a do local do evento", () => {
  assert.equal(zonedToUtc("2026-11-14T00:00", "America/Manaus")?.toISOString(), "2026-11-14T04:00:00.000Z");
  assert.equal(zonedToUtc("2026-11-14T00:00", "America/Rio_Branco")?.toISOString(), "2026-11-14T05:00:00.000Z");
});

test("ida e volta devolvem o mesmo horário", () => {
  const utc = zonedToUtc("2026-12-19T15:30", "America/Noronha");
  assert.ok(utc);
  assert.equal(utcToZonedInput(utc, "America/Noronha"), "2026-12-19T15:30");
});

test("texto inválido não vira data", () => {
  assert.equal(zonedToUtc("amanhã", "America/Sao_Paulo"), null);
});
