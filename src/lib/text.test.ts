import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOn, isCnpj, isCpf, slugify } from "./text.ts";

test("valida os dígitos do CPF", () => {
  assert.equal(isCpf("529.982.247-25"), true);
  assert.equal(isCpf("529.982.247-26"), false);
  assert.equal(isCpf("111.111.111-11"), false);
  assert.equal(isCpf("123"), false);
});

test("slug sem acento nem símbolo", () => {
  assert.equal(slugify("Baile da República — Florianópolis!"), "baile-da-republica-florianopolis");
});

test("valida os dígitos do CNPJ", () => {
  assert.equal(isCnpj("11.222.333/0001-81"), true);
  assert.equal(isCnpj("11.444.777/0001-61"), true);
  assert.equal(isCnpj("11.222.333/0001-82"), false);
  assert.equal(isCnpj("00.000.000/0000-00"), false);
  assert.equal(isCnpj("123"), false);
});

test("idade em anos completos", () => {
  const today = new Date("2026-10-07T12:00:00Z");
  assert.equal(ageOn("2008-10-07", today), 18);
  assert.equal(ageOn("2008-10-08", today), 17);
  assert.equal(ageOn("1990-01-15", today), 36);
  assert.equal(ageOn("2026-02-30", today), null);
  assert.equal(ageOn("2030-01-01", today), null);
  assert.equal(ageOn("ontem", today), null);
});
