import { ImageResponse } from "next/og";
import { getEventBySlug } from "@/lib/events";
import { formatDate } from "@/lib/time";

// Imagem que aparece quando o link do evento é compartilhado no WhatsApp e no Instagram.

export const alt = "Evento no Colaja";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEventBySlug((await params).slug);
  const visible = event?.status === "publicado";
  const bg = visible ? event.poster.bg : "#2b3bff";
  const fg = visible ? event.poster.fg : "#ffffff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: bg,
          color: fg,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>colaja</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>
            {visible ? event.title : "Ingressos para festas e shows"}
          </div>
          {visible && (
            <div style={{ display: "flex", fontSize: 40, marginTop: 28 }}>
              {formatDate(event.startsAt, event.timeZone)} · {event.venue}, {event.city}
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
