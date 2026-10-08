import "server-only";
import { DEMO } from "./config";
import { hmac, newToken, safeEqual } from "./ids";

// Fronteira com o gateway de pagamento. Hoje só existe o gateway simulado do modo de
// demonstração: o gateway real (Pix, cartão e split) ainda não foi contratado
// (docs/PLANEJAMENTO.md, seção 2). Ao contratar, só este arquivo muda.
//
// Dados de cartão nunca passam por aqui: o formulário do gateway gera o token no navegador.

export type Charge = { chargeId: string; pixCode: string | null };

export type Split = { producerId: string; producerCents: number; platformCents: number };

export const paymentsAvailable = () => DEMO;

export async function createCharge(input: {
  orderId: string;
  amountCents: number;
  method: "pix" | "card";
  split: Split;
}): Promise<Charge> {
  if (!DEMO) throw new Error("Nenhum gateway de pagamento configurado.");
  const chargeId = `sim_${newToken(12)}`;
  return {
    chargeId,
    pixCode: input.method === "pix" ? `PIX-SIMULADO-COLAJA-${input.orderId}-${chargeId}` : null,
  };
}

export async function refundCharge(chargeId: string): Promise<void> {
  if (!DEMO) throw new Error("Nenhum gateway de pagamento configurado.");
  void chargeId;
}

const globalForSecret = globalThis as unknown as { colajaWebhookSecret?: string };

function webhookSecret(): string {
  if (process.env.PAYMENT_WEBHOOK_SECRET) return process.env.PAYMENT_WEBHOOK_SECRET;
  if (!DEMO) throw new Error("PAYMENT_WEBHOOK_SECRET não configurado.");
  return (globalForSecret.colajaWebhookSecret ??= newToken(32));
}

export const signWebhook = (rawBody: string) => hmac(webhookSecret(), rawBody);

export function isValidWebhook(rawBody: string, signature: string | null): boolean {
  return !!signature && safeEqual(signature, signWebhook(rawBody));
}
