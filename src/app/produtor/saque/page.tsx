import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { acceptContractAction, requestPayoutAction, submitKycAction, uploadDocumentAction } from "@/actions/producer";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { ContractSteps } from "@/components/ContractSteps";
import { KycForm } from "@/components/KycForm";
import { Loading } from "@/components/Loading";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/fees";
import { getSentDocs, KYC_DOCS, requiredDocs } from "@/lib/kyc";
import { CONTRACT, CONTRACT_VERSION } from "@/lib/contract";
import { getProducer, hasAcceptedContract } from "@/lib/producer";
import { getBalance, listPayouts } from "@/lib/sales";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Sacar", robots: { index: false } };

async function Withdraw() {
  const user = await requireUser("/produtor/saque");
  const producer = await getProducer(user);
  if (!producer) redirect("/produtor");
  const balance = await getBalance(producer);

  const summary = (
    <div className="card mt-4 p-5">
      <p className="text-sm text-muted">Disponível para saque</p>
      <p className="font-display text-4xl font-bold text-ink tabular-nums">{formatMoney(balance.available)}</p>
      <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm text-ink-2">
        <div className="flex justify-between">
          <dt>Libera depois dos eventos</dt>
          <dd className="tabular-nums">{formatMoney(balance.upcoming)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Saque em andamento</dt>
          <dd className="tabular-nums">{formatMoney(balance.requested)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Já sacado</dt>
          <dd className="tabular-nums">{formatMoney(balance.paid)}</dd>
        </div>
      </dl>
    </div>
  );

  // Primeiro o contrato: taxas, recebimento e quando o saque pode ser bloqueado.
  if (!hasAcceptedContract(producer)) {
    return (
      <>
        {summary}
        <p className="mt-6 text-ink-2">
          Antes de enviar os documentos e sacar, leia o contrato do produtor. São {CONTRACT.length} páginas
          curtas; o aceite fica na última.
        </p>
        <ContractSteps pages={CONTRACT} version={CONTRACT_VERSION} accept={acceptContractAction} />
      </>
    );
  }

  if (producer.kycStatus === "em_analise") {
    return (
      <>
        {summary}
        <div className="card mt-4 p-5">
          <h2 className="subtitle">Documentos em análise</h2>
          <p className="mt-2 text-ink-2">
            Recebemos suas fotos. A resposta chega por e-mail; assim que for aprovada, o saque é liberado aqui.
          </p>
        </div>
      </>
    );
  }

  if (producer.kycStatus !== "aprovado") {
    const sent = await getSentDocs(producer.id);
    return (
      <>
        {summary}
        <section className="mt-6">
          <h2 className="subtitle">Confirme sua identidade para sacar</h2>
          <p className="mt-1 text-sm text-ink-2">
            {producer.document.length === 14
              ? "Conta com CNPJ: envie o documento do responsável (frente e verso), a selfie segurando o documento e o documento da empresa."
              : "Conta com CPF: envie só o documento de identidade (frente e verso) e a selfie segurando o documento."}{" "}
            É uma vez só: as fotos ficam guardadas na sua conta, vistas apenas pela equipe do Colaja, e não
            serão pedidas de novo. Você já aceitou o{" "}
            <Link href="/termos-produtor" className="underline">
              contrato do produtor
            </Link>
            .
          </p>
          {producer.kycStatus === "recusado" && (
            <p role="alert" className="mt-3 rounded-xl bg-brand-soft p-3 text-sm text-ink">
              A última verificação não foi aprovada: {producer.kycNote}
            </p>
          )}
          <KycForm
            docs={requiredDocs(producer.document).map((kind) => ({ kind, ...KYC_DOCS[kind], sent: sent.includes(kind) }))}
            upload={uploadDocumentAction}
            submit={submitKycAction}
          />
        </section>
      </>
    );
  }

  const payouts = await listPayouts(producer);
  return (
    <>
      {summary}
      <ActionForm action={requestPayoutAction} resetOnOk className="card mt-4 p-5">
        <p className="mb-3 rounded-xl bg-brand-soft p-3 text-sm text-ink">
          Identidade verificada. Seus documentos estão guardados na conta e não precisam ser enviados de novo.
        </p>
        <h2 className="subtitle">Pedir saque</h2>
        <p className="mt-1 text-sm text-ink-2">
          O saque é do valor disponível inteiro, por Pix, para uma chave no nome do titular da conta.
        </p>
        <label htmlFor="pixKey" className="label mt-4">
          Chave Pix
        </label>
        <input
          id="pixKey"
          name="pixKey"
          required
          minLength={5}
          maxLength={140}
          autoComplete="off"
          placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"
          className="field"
        />
        <SubmitButton className="btn mt-4 w-full" disabled={balance.available <= 0}>
          {balance.available > 0 ? `Sacar ${formatMoney(balance.available)}` : "Sem valor disponível"}
        </SubmitButton>
        {balance.available <= 0 && balance.upcoming > 0 && (
          <p className="mt-2 text-sm text-muted">O valor de cada evento fica disponível depois que ele termina.</p>
        )}
      </ActionForm>

      {payouts.length > 0 && (
        <section className="mt-6">
          <h2 className="subtitle">Saques</h2>
          <ul className="card mt-3 divide-y divide-line">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-3 p-4">
                <span>
                  <span className="block font-display font-bold text-ink tabular-nums">{formatMoney(payout.amount_cents)}</span>
                  <span className="block text-sm text-muted">Pedido em {formatDateTime(payout.created_at)}</span>
                </span>
                <span className={`text-sm font-semibold ${payout.status === "pago" ? "text-good" : "text-ink-2"}`}>
                  {payout.status === "pago" ? "Pago" : "Em andamento"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function WithdrawPage() {
  return (
    <section className="mx-auto max-w-md py-6">
      <Link href="/produtor/vendas" className="btn-link text-sm">
        Vendas
      </Link>
      <h1 className="title">Sacar</h1>
      <Suspense fallback={<Loading />}>
        <Withdraw />
      </Suspense>
    </section>
  );
}
