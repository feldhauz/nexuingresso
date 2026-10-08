import type { Metadata } from "next";
import { Loading } from "@/components/Loading";
import Link from "next/link";
import { Suspense } from "react";
import { registerProducerAction, updateProfileAction } from "@/actions/producer";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { getUser } from "@/lib/auth";
import { formatBRL } from "@/lib/fees";
import { EVENT_STATUS } from "@/lib/labels";
import { getProducer, listProducerEvents } from "@/lib/producer";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Venda seus ingressos",
  description: "Crie o evento, venda por Pix e cartão e valide a entrada pelo celular.",
};

const STEPS = [
  { title: "Crie o evento", text: "Nome, data, local, tipos de ingresso e lotes com virada por data ou quantidade." },
  { title: "Venda por Pix e cartão", text: "O comprador paga pelo celular e recebe o QR Code na hora. Evento gratuito não tem custo." },
  { title: "Valide na portaria", text: "O celular lê o QR Code e cada ingresso só entra uma vez." },
];

async function Panel() {
  const user = await getUser();
  const producer = user && (await getProducer(user));

  if (!user || !producer) {
    return (
      <>
        <p className="text-sm font-semibold tracking-widest text-brand-text uppercase">Para produtores</p>
        <h1 className="mt-2 font-display text-5xl leading-none font-bold tracking-tight text-ink md:text-6xl">
          Venda seus ingressos
        </h1>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card p-5">
              <p className="flex size-11 items-center justify-center rounded-xl bg-brand-soft font-display text-xl font-bold text-brand-text">
                {index + 1}
              </p>
              <h2 className="mt-4 font-display text-lg font-semibold text-ink">{step.title}</h2>
              <p className="mt-1 text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-prose text-ink-2">
          O valor das vendas é repassado depois do evento, para quem concluiu a verificação de identidade. As
          condições estão nos{" "}
          <Link href="/termos-produtor" className="text-brand-text underline">
            contrato do produtor
          </Link>
          .
        </p>

        <div className="card mt-8 max-w-xl p-5">
          <h2 className="subtitle">Cadastro de produtor</h2>
          {!user ? (
            <>
              <p className="mt-2 text-ink-2">Entre com seu e-mail para começar.</p>
              <Link href="/entrar?next=/produtor" className="btn mt-4">
                Entrar
              </Link>
            </>
          ) : (
            <ActionForm action={registerProducerAction} className="mt-4 grid gap-4">
              <div>
                <label htmlFor="name" className="label">
                  Nome da produtora ou o seu nome
                </label>
                <input id="name" name="name" required minLength={3} className="field" />
              </div>
              <div>
                <label htmlFor="document" className="label">
                  CPF ou CNPJ
                </label>
                <input id="document" name="document" required inputMode="numeric" className="field" />
              </div>
              <div>
                <label htmlFor="birthDate" className="label">
                  Data de nascimento (do responsável, se for CNPJ)
                </label>
                <input id="birthDate" name="birthDate" type="date" required className="field" />
              </div>
              <div>
                <label htmlFor="phone" className="label">
                  WhatsApp com DDD
                </label>
                <input id="phone" name="phone" required type="tel" autoComplete="tel" className="field" />
              </div>
              <p className="text-sm text-muted">
                É preciso ter 18 anos ou mais e um CPF ou CNPJ válido. Ao criar a conta você concorda com o{" "}
                <Link href="/termos-produtor" className="underline">
                  contrato do produtor
                </Link>
                .
              </p>
              <SubmitButton>Criar conta de produtor</SubmitButton>
            </ActionForm>
          )}
        </div>
      </>
    );
  }

  const events = await listProducerEvents(producer);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="title">{producer.name}</h1>
          <p className="text-muted">Painel do produtor</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {producer.status === "aprovado" && (
            <Link href={`/p/${producer.slug}`} className="btn-quiet">
              Ver perfil público
            </Link>
          )}
          <Link href="/produtor/eventos/novo" className="btn">
            Criar evento
          </Link>
        </div>
      </div>

      <Link
        href="/produtor/vendas"
        className="card mt-6 flex items-center justify-between gap-3 p-4 transition-colors duration-200 hover:bg-surface-2"
      >
        <span>
          <span className="block font-display text-lg font-semibold text-ink">Vendas e saque</span>
          <span className="block text-sm text-muted">
            Ingressos vendidos, nomes, camarotes e quanto você recebe
            {producer.kycStatus === "em_analise" && " · documentos em análise"}
            {producer.kycStatus === "recusado" && " · verificação precisa de ajuste"}
          </span>
        </span>
        <span className="btn h-11 shrink-0 px-4 text-sm">Abrir</span>
      </Link>

      {producer.status !== "aprovado" && (
        <p className="card mt-6 p-4 text-ink-2">
          {producer.status === "pendente"
            ? "Seu cadastro está em análise. Você já pode montar o evento; ele vai ao ar depois da aprovação."
            : "Seu cadastro não foi aprovado. Fale com o atendimento para revisar os dados."}
        </p>
      )}

      {events.length === 0 ? (
        <p className="mt-8 text-ink-2">Você ainda não criou nenhum evento.</p>
      ) : (
        <ul className="card mt-6 divide-y divide-line">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/produtor/eventos/${event.id}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 p-4 hover:bg-surface-2">
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold text-ink">{event.title}</span>
                  <span className="block text-sm text-muted first-letter:uppercase">
                    {formatDate(event.startsAt, event.timeZone)} · {EVENT_STATUS[event.status]}
                  </span>
                </span>
                <span className="text-right text-sm text-ink-2 tabular-nums">
                  <span className="block font-semibold text-ink">
                    {event.sold} de {event.capacity} ingressos
                  </span>
                  {event.producerCents > 0 && <span className="block">{formatBRL(event.producerCents)} a receber</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 max-w-xl">
        <h2 className="subtitle">Perfil público</h2>
        <p className="mt-1 text-sm text-ink-2">
          Aparece na página de cada evento e no seu perfil, onde as pessoas podem seguir você.
        </p>
        <ActionForm action={updateProfileAction} className="mt-4 grid gap-4">
          <div>
            <label htmlFor="profile-name" className="label">
              Nome
            </label>
            <input id="profile-name" name="name" required minLength={3} maxLength={120} defaultValue={producer.name} className="field" />
          </div>
          <div>
            <label htmlFor="profile-bio" className="label">
              Sobre
            </label>
            <textarea
              id="profile-bio"
              name="bio"
              rows={4}
              maxLength={600}
              defaultValue={producer.bio}
              placeholder="Quem são vocês e que tipo de evento fazem"
              className="field h-auto py-3"
            />
          </div>
          <div>
            <label htmlFor="profile-instagram" className="label">
              Instagram
            </label>
            <input id="profile-instagram" name="instagram" maxLength={80} defaultValue={producer.instagram} placeholder="@suaprodutora" className="field" />
          </div>
          <SubmitButton className="btn-quiet">Salvar perfil</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}

export default function ProducerPage() {
  return (
    <section className="py-8">
      <Suspense fallback={<Loading />}>
        <Panel />
      </Suspense>
    </section>
  );
}
