import "server-only";

export const SITE_NAME = "Colaja";
export const PUBLIC_URL = "https://colajaingressos.com.br";
export const INSTAGRAM = "colaja.ingressos";
/** Canal de atendimento e de pedidos de privacidade. A caixa precisa existir no domínio. */
export const CONTACT_EMAIL = "contato@colajaingressos.com.br";

/** Endereço usado nos links dos e-mails. */
export const SITE_URL =
  process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? PUBLIC_URL : "http://localhost:3000");

/**
 * Modo de demonstração: pagamento simulado, eventos de exemplo e caixa de e-mails visível em
 * /demo/emails. Ligado sozinho no desenvolvimento; em produção só com COLAJA_DEMO=1.
 */
export const DEMO =
  process.env.COLAJA_DEMO === "1" ||
  (process.env.NODE_ENV !== "production" && process.env.COLAJA_DEMO !== "0");

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const RESERVATION_MINUTES = 10;
export const TRANSFER_CLOSES_HOURS = 2;
export const MAX_TRANSFERS = 2;
/** O repasse ao produtor sai depois do evento (docs/PLANEJAMENTO.md, risco R1). */
export const PAYOUT_DAYS_AFTER_EVENT = 2;
