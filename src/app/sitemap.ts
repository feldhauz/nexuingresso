import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { PUBLIC_URL } from "@/lib/config";
import { query } from "@/lib/db";

// Gerado a cada pedido, então um evento entra no mapa no momento em que é publicado.
// Eventos encerrados continuam listados: a página deles segue no ar.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const events = await query<{ slug: string; city_slug: string; ends_at: Date }>(
    `SELECT slug, city_slug, ends_at FROM events WHERE status = 'publicado' ORDER BY starts_at DESC LIMIT 5000`,
  );
  const producers = await query<{ slug: string }>(`SELECT slug FROM producers WHERE status = 'aprovado' LIMIT 5000`);
  const now = new Date();
  const cities = new Set(events.filter((e) => e.ends_at > now).map((e) => e.city_slug));

  return [
    { url: PUBLIC_URL, changeFrequency: "daily", priority: 1 },
    { url: `${PUBLIC_URL}/produtor`, changeFrequency: "monthly", priority: 0.5 },
    ...[...cities].map((city) => ({ url: `${PUBLIC_URL}/eventos/${city}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...producers.map((p) => ({ url: `${PUBLIC_URL}/p/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...events.map((event) => ({
      url: `${PUBLIC_URL}/e/${event.slug}`,
      changeFrequency: "daily" as const,
      priority: event.ends_at > now ? 0.9 : 0.3,
    })),
  ];
}
