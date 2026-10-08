import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { getUser, safeNext } from "@/lib/auth";
import { DEMO } from "@/lib/config";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

async function Login({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const next = safeNext((await searchParams).next);
  if (await getUser()) redirect(next);
  return <LoginForm next={next} demo={DEMO} />;
}

export default function LoginPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <section className="mx-auto max-w-sm py-10">
      <h1 className="title">Entrar</h1>
      <p className="mt-2 mb-6 text-ink-2">Use o e-mail da compra. Se ainda não tem conta, ela é criada agora.</p>
      <Suspense>
        <Login searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
