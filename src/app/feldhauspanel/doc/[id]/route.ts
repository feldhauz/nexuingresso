import { getUser } from "@/lib/auth";
import { getDocument } from "@/lib/kyc";

// Foto de documento da verificação de produtor. Só o admin abre, e a resposta não fica em
// cache em lugar nenhum. Para qualquer outra pessoa o endereço responde como inexistente.
export async function GET(_request: Request, { params }: RouteContext<"/feldhauspanel/doc/[id]">) {
  const user = await getUser();
  const document = user?.isAdmin ? await getDocument((await params).id) : undefined;
  if (!document) return new Response(null, { status: 404 });
  return new Response(Buffer.from(document.bytes), {
    headers: {
      "Content-Type": document.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
