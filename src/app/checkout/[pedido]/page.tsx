import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { couponAction, simulatePaymentAction } from "@/actions/checkout";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { CheckoutForm } from "@/components/CheckoutForm";
import { CopyButton } from "@/components/CopyButton";
import { AutoRefresh, Countdown } from "@/components/Countdown";
import { requireUser } from "@/lib/auth";
import { DEMO } from "@/lib/config";
import { getEventById } from "@/lib/events";
import { formatBRL } from "@/lib/fees";
import { paymentsAvailable } from "@/lib/gateway";
import { getOrder, type Order } from "@/lib/orders";
import { formatCpf } from "@/lib/text";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Pagamento", robots: { index: false } };

function Simulate({ order }: { order: Order }) {
  if (!DEMO) return null;
  return (
    <ActionForm action={simulatePaymentAction} className="mt-6 rounded-xl bg-brand-soft p-4">
      <input type="hidden" name="orderId" value={order.id} />
      <p className="mb-3 text-sm text-ink-2">
        Modo de demonstração: nenhum valor é cobrado. O botão abaixo faz o papel do banco avisando que o
        pagamento caiu.
      </p>
      <SubmitButton className="btn-quiet w-full">Simular pagamento confirmado</SubmitButton>
    </ActionForm>
  );
}

async function Checkout({ params }: { params: PageProps<"/checkout/[pedido]">["params"] }) {
  const { pedido } = await params;
  const user = await requireUser(`/checkout/${pedido}`);
  const order = await getOrder(user, pedido);
  const event = order && (await getEventById(order.eventId));
  if (!order || !event) notFound();

  const summary = (
    <div className="card p-4">
      <p className="font-display text-lg font-semibold text-ink">{event.title}</p>
      <p className="text-sm text-muted first-letter:uppercase">
        {formatDate(event.startsAt, event.timeZone)} · {event.venue}, {event.city}
      </p>
      <ul className="mt-3 space-y-1 border-t border-line pt-3 text-ink-2">
        {order.items.map((item) => (
          <li key={item.typeId}>
            <span>
              {item.quantity} × {item.typeName}{" "}
              <span className="text-muted">
                ({item.groupSize > 1 ? `${item.groupSize} pessoas, ` : ""}
                {item.lotName})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (order.status === "pendente") {
    return (
      <>
        <h1 className="title">Finalizar compra</h1>
        <p className="mt-2 mb-5 text-ink-2">
          Ingressos reservados por <Countdown until={order.expiresAt.toISOString()} />.
        </p>
        {summary}

        <ActionForm action={couponAction} className="mt-4">
          <input type="hidden" name="orderId" value={order.id} />
          {order.coupon ? (
            <p className="flex items-center justify-between gap-3 text-ink-2">
              <span>
                Cupom <strong className="text-ink">{order.coupon.code}</strong> aplicado ({order.coupon.percentOff}%)
              </span>
              <SubmitButton className="btn-link text-sm">Remover</SubmitButton>
            </p>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="code" className="sr-only">
                Cupom de desconto
              </label>
              <input id="code" name="code" placeholder="Cupom de desconto" autoCapitalize="characters" className="field" />
              <SubmitButton className="btn-quiet shrink-0">Aplicar</SubmitButton>
            </div>
          )}
        </ActionForm>

        <div className="mt-6">
          <CheckoutForm
            orderId={order.id}
            lines={order.items.map((item) => ({ priceCents: item.unitPriceCents, quantity: item.quantity }))}
            percentOff={order.coupon?.percentOff ?? 0}
            absorbFee={event.absorbFee}
            defaultName={user.name}
            defaultCpf={user.cpf ? formatCpf(user.cpf) : ""}
            paymentsAvailable={paymentsAvailable()}
          />
        </div>
        <p className="mt-4 text-sm text-muted">
          Ao pagar você concorda com os{" "}
          <Link href="/termos" className="underline">
            termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/reembolso" className="underline">
            política de reembolso
          </Link>
          .
        </p>
      </>
    );
  }

  if (order.status === "aguardando") {
    return (
      <>
        <AutoRefresh />
        <h1 className="title">{order.method === "pix" ? "Pague com Pix" : "Pagamento com cartão"}</h1>
        <p className="mt-2 mb-5 text-ink-2">
          Total de <strong className="text-ink">{formatBRL(order.totalCents)}</strong>. A reserva vale por{" "}
          <Countdown until={order.expiresAt.toISOString()} />.
        </p>
        {order.method === "pix" && order.pixCode ? (
          <div className="card p-5">
            <ol className="list-decimal space-y-1 pl-5 text-ink-2">
              <li>Copie o código abaixo.</li>
              <li>No app do seu banco, escolha Pix copia e cola.</li>
              <li>Volte para esta tela: o ingresso aparece sozinho.</li>
            </ol>
            <CopyButton text={order.pixCode} label="Copiar código Pix" className="btn mt-4 h-14 w-full text-lg" />
            <p className="mt-3 rounded-xl bg-surface-2 p-3 font-mono text-xs break-all text-ink-2">{order.pixCode}</p>
          </div>
        ) : (
          <div className="card p-5 text-ink-2">
            Os dados do cartão são digitados no formulário seguro do processador de pagamentos, que entra aqui
            quando o gateway for contratado. O Colaja não vê nem guarda o número do cartão.
          </div>
        )}
        <p role="status" className="mt-4 text-ink-2">
          Aguardando a confirmação do pagamento…
        </p>
        <Simulate order={order} />
      </>
    );
  }

  if (order.status === "pago") {
    return (
      <>
        <h1 className="title">{order.totalCents === 0 ? "Ingressos confirmados" : "Pagamento confirmado"}</h1>
        <p className="mt-2 mb-5 text-ink-2">
          Pedido {order.id}. Enviamos a confirmação para {user.email}.
        </p>
        {summary}
        <Link href="/ingressos" className="btn mt-6 w-full">
          Ver meus ingressos
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="title">{order.status === "reembolsado" ? "Pedido reembolsado" : "A reserva acabou"}</h1>
      <p className="mt-2 mb-5 text-ink-2">
        {order.status === "reembolsado"
          ? "O valor deste pedido foi devolvido e os ingressos foram cancelados."
          : "O tempo para pagar terminou e os ingressos voltaram para a venda. Nada foi cobrado."}
      </p>
      <Link href={`/e/${event.slug}`} className="btn w-full">
        Voltar ao evento
      </Link>
    </>
  );
}

export default function CheckoutPage({ params }: PageProps<"/checkout/[pedido]">) {
  return (
    <section className="mx-auto max-w-xl py-8">
      <Suspense fallback={<Loading />}>
        <Checkout params={params} />
      </Suspense>
    </section>
  );
}
