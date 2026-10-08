import "server-only";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

export const newId = () => randomUUID();

/** Código aleatório longo, sem dados pessoais: é o que vai no QR e nos links de transferência. */
export const newToken = (bytes = 24) => randomBytes(bytes).toString("base64url");

/** Número do pedido, curto o bastante para ditar no atendimento. */
export function newOrderId(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export const newLoginCode = () => String(randomInt(1_000_000)).padStart(6, "0");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const hmac = (secret: string, value: string) => createHmac("sha256", secret).update(value).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
