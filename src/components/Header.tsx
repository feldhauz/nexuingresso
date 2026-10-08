import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="Colaja ingressos, página inicial" className="flex flex-col items-start text-brand-text">
          <Logo className="h-9 w-auto" />
          <span className="mt-1 font-display text-xs leading-none font-semibold tracking-[0.32em] text-ink-2 lowercase">
            ingressos
          </span>
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Suspense>
            <NavLinks />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line pb-28 md:pb-0">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/produtor" className="hover:text-ink">
            Venda seus ingressos
          </Link>
          <Link href="/termos" className="hover:text-ink">
            Termos de uso
          </Link>
          <Link href="/termos-produtor" className="hover:text-ink">
            Contrato do produtor
          </Link>
          <Link href="/privacidade" className="hover:text-ink">
            Privacidade
          </Link>
          <Link href="/reembolso" className="hover:text-ink">
            Reembolso
          </Link>
          <a href="https://www.instagram.com/colaja.ingressos" rel="noopener" className="hover:text-ink">
            Instagram @colaja.ingressos
          </a>
        </nav>
        <p>colajaingressos.com.br</p>
      </div>
    </footer>
  );
}
