import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-16">
      <h1 className="title">Página não encontrada</h1>
      <p className="mt-2 text-ink-2">O endereço pode ter mudado ou o evento não existe mais.</p>
      <Link href="/" className="btn mt-6">
        Ver eventos
      </Link>
    </section>
  );
}
