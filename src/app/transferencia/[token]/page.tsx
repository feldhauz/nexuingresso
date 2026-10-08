import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/actions/auth";
import { acceptTransferAction } from "@/actions/tickets";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { getUser } from "@/lib/auth";
import { getTransfer } from "@/lib/tickets";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Receber ingresso", robots: { index: false }, referrer: "no-referrer" };

async function Transfer({ params }: { params: PageProps<"/transferencia/[token]">["params"] }) {
  const { token } = await params;
  const offer = await getTransfer(token);

  if (!offer || offer.status !== "pendente") {
    return (
      <>
        <h1 className="title">Transferência indisponível</h1>
        <p className="mt-2 text-ink-2">
          {offer?.status === "aceita"
            ? "Este ingresso já foi aceito. Ele está em Meus ingressos de quem aceitou."
            : "O link não vale mais: a transferência foi cancelada ou o endereço está incompleto."}
        </p>
        <Link href="/ingressos" className="btn mt-6">
          Meus ingressos
        </Link>
      </>
    );
  }

  const user = await getUser();
  const path = `/transferencia/${token}`;

  return (
    <>
      <h1 className="title">Você recebeu um ingresso</h1>
      <p className="mt-2 text-ink-2">{offer.fromName} está transferindo para você:</p>
      <div className="card mt-4 p-4">
        <p className="text-sm font-medium text-brand-text first-letter:uppercase">
          {formatDate(offer.startsAt, offer.timeZone)}
        </p>
        <p className="font-display text-lg font-semibold text-ink">{offer.title}</p>
        <p className="text-sm text-muted">
          {offer.typeName} · {offer.venue}, {offer.city}
        </p>
      </div>
      {offer.isHalf && (
        <p className="mt-3 text-sm text-ink-2">
          Este ingresso é meia-entrada. Só aceite se você tem direito ao benefício: o comprovante é pedido na
          portaria.
        </p>
      )}

      {!user ? (
        <>
          <Link href={`/entrar?next=${encodeURIComponent(path)}`} className="btn mt-6 w-full">
            Entrar para aceitar
          </Link>
          <p className="mt-2 text-sm text-muted">Entre com {offer.toEmail}, o e-mail que recebeu o ingresso.</p>
        </>
      ) : user.email === offer.toEmail ? (
        <ActionForm action={acceptTransferAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <SubmitButton className="btn w-full">Aceitar ingresso</SubmitButton>
          <p className="mt-2 text-sm text-muted">Ao aceitar, o ingresso ganha um QR Code novo, só seu.</p>
        </ActionForm>
      ) : (
        <form action={signOutAction} className="mt-6">
          <p className="mb-3 text-ink-2">
            Você entrou como {user.email}, mas o ingresso foi enviado para {offer.toEmail}. Saia e entre com o
            e-mail certo, abrindo de novo o link que chegou nele.
          </p>
          <button type="submit" className="btn-quiet w-full">
            Sair desta conta
          </button>
        </form>
      )}
    </>
  );
}

export default function TransferPage({ params }: PageProps<"/transferencia/[token]">) {
  return (
    <section className="mx-auto max-w-md py-8">
      <Suspense fallback={<Loading />}>
        <Transfer params={params} />
      </Suspense>
    </section>
  );
}
