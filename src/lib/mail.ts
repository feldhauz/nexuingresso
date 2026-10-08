import "server-only";
import { CONTACT_EMAIL, DEMO, SITE_NAME, SITE_URL } from "./config";
import { query } from "./db";
import { newId } from "./ids";

type Mail = {
  to: string;
  subject: string;
  /** Parágrafos em texto puro. */
  body: string[];
  link?: { label: string; path: string };
};

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ENTITIES[c]);

function render({ body, link }: Mail) {
  const url = link ? `${SITE_URL}${link.path}` : null;
  const text = [...body, ...(link ? [`${link.label}: ${url}`] : []), `— ${SITE_NAME}`].join("\n\n");
  const button = link
    ? `<p><a href="${url}" style="display:inline-block;background:#2b3bff;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:12px">${escapeHtml(link.label)}</a></p>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#0b1020;max-width:480px">
${body.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
${button}
<p style="color:#5b6275;font-size:14px">${SITE_NAME}</p></div>`;
  return { text, html, url };
}

/**
 * Envia pelo Resend quando RESEND_API_KEY existe. No modo de demonstração o e-mail também
 * fica guardado para aparecer em /demo/emails.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const { text, html, url } = render(mail);

  if (DEMO) {
    await query(`INSERT INTO emails (id, to_email, subject, body, link) VALUES ($1, $2, $3, $4, $5)`, [
      newId(),
      mail.to,
      mail.subject,
      mail.body.join("\n\n"),
      url,
    ]);
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (!DEMO) console.error(`E-mail não enviado (RESEND_API_KEY ausente): ${mail.subject}`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? `${SITE_NAME} <${CONTACT_EMAIL}>`,
      to: mail.to,
      subject: mail.subject,
      text,
      html,
    }),
  });
  if (!response.ok) console.error(`Falha ao enviar e-mail (${response.status}): ${mail.subject}`);
}
