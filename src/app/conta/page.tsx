import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction, updateNameAction } from "@/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { requireUser } from "@/lib/auth";
import { CONTACT_EMAIL } from "@/lib/config";
import { getProducer } from "@/lib/producer";

export const metadata: Metadata = { title: "Conta", robots: { index: false } };

async function Account() {
  const user = await requireUser("/conta");
  const producer = await getProducer(user);

  return (
    <>
      <p className="mt-2 text-ink-2">{user.email}</p>

      <ActionForm action={updateNameAction} className="mt-6">
        <label htmlFor="name" className="label">
          Nome completo
        </label>
        <div className="flex gap-2">
          <input id="name" name="name" defaultValue={user.name} autoComplete="name" required className="field" />
          <SubmitButton className="btn-quiet shrink-0">Salvar</SubmitButton>
        </div>
      </ActionForm>

      <nav aria-label="Conta" className="card mt-8 divide-y divide-line">
        <Link href="/ingressos" className="flex min-h-14 items-center px-4 font-medium text-ink hover:bg-surface-2">
          Meus ingressos
        </Link>
        <Link href="/produtor" className="flex min-h-14 items-center px-4 font-medium text-ink hover:bg-surface-2">
          {producer ? "Painel do produtor" : "Quero vender ingressos"}
        </Link>
        {user.isAdmin && (
          <Link href="/feldhauspanel" className="flex min-h-14 items-center px-4 font-medium text-ink hover:bg-surface-2">
            Administração
          </Link>
        )}
      </nav>

      <p className="mt-6 text-sm text-muted">
        Para corrigir ou excluir seus dados, escreva para {CONTACT_EMAIL}.
      </p>
      <form action={signOutAction} className="mt-4">
        <button type="submit" className="btn-link text-ink-2">
          Sair
        </button>
      </form>
    </>
  );
}

export default function AccountPage() {
  return (
    <section className="mx-auto max-w-md py-8">
      <h1 className="title">Conta</h1>
      <Suspense fallback={<Loading className="mt-4" />}>
        <Account />
      </Suspense>
    </section>
  );
}
