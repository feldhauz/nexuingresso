import type { Metadata } from "next";
import Link from "next/link";
import { Legal } from "@/components/Legal";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Termos de uso do comprador",
  description: "Regras de compra, entrada, transferência e reembolso de ingressos no Colaja, e como o comprador é protegido.",
};

export default function TermsPage() {
  return (
    <Legal title="Termos de uso do comprador" updated="7 de outubro de 2026">
      <p>
        Valem para quem compra ou recebe ingressos pelo Colaja. Quem vende segue o{" "}
        <Link href="/termos-produtor">contrato do produtor</Link>. Ao criar uma conta ou comprar, você concorda
        com estes termos.
      </p>

      <h2>1. Quem faz o quê</h2>
      <p>
        O evento é organizado pelo produtor indicado na página do evento. É ele quem responde pela realização,
        pela programação, pelo local, pela classificação etária e pelas regras de entrada. O Colaja intermedeia
        a venda: mostra o evento, processa o pagamento, emite o ingresso e fornece a leitura na portaria.
      </p>

      <h2>2. Como você é protegido</h2>
      <ul>
        <li>Todo evento passa por análise antes de ser publicado.</li>
        <li>
          O dinheiro da venda não vai direto para o produtor: fica retido e só pode ser sacado depois que o
          evento acontece.
        </li>
        <li>
          Para sacar, o produtor precisa confirmar a identidade com documento oficial e selfie; empresas
          enviam também o documento do CNPJ.
        </li>
        <li>
          Se houver indício de fraude, evento contrário à lei ou cancelamento, o Colaja pode suspender as
          vendas, bloquear o saque e usar os valores retidos para reembolsar quem comprou.
        </li>
        <li>O preço que aparece na tela é o que você paga. Não há cobrança extra depois.</li>
        <li>Seus dados de cartão não passam pelos servidores do Colaja.</li>
      </ul>

      <h2>3. Conta</h2>
      <p>
        A conta é o seu e-mail. O acesso é feito por um código enviado a esse e-mail, sem senha. Quem tem
        acesso ao seu e-mail tem acesso aos seus ingressos; mantenha-o protegido. Menores de 18 anos devem
        comprar com a autorização do responsável.
      </p>

      <h2>4. Preço e taxa de serviço</h2>
      <ul>
        <li>
          O preço exibido é sempre o valor final. Ele já inclui a taxa de serviço do Colaja: 5% do valor do
          ingresso no Pix e 7% no cartão, com mínimo de R$ 2,50 por ingresso pago. Em alguns eventos o
          produtor paga essa taxa e ela não entra no preço.
        </li>
        <li>
          Como a taxa muda conforme a forma de pagamento, o total de cada forma é mostrado antes de você
          pagar.
        </li>
        <li>Ingresso gratuito não tem taxa.</li>
      </ul>

      <h2>5. Compra</h2>
      <ul>
        <li>Ao escolher os ingressos, eles ficam reservados por 10 minutos. Sem pagamento nesse prazo, voltam à venda.</li>
        <li>O pedido só é confirmado quando o pagamento é aprovado. A confirmação chega por e-mail.</li>
        <li>Cada evento tem um limite de ingressos por CPF, informado na página.</li>
        <li>
          Meia-entrada é para quem tem direito por lei e exige comprovação na portaria. Sem ela, a entrada
          pode ser recusada.
        </li>
      </ul>

      <h2>6. Ingresso e entrada</h2>
      <ul>
        <li>Cada ingresso tem um QR Code único e vale uma entrada. Depois de lido, não entra de novo.</li>
        <li>Leve documento oficial com foto. O produtor pode conferir a idade mínima do evento.</li>
        <li>Não compartilhe imagem do QR Code. Quem apresentar o código primeiro é quem entra.</li>
        <li>
          Em camarote ou mesa, quem comprou cadastra o nome de cada convidado e gera um QR Code por pessoa.
          Depois de gerados, os nomes não mudam.
        </li>
      </ul>

      <h2>7. Transferência</h2>
      <p>
        Você pode transferir um ingresso para o e-mail de outra pessoa, sem custo, até 2 horas antes do evento
        e no máximo 2 vezes por ingresso. Ao iniciar a transferência, o seu QR Code deixa de valer; ao aceitar,
        a outra pessoa recebe um código novo. O Colaja não intermedeia pagamento entre vocês: qualquer valor
        combinado é de responsabilidade de quem combinou. Compre apenas pelo Colaja ou receba por transferência
        dentro do site: ingresso oferecido por print ou fora da plataforma pode já ter sido usado.
      </p>

      <h2>8. Cancelamento e reembolso</h2>
      <ul>
        <li>Você pode desistir da compra em até 7 dias, desde que antes do início do evento.</li>
        <li>Evento cancelado: reembolso integral, incluindo a taxa de serviço.</li>
        <li>Evento adiado ou com mudança relevante: o ingresso continua valendo, ou você pede o reembolso integral.</li>
      </ul>
      <p>
        Os detalhes e o passo a passo estão na <Link href="/reembolso">política de reembolso</Link>.
      </p>

      <h2>9. Uso indevido</h2>
      <p>
        Podemos cancelar pedidos e suspender contas em caso de fraude, uso de meio de pagamento de terceiros
        sem autorização, tentativa de burlar limites de compra, revenda por preço acima do valor pago ou
        descumprimento destes termos.
      </p>

      <h2>10. Privacidade</h2>
      <p>
        O que coletamos e para quê está na <Link href="/privacidade">política de privacidade</Link>.
      </p>

      <h2>11. Seus direitos e contato</h2>
      <p>
        Nada nestes termos reduz os direitos que o Código de Defesa do Consumidor garante a você. Dúvidas,
        reclamações e denúncia de evento suspeito: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </Legal>
  );
}
