"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  eventos: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4",
  ingressos:
    "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Zm10-2v12",
  conta: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function TabBar() {
  const pathname = usePathname();
  // Telas com ação própria no rodapé (comprar, pagar, escanear) e os painéis não têm abas.
  if (/^\/(e|checkout|checkin|produtor|feldhauspanel)\//.test(`${pathname}/`)) return null;

  const side = (href: string, label: string, d: string) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-semibold text-ink" : "font-medium text-muted"}`}
      >
        <Icon d={d} />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center border-t border-line bg-surface/95 px-2 pt-2 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] md:hidden"
    >
      {side("/", "Eventos", ICONS.eventos)}
      <Link
        href="/ingressos"
        aria-current={pathname.startsWith("/ingressos") ? "page" : undefined}
        className="-mt-7 flex flex-col items-center gap-1 px-4 text-[11px] font-semibold text-ink"
      >
        <span className="flex size-14 items-center justify-center rounded-2xl border-4 border-bg bg-brand text-on-brand">
          <Icon d={ICONS.ingressos} />
        </span>
        Ingressos
      </Link>
      {side("/conta", "Conta", ICONS.conta)}
    </nav>
  );
}
