import Image from "next/image";
import type { Artist } from "@/lib/events";

/** Foto quadrada da atração; sem foto, a inicial do nome sobre o azul claro da marca. */
export function ArtistPhoto({ artist, className = "", sizes }: { artist: Artist; className?: string; sizes: string }) {
  return (
    <span
      className={`relative flex aspect-square shrink-0 items-center justify-center overflow-hidden bg-brand-soft font-display font-bold text-brand-text ${className}`}
    >
      {artist.hasPhoto ? (
        // A foto já chega reduzida do envio; não passa pelo otimizador.
        <Image src={`/lineup/${artist.id}/foto`} alt="" fill sizes={sizes} unoptimized className="object-cover" />
      ) : (
        <span aria-hidden="true">{artist.name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

/**
 * Line-up pensado primeiro para o celular: duas fotos por linha, grandes o bastante para
 * reconhecer o rosto, com o nome por cima. Em telas largas passa a três e quatro por linha.
 */
export function Lineup({ artists }: { artists: Artist[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {artists.map((artist) => (
        <li key={artist.id} className="relative overflow-hidden rounded-2xl">
          <ArtistPhoto artist={artist} className="w-full text-6xl" sizes="(min-width: 1024px) 180px, (min-width: 640px) 33vw, 50vw" />
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pt-10 pb-3 font-display text-base leading-tight font-semibold text-balance text-white">
            {artist.name}
          </p>
        </li>
      ))}
    </ul>
  );
}
