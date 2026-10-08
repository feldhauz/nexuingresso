import { getEventBanner } from "@/lib/producer";

// Foto do evento. O número da versão no endereço muda a cada troca de foto, então a resposta
// pode ficar em cache para sempre.
export async function GET(_request: Request, { params }: RouteContext<"/banner/[id]/[v]">) {
  const banner = await getEventBanner((await params).id);
  if (!banner) return new Response(null, { status: 404 });
  return new Response(Buffer.from(banner.bytes), {
    headers: {
      "Content-Type": banner.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
