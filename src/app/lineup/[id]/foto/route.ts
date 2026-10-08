import { getArtistPhoto } from "@/lib/producer";

// Foto de uma atração do line-up. O tipo vem do que foi conferido no envio, e o navegador é
// instruído a não adivinhar outro.
export async function GET(_request: Request, { params }: RouteContext<"/lineup/[id]/foto">) {
  const photo = await getArtistPhoto((await params).id);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
