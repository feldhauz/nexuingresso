import type { Metadata } from "next";
import { Legal } from "@/components/Legal";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Política de reembolso",
  description: "Quando o ingresso comprado no Colaja pode ser reembolsado e como pedir.",
};

export default function RefundPage() {
  return (
    <Legal title="Política de reembolso" updated="7 de outubro de 2026">
      <h2>Não vai mais? Transfira primeiro</h2>
      <p>
        O caminho mais rápido para quem desistiu é transferir o ingresso para outra pessoa: é grátis, feito em
        Meus ingressos e vale até 2 horas antes do evento.
      </p>

      <h2>Direito de arrependimento</h2>
      <p>
        Em compra pela internet, você pode desistir em até 7 dias corridos a partir da compra, desde que o
        pedido de reembolso seja feito antes do início do evento. Nesse caso devolvemos o valor integral,
        incluindo a taxa de serviço.
      </p>

      <h2>Evento cancelado ou adiado</h2>
      <ul>
        <li>Evento cancelado: o valor integral é devolvido a todos os compradores.</li>
        <li>Evento adiado ou com mudança de local: o ingresso continua valendo, e quem não puder ir na nova data pode pedir o reembolso integral.</li>
      </ul>

      <h2>Como pedir</h2>
      <ul>
        <li>Abra o ingresso em Meus ingressos e toque em “Pedir reembolso”. Só quem comprou pode pedir.</li>
        <li>O reembolso vale para o pedido inteiro e cancela todos os ingressos dele.</li>
        <li>Ingresso já usado na portaria não é reembolsado.</li>
        <li>A resposta chega por e-mail.</li>
      </ul>

      <h2>Como o valor volta</h2>
      <p>
        A devolução é feita pela mesma forma de pagamento da compra. No Pix, o valor volta para a conta de
        origem. No cartão, o estorno aparece na fatura conforme o prazo da operadora.
      </p>

      <h2>Fora desses casos</h2>
      <p>
        Passados os 7 dias, o reembolso depende da política do produtor do evento. Escreva para{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> informando o número do pedido.
      </p>
    </Legal>
  );
}
