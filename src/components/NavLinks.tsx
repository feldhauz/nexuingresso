"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Eventos", match: /^\/($|e\/|eventos\/|p\/)/ },
  { href: "/ingressos", label: "Meus ingressos", match: /^\/ingressos/ },
  { href: "/produtor", label: "Para produtores", match: /^\/produtor/ },
  { href: "/conta", label: "Conta", match: /^\/(conta|entrar)/ },
];

/** Menu do cabeçalho no computador, com a página atual marcada. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {LINKS.map(({ href, label, match }) => {
        const active = match.test(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-[4.5rem] items-center border-b-2 transition-colors duration-200 ${
              active ? "border-brand text-ink" : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
