import { handleWebhook } from "@/lib/orders";

// Aviso de pagamento do gateway. O corpo é lido como texto porque a assinatura é calculada
// sobre os bytes exatos que chegaram.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const status = await handleWebhook(rawBody, request.headers.get("x-colaja-signature"));
  return new Response(null, { status });
}
