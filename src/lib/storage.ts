import "server-only";

// Armazenamento privado dos documentos de verificação no Supabase Storage. Liga sozinho quando
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY existem; sem elas, as fotos ficam no banco
// (src/lib/kyc.ts). O bucket é privado: nada aqui gera link público, e só o servidor, com a
// chave de serviço, lê os arquivos.
//
// Ainda não exercitado contra um projeto real do Supabase.

const BUCKET = "documentos";

const config = () => {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
};

export const storageEnabled = () => config() !== null;

const globalForBucket = globalThis as unknown as { colajaBucketReady?: Promise<void> };

/** Cria o bucket privado na primeira vez; se já existir, o Supabase responde conflito e seguimos. */
function ensureBucket(url: string, key: string): Promise<void> {
  globalForBucket.colajaBucketReady ??= fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  }).then(async (response) => {
    if (!response.ok && response.status !== 409 && !(await response.text()).includes("already exists")) {
      globalForBucket.colajaBucketReady = undefined;
      throw new Error(`Supabase Storage: não foi possível criar o bucket (${response.status}).`);
    }
  });
  return globalForBucket.colajaBucketReady;
}

export async function putFile(path: string, bytes: Buffer, type: string): Promise<void> {
  const supabase = config();
  if (!supabase) throw new Error("Supabase Storage não configurado.");
  await ensureBucket(supabase.url, supabase.key);
  const response = await fetch(`${supabase.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabase.key}`,
      apikey: supabase.key,
      "Content-Type": type,
      "x-upsert": "true",
    },
    body: new Uint8Array(bytes),
  });
  if (!response.ok) throw new Error(`Supabase Storage: envio recusado (${response.status}).`);
}

export async function getFile(path: string): Promise<Uint8Array | undefined> {
  const supabase = config();
  if (!supabase) return undefined;
  const response = await fetch(`${supabase.url}/storage/v1/object/${BUCKET}/${path}`, {
    headers: { Authorization: `Bearer ${supabase.key}`, apikey: supabase.key },
  });
  return response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;
}
