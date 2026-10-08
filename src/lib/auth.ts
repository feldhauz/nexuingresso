import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_EMAILS, SITE_URL } from "./config";
import { query, queryOne, transaction } from "./db";
import { UserError } from "./errors";
import { hmac, newId, newLoginCode, newToken, safeEqual, sha256 } from "./ids";
import { sendMail } from "./mail";
import { isEmail } from "./text";

// Login sem senha: código de 6 dígitos enviado ao e-mail (docs/PLANEJAMENTO.md, seção 6.1).

const COOKIE = "colaja_sessao";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 5;
const WINDOW_MINUTES = 15;

export type User = { id: string; email: string; name: string; cpf: string | null; isAdmin: boolean };

const codeHash = (email: string, code: string) =>
  hmac(process.env.AUTH_SECRET ?? "colaja-desenvolvimento", `${email}:${code}`);

/** Usuário da sessão atual, ou null. Uma leitura por requisição. */
export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await queryOne(
    `SELECT u.id, u.email, u.name, u.cpf FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, cpf: row.cpf, isAdmin: ADMIN_EMAILS.includes(row.email) };
});

/** Só aceita caminho interno, para o login não virar redirecionador para outro site. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/ingressos";
}

export async function requireUser(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/feldhauspanel");
  // Para quem não é admin, o painel simplesmente não existe.
  if (!user.isAdmin) notFound();
  return user;
}

export async function requestLoginCode(rawEmail: string): Promise<string> {
  const email = rawEmail.trim().toLowerCase();
  if (!isEmail(email)) throw new UserError("Confira o e-mail digitado.");

  const [{ n }] = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM login_codes
     WHERE email = $1 AND created_at > now() - make_interval(mins => $2)`,
    [email, WINDOW_MINUTES],
  );
  if (n >= MAX_CODES_PER_WINDOW) {
    throw new UserError("Muitos códigos pedidos para este e-mail. Tente de novo em alguns minutos.");
  }

  const code = newLoginCode();
  await transaction(async (tx) => {
    // Só o código mais recente vale.
    await tx.query(`UPDATE login_codes SET used_at = now() WHERE email = $1 AND used_at IS NULL`, [email]);
    await tx.query(
      `INSERT INTO login_codes (id, email, code_hash, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(mins => $4))`,
      [newId(), email, codeHash(email, code), CODE_MINUTES],
    );
  });
  await sendMail({
    to: email,
    subject: `${code} é o seu código do Colaja`,
    body: [
      `Seu código de acesso é ${code}.`,
      `Ele vale por ${CODE_MINUTES} minutos. Se você não pediu este código, ignore este e-mail.`,
    ],
  });
  return email;
}

export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.replace(/\D/g, "");
  const wrong = new UserError("Código incorreto ou vencido. Confira ou peça um novo.");

  const pending = await queryOne(
    `SELECT id FROM login_codes WHERE email = $1 AND used_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [email],
  );
  if (!pending) throw wrong;

  // A tentativa é contada antes da comparação, para o limite valer mesmo com pedidos em paralelo.
  const attempt = await queryOne(
    `UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1 AND attempts < $2 RETURNING code_hash`,
    [pending.id, MAX_ATTEMPTS],
  );
  if (!attempt) throw new UserError("Muitas tentativas. Peça um novo código.");
  if (!safeEqual(attempt.code_hash, codeHash(email, code))) throw wrong;

  const token = newToken(32);
  await transaction(async (tx) => {
    const used = await tx.query(
      `UPDATE login_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id`,
      [pending.id],
    );
    if (used.length === 0) throw wrong;
    const [user] = await tx.query(
      `INSERT INTO users (id, email) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
      [newId(), email],
    );
    await tx.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(days => $3))`,
      [sha256(token), user.id, SESSION_DAYS],
    );
  });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SITE_URL.startsWith("https://"),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await query(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)]);
  store.delete(COOKIE);
}

export async function updateName(userId: string, rawName: string): Promise<void> {
  const name = rawName.trim().slice(0, 120);
  if (name.length < 3) throw new UserError("Digite o nome completo.");
  await query(`UPDATE users SET name = $2 WHERE id = $1`, [userId, name]);
}
