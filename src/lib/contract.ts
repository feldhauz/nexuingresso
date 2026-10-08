// Contrato do produtor. É o mesmo texto na página pública /termos-produtor e nas páginas que
// o produtor lê e aceita antes de enviar os documentos. Ao mudar qualquer cláusula, troque a
// versão: quem aceitou a anterior é chamado a aceitar de novo.
//
// Texto-base, a validar com advogado antes de ir ao ar.

export const CONTRACT_VERSION = "2026-10-07";
export const CONTRACT_DATE = "7 de outubro de 2026";

export type ContractPage = { title: string; intro: string; items: string[] };

export const CONTRACT: ContractPage[] = [
  {
    title: "O que é este contrato",
    intro:
      "O Colaja é uma plataforma que intermedeia a venda de ingressos. Este contrato vale entre o Colaja e você, produtor, a partir do aceite.",
    items: [
      "O evento é seu. Você responde pela realização, pela programação, pelo local, pela segurança e por tudo o que anunciar na página do evento.",
      "O Colaja mostra o evento, processa o pagamento, emite os ingressos e fornece a leitura na portaria. O Colaja não organiza nem realiza o evento.",
      "Perante o comprador, você é o fornecedor do evento. O Colaja responde pelo serviço de venda e emissão que presta.",
      "Para ter conta de produtor é preciso ter 18 anos ou mais e CPF ou CNPJ válido. Pessoa jurídica é representada por quem tem poderes para isso.",
    ],
  },
  {
    title: "Taxas e preço",
    intro: "O Colaja cobra uma taxa de serviço por ingresso pago. Não há mensalidade nem custo para criar evento.",
    items: [
      "A taxa é de 5% do valor do ingresso nas vendas por Pix e de 7% nas vendas por cartão, com mínimo de R$ 2,50 por ingresso pago.",
      "Ingresso gratuito e cortesia não pagam taxa.",
      "Por padrão a taxa é somada ao preço: o comprador vê e paga o valor final, e você recebe o preço que definiu. Se preferir, você pode absorver a taxa; nesse caso o comprador paga exatamente o seu preço e a taxa sai do seu repasse.",
      "Com cupom de desconto, a taxa é calculada sobre o preço já com o desconto.",
      "Mudanças na taxa são avisadas por e-mail com pelo menos 30 dias de antecedência e não atingem ingressos já vendidos.",
    ],
  },
  {
    title: "Recebimento e saque",
    intro: "O dinheiro das vendas fica retido até o evento acontecer. É isso que permite devolver o valor ao comprador se algo der errado.",
    items: [
      "O valor de cada evento fica disponível para saque depois que o evento termina.",
      "Para sacar é preciso concluir a verificação de identidade: foto de documento oficial, selfie segurando o documento e, para CNPJ, o documento da empresa.",
      "O saque é feito por Pix, a seu pedido, para uma chave em nome do titular da conta de produtor. Não pagamos a terceiros.",
      "Reembolsos, estornos e contestações de cartão (chargebacks) das suas vendas são descontados do seu saldo. Se o saldo não cobrir, você se compromete a devolver a diferença.",
      "Podemos pedir documentos complementares quando o volume de vendas ou algum indício de irregularidade justificar.",
    ],
  },
  {
    title: "Bloqueio de saque e retenção de valores",
    intro:
      "Para proteger quem comprou, o Colaja pode suspender as vendas, bloquear o saque e reter os valores de um evento, pelo tempo necessário para apurar, nas situações abaixo.",
    items: [
      "Indício de fraude: evento que não existe, local ou atrações que não confirmam o anunciado, uso de identidade ou documentos de terceiros, ou vendas com meios de pagamento de origem suspeita.",
      "Evento ou atividade contrária à lei, sem as licenças e alvarás exigidos, ou que coloque o público em risco.",
      "Cancelamento, adiamento ou mudança relevante do evento, até que os compradores sejam reembolsados ou confirmem a permanência.",
      "Volume anormal de reclamações, pedidos de reembolso ou contestações de cartão.",
      "Ordem judicial ou determinação de autoridade competente.",
      "Confirmada a irregularidade, os valores retidos são usados para reembolsar os compradores, a conta pode ser encerrada e os fatos podem ser comunicados às autoridades. Apurado que não houve irregularidade, o saque é liberado.",
      "Você é avisado por e-mail do bloqueio e do motivo, salvo quando a lei ou uma autoridade impedir o aviso, e pode apresentar esclarecimentos e documentos.",
    ],
  },
  {
    title: "Suas obrigações",
    intro: "Ao publicar um evento você declara que ele é real, lícito e que será realizado como anunciado.",
    items: [
      "Informar com verdade data, horário, local, atrações, classificação etária e o que cada ingresso inclui.",
      "Ter as autorizações, licenças, alvarás e condições de segurança exigidos para o evento e para o local, e respeitar a capacidade do espaço.",
      "Cumprir a lei da meia-entrada (Lei 12.933/2013), oferecendo e conferindo o benefício a quem tem direito.",
      "Respeitar a classificação etária e as regras de venda e consumo de bebida alcoólica.",
      "Recolher os tributos e os direitos autorais devidos pelo evento.",
      "Garantir a entrada de quem apresentar ingresso válido emitido pelo Colaja.",
      "Não usar a plataforma para evento inexistente, lavagem de dinheiro, golpe ou qualquer atividade ilícita.",
    ],
  },
  {
    title: "Cancelamento, adiamento e reembolso",
    intro: "O comprador tem direitos garantidos por lei, e este contrato não os reduz.",
    items: [
      "Evento cancelado: todos os compradores são reembolsados integralmente, inclusive da taxa de serviço. O custo é seu.",
      "Evento adiado ou com mudança de local ou de atração principal: o ingresso continua valendo, e quem não quiser ir tem direito ao reembolso integral.",
      "Direito de arrependimento: em compra pela internet o comprador pode desistir em até 7 dias da compra, desde que antes do início do evento (art. 49 do Código de Defesa do Consumidor).",
      "Os reembolsos são processados pelo Colaja com os valores do evento. Se já tiverem sido sacados, você se compromete a devolvê-los.",
      "Você deve avisar o Colaja de qualquer cancelamento ou mudança assim que decidir, para os compradores serem informados.",
    ],
  },
  {
    title: "Dados dos participantes",
    intro: "Você recebe dados pessoais de quem comprou (nome, e-mail e parte do CPF) para controlar a entrada. A Lei Geral de Proteção de Dados (Lei 13.709/2018) se aplica a você.",
    items: [
      "Use os dados só para realizar o evento: controle de entrada e comunicação sobre o próprio evento.",
      "É proibido vender, ceder ou usar a lista para publicidade sem o consentimento de cada pessoa.",
      "Guarde os dados com segurança e apague as cópias que fizer quando não forem mais necessárias.",
      "Os documentos que você envia na verificação são vistos apenas pela equipe do Colaja e guardados pelo prazo necessário para cumprir a lei e prevenir fraude.",
    ],
  },
  {
    title: "Vigência e disposições finais",
    intro: "Este contrato vale enquanto você tiver conta de produtor.",
    items: [
      "Você pode encerrar a conta quando quiser, desde que não haja evento à venda nem obrigação pendente com compradores.",
      "O Colaja pode suspender ou encerrar a conta em caso de descumprimento deste contrato ou da lei.",
      "Alterações neste contrato são avisadas por e-mail. Para continuar vendendo e sacando é preciso aceitar a nova versão.",
      "O aceite é feito de forma eletrônica e fica registrado com data, hora e versão do contrato.",
      "Aplica-se a lei brasileira. As disputas são resolvidas no foro competente na forma da lei.",
    ],
  },
];
