import type { Metadata } from "next";
import { Legal } from "@/components/Legal";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados o Colaja coleta, para que usa e como você pede acesso ou exclusão.",
};

export default function PrivacyPage() {
  return (
    <Legal title="Política de privacidade" updated="7 de outubro de 2026">
      <p>Coletamos só o que é preciso para vender o ingresso e liberar a sua entrada.</p>

      <h2>Dados que coletamos</h2>
      <ul>
        <li>
          <strong>E-mail</strong>: é a sua conta. Usado para o código de acesso, a confirmação da compra e os
          avisos de transferência e reembolso.
        </li>
        <li>
          <strong>Nome e CPF</strong>: pedidos na compra, para identificar o titular do ingresso, aplicar o
          limite por CPF e prevenir fraude.
        </li>
        <li>
          <strong>Compras e ingressos</strong>: pedidos, valores, transferências e o horário de entrada no
          evento.
        </li>
        <li>
          <strong>Dados de produtor</strong>: nome, CPF ou CNPJ, data de nascimento e telefone de quem se
          cadastra para vender. Para liberar o repasse, também fotos de documento oficial, selfie com o
          documento e, para empresa, o documento do CNPJ. Essas imagens são vistas apenas pela equipe do
          Colaja, para conferir a identidade e prevenir fraude. O CNPJ é consultado na base pública da
          Receita Federal.
        </li>
      </ul>
      <p>
        Dados de cartão não passam pelos servidores do Colaja: são digitados no formulário do processador de
        pagamentos.
      </p>

      <h2>Para que usamos</h2>
      <ul>
        <li>Executar a compra e emitir o ingresso (execução de contrato).</li>
        <li>Validar a entrada na portaria e prevenir fraude (legítimo interesse).</li>
        <li>Cumprir obrigações fiscais e responder a autoridades (obrigação legal).</li>
      </ul>
      <p>
        Não enviamos publicidade por e-mail sem o seu pedido e não vendemos dados. Se você seguir um produtor,
        avisamos por e-mail quando ele publicar um evento novo; para parar, deixe de seguir no perfil dele.
      </p>

      <h2>Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>O produtor do evento</strong> vê o nome, o e-mail e parte do CPF de quem tem ingresso, para
          controlar a entrada.
        </li>
        <li>
          <strong>Processador de pagamentos e serviço de envio de e-mail</strong>, na medida necessária para
          cobrar e avisar você.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Usamos um único cookie, que mantém a sua sessão aberta depois do login. Não há cookies de publicidade
        nem de rastreamento.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Dados de compra ficam guardados pelo prazo exigido pela legislação fiscal e de defesa do consumidor.
        Códigos de acesso vencem em 10 minutos e sessões em 30 dias.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir confirmação, acesso, correção, portabilidade ou exclusão dos seus dados, nos termos da
        Lei Geral de Proteção de Dados. Escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> a
        partir do e-mail da sua conta. Dados que a lei nos obriga a manter não podem ser excluídos antes do
        prazo.
      </p>
    </Legal>
  );
}
