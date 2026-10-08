import Image from "next/image";

// Cartaz tipográfico nas cores do evento; faz as vezes do banner até existir upload de imagem.

type Props = {
  title: string;
  poster: { bg: string; fg: string };
  /** Foto enviada pelo produtor; quando existe, ocupa o cartaz inteiro. */
  image?: string | null;
  /** Com a data, o cartaz ganha o bloco de dia e mês. */
  startsAt?: Date;
  timeZone?: string;
  city?: string;
  className?: string;
};

function dayAndMonth(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: get("day"), month: get("month").replace(".", "") };
}

export function Poster({ title, poster, image, startsAt, timeZone, city, className = "" }: Props) {
  if (image) {
    return (
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${className}`}
        style={{ backgroundColor: poster.bg }}
      >
        {/* A foto já chega recortada e reduzida do envio; não passa pelo otimizador. */}
        <Image src={image} alt={`Foto de ${title}`} fill unoptimized sizes="(min-width: 768px) 640px, 100vw" className="object-cover" />
      </div>
    );
  }
  const date = startsAt && dayAndMonth(startsAt, timeZone);
  return (
    <div
      className={`@container relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-2xl p-4 sm:p-5 ${className}`}
      style={{ backgroundColor: poster.bg, color: poster.fg }}
      aria-hidden="true"
    >
      {/* Anéis na cor do texto: dão profundidade sem competir com o título. */}
      <span className="absolute -right-[22%] -bottom-[45%] aspect-square w-[85%] rounded-full border-[2.25rem] border-current opacity-10" />
      <span className="absolute -right-[4%] -bottom-[21%] aspect-square w-[49%] rounded-full border-[1.25rem] border-current opacity-10" />

      <div className="relative flex items-start justify-between gap-3">
        {date ? (
          <span className="font-display leading-none">
            <span className="block text-4xl font-bold tracking-tight">{date.day}</span>
            <span className="mt-1 block text-sm font-semibold tracking-widest uppercase">{date.month}</span>
          </span>
        ) : (
          <span />
        )}
        {city && <span className="text-right text-xs font-semibold tracking-widest uppercase">{city}</span>}
      </div>
      <span className="relative font-display text-[clamp(1.75rem,9.5cqw,3.5rem)] leading-[0.95] font-bold tracking-tight text-balance">
        {title}
      </span>
    </div>
  );
}
