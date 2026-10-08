import "server-only";
import { audit } from "./audit";
import type { User } from "./auth";
import { query, queryOne } from "./db";
import { UserError } from "./errors";
import { newId } from "./ids";
import { sendMail } from "./mail";
import { getProducer, hasAcceptedContract, imageType } from "./producer";
import { getFile, putFile, storageEnabled } from "./storage";

// Verificação de identidade do produtor. Sem ela aprovada, o repasse das vendas fica
// bloqueado. A análise é manual, no painel do admin: verificação automática de documento e
// rosto depende de serviço contratado (ou do próprio gateway de pagamento).

export const KYC_DOCS: Record<string, { label: string; hint: string }> = {
  rg_frente: { label: "Documento com foto — frente", hint: "RG ou CNH, aberto e inteiro na foto" },
  rg_verso: { label: "Documento com foto — verso", hint: "O lado com os números" },
  selfie: { label: "Selfie segurando o documento", hint: "Seu rosto e o documento legíveis na mesma foto" },
  cnpj_doc: { label: "Cartão CNPJ ou contrato social", hint: "A página que mostra o CNPJ e os sócios" },
};

export type KycStatus = "nao_enviado" | "em_analise" | "aprovado" | "recusado";

const MAX_DOC_BYTES = 900 * 1024;

/** CPF: documento e selfie. CNPJ: o mesmo, do responsável, mais o documento da empresa. */
export function requiredDocs(document: string): string[] {
  return document.length === 14 ? ["rg_frente", "rg_verso", "selfie", "cnpj_doc"] : ["rg_frente", "rg_verso", "selfie"];
}

export async function getSentDocs(producerId: string): Promise<string[]> {
  const rows = await query<{ kind: string }>(`SELECT kind FROM producer_documents WHERE producer_id = $1`, [producerId]);
  return rows.map((row) => row.kind);
}

async function editableProducer(user: User) {
  const producer = await getProducer(user);
  if (!producer) throw new UserError("Cadastro de produtor não encontrado.");
  if (producer.kycStatus === "aprovado") throw new UserError("Seus documentos já foram aprovados.");
  if (producer.kycStatus === "em_analise") throw new UserError("Seus documentos estão em análise.");
  if (!hasAcceptedContract(producer)) throw new UserError("Leia e aceite o contrato do produtor antes de enviar os documentos.");
  return producer;
}

export async function uploadDocument(user: User, kind: string, form: FormData): Promise<void> {
  const producer = await editableProducer(user);
  if (!requiredDocs(producer.document).includes(kind)) throw new UserError("Documento não esperado.");
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new UserError("Escolha a foto do documento.");
  if (file.size > MAX_DOC_BYTES) throw new UserError("A foto ficou grande demais. Tente de novo.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type) throw new UserError("Use uma foto em JPG, PNG ou WebP.");
  // Os documentos ficam ligados à conta do produtor: um arquivo por tipo, substituído se ele
  // reenviar. No Supabase Storage quando configurado; senão, no próprio banco.
  const path = storageEnabled() ? `produtores/${producer.id}/${kind}` : null;
  if (path) await putFile(path, bytes, type);
  await query(
    `INSERT INTO producer_documents (id, producer_id, kind, bytes, type, storage_path) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (producer_id, kind) DO UPDATE SET id = EXCLUDED.id, bytes = EXCLUDED.bytes, type = EXCLUDED.type,
       storage_path = EXCLUDED.storage_path, created_at = now()`,
    [newId(), producer.id, kind, path ? null : bytes, type, path],
  );
}

export async function submitKyc(user: User): Promise<void> {
  const producer = await editableProducer(user);
  const sent = await getSentDocs(producer.id);
  const missing = requiredDocs(producer.document).filter((kind) => !sent.includes(kind));
  if (missing.length > 0) throw new UserError(`Falta enviar: ${missing.map((kind) => KYC_DOCS[kind].label).join("; ")}.`);
  await query(`UPDATE producers SET kyc_status = 'em_analise', kyc_note = '' WHERE id = $1`, [producer.id]);
  await audit({ query }, user.id, "verificacao_enviada", "produtor", producer.id);
}

// ---- Admin ----

export type KycRequest = {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  birth_date: string | null;
  cnpj_info: string;
  contract: string | null;
  docs: { id: string; kind: string }[];
};

export async function listKycQueue(): Promise<KycRequest[]> {
  return query<KycRequest>(
    `SELECT p.id, p.name, p.document, p.phone, u.email, to_char(p.birth_date, 'DD/MM/YYYY') AS birth_date, p.cnpj_info,
       'versão ' || p.contract_version || ', aceito em ' || to_char(p.contract_accepted_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS contract,
       (SELECT coalesce(json_agg(json_build_object('id', d.id, 'kind', d.kind) ORDER BY d.kind), '[]'::json)
          FROM producer_documents d WHERE d.producer_id = p.id) AS docs
     FROM producers p JOIN users u ON u.id = p.user_id
     WHERE p.kyc_status = 'em_analise' ORDER BY p.created_at`,
  );
}

/** Imagem de um documento. Quem chama já conferiu que é o admin. */
export async function getDocument(documentId: string): Promise<{ bytes: Uint8Array; type: string } | undefined> {
  const row = await queryOne(`SELECT bytes, type, storage_path FROM producer_documents WHERE id = $1`, [documentId]);
  if (!row) return undefined;
  const bytes = row.storage_path ? await getFile(row.storage_path) : row.bytes;
  return bytes ? { bytes, type: row.type } : undefined;
}

export async function reviewKyc(admin: User, producerId: string, approve: boolean, rawNote: string): Promise<void> {
  const note = rawNote.trim().slice(0, 300);
  if (!approve && !note) throw new UserError("Escreva o motivo da recusa: o produtor recebe essa mensagem.");
  const [row] = await query(
    `UPDATE producers p SET kyc_status = $2, kyc_note = $3 FROM users u
     WHERE p.id = $1 AND u.id = p.user_id AND p.kyc_status = 'em_analise' RETURNING u.email`,
    [producerId, approve ? "aprovado" : "recusado", approve ? "" : note],
  );
  if (!row) throw new UserError("Esta verificação já foi analisada.");
  await audit({ query }, admin.id, approve ? "verificacao_aprovada" : "verificacao_recusada", "produtor", producerId, { note });
  await sendMail({
    to: row.email,
    subject: approve ? "Seus documentos foram aprovados" : "Seus documentos precisam de ajuste",
    body: [
      approve
        ? "A verificação de identidade foi aprovada. O repasse das suas vendas está liberado."
        : `Não foi possível aprovar a verificação: ${note} Envie os documentos de novo pelo painel.`,
    ],
    link: { label: "Abrir o painel", path: "/produtor" },
  });
}
