import type { Metadata } from "next";
import Link from "next/link";
import { Legal } from "@/components/Legal";
import { CONTACT_EMAIL } from "@/lib/config";
import { CONTRACT, CONTRACT_DATE, CONTRACT_VERSION } from "@/lib/contract";

export const metadata: Metadata = {
  title: "Contrato do produtor",
  description: "Taxas, recebimento, bloqueio de saque e obrigações de quem vende ingressos no Colaja.",
};

export default function ProducerTermsPage() {
  return (
    <Legal title="Contrato do produtor" updated={CONTRACT_DATE}>
      <p>
        Vale para quem vende ingressos no Colaja. Quem compra encontra as regras nos{" "}
        <Link href="/termos">termos de uso do comprador</Link>. Versão {CONTRACT_VERSION}.
      </p>
      {CONTRACT.map((page, index) => (
        <section key={page.title}>
          <h2>
            {index + 1}. {page.title}
          </h2>
          <p>{page.intro}</p>
          <ul>
            {page.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <h2>Contato</h2>
      <p>
        Dúvidas sobre este contrato: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </Legal>
  );
}
