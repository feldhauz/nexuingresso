# NexuIngresso — Plano de Pagamentos (AbacatePay) e Conformidade Legal

> Versão 0.1 — out/2026. Documento de planejamento: **antes de lançar, validar com advogado (direito do consumidor) e contador.** As informações sobre a AbacatePay vêm da documentação e da página de preços públicas; confirme com o comercial deles antes de integrar.

---

## 1. Decisões de produto já tomadas

| Decisão | Definição |
|---|---|
| Gateway | **AbacatePay**, conta no **CNPJ da NexuIngresso** |
| Eventos gratuitos | **Não serão oferecidos.** Todo evento precisa ter ao menos um ingresso pago (preço mínimo sugerido: R$ 10,00) |
| Taxa de serviço | **8% no Pix** e **9% no cartão** (ver §3) |
| Transferência de ingresso | **Gratuita**, pela própria plataforma, com rastreabilidade (obrigatória pelo Decreto 13.108/2026) |
| Revenda entre usuários | Somente **dentro da plataforma** e com **teto no preço de face** (ver §5.4) |

---

## 2. AbacatePay — o que usar

### 2.1 Pré-requisitos da conta
- **CNPJ obrigatório.** A AbacatePay só abre conta para pessoa jurídica.
- Cadastrar o projeto e passar pela validação de "operação suportada". Venda de ingressos não está na lista de atividades proibidas (rifas, apostas, adulto, etc.), mas **declare claramente que é uma plataforma de ingressos que repassa valores a produtores** e peça confirmação por escrito.
- Ambiente de **desenvolvimento (sandbox)** primeiro: chave de dev + `simulate-payment` para testar sem dinheiro real.

### 2.2 Taxas da AbacatePay (custo da NexuIngresso)
| Operação | Custo |
|---|---|
| Pix recebido | **R$ 0,80** por transação |
| Cartão à vista | **3,50% + R$ 0,60** |
| Cartão 2–6x | **4,00% + R$ 0,60** |
| Cartão 7–12x | **4,50% + R$ 0,60** |
| Boleto | R$ 2,50 (não vamos usar no início) |
| Saque/Payout Pix (até 20/mês) | R$ 0,80 cada |
| Saque/Payout Pix (a partir do 21º) | R$ 2,50 cada |
| Disputa MED (Pix) | sem taxa, mas **disputas acima de 3% do volume podem encerrar a conta** |

Sem mensalidade.

### 2.3 Recursos da API que vamos usar
| Necessidade | Recurso AbacatePay |
|---|---|
| Pix no próprio site (QR + copia-e-cola) | **Checkout Transparente / `pixQrCode/create`** com `expiresIn` = tempo da reserva |
| Consultar status | `pixQrCode/check` (backup; o principal é o webhook) |
| Cartão parcelado | **Checkout** com número máximo de parcelas |
| Cliente | `customer/create` (nome, e-mail, CPF, celular) |
| Confirmação de pagamento | **Webhooks**: `transparent.completed`, `checkout.completed` |
| Reembolso | `refund` + webhooks `*.refunded` |
| Disputas | webhooks `*.disputed` / `*.lost` → bloquear ingresso |
| Repasse ao produtor | **Payout / transferência Pix** + webhooks `payout.completed` / `payout.failed` |
| Testes | `simulate-payment` no modo dev |

**Segurança do webhook:** validar o `webhookSecret` na query **e** a assinatura HMAC do corpo; processar de forma **idempotente** (guardar o ID do evento e ignorar repetidos).

### 2.4 Limitação importante: sem split nativo
A AbacatePay não divulga split de pagamento. Então o fluxo é:

```
Comprador ──paga──▶ Conta AbacatePay (CNPJ NexuIngresso)
                           │
                           ├─ fica na plataforma: taxa de serviço − custo do gateway
                           │
                           └─ payout Pix ──▶ Produtor (após o evento, ver §4)
```

Consequências e cuidados:
1. **Contrato com o produtor** (termo de adesão) dizendo que a NexuIngresso **intermedia a venda e recebe em nome do produtor**, com prazo de repasse, retenção para reembolsos e chargebacks, e a responsabilidade do produtor pelo evento.
2. **Separação contábil:** o valor do ingresso é **do produtor** (repasse de terceiros). **Receita da NexuIngresso é só a taxa de serviço.** Isso reduz a base de impostos. Combinar com o contador.
3. **Regulação do Banco Central:** uma plataforma que só intermedeia e repassa valores, com volume pequeno, em geral não precisa de autorização como instituição de pagamento. Isso muda com o crescimento. Rever com advogado quando o volume subir e, se for o caso, migrar para um gateway com **split/subcontas** (Asaas, Pagar.me, Mercado Pago).
4. **Chave Pix do produtor:** só aceitar chave **com titularidade igual ao CPF/CNPJ cadastrado** (antifraude e KYC).

---

## 3. Modelo de taxas da NexuIngresso

### 3.1 Regra
- **Pix:** taxa de serviço de **8%** sobre o valor do ingresso.
- **Cartão:** taxa de serviço de **9%** sobre o valor do ingresso (já inclui o custo médio do cartão).
- **Parcelamento acima de 6x (opcional):** acréscimo de parcelamento mostrado antes do pagamento.
- **Taxa mínima:** R$ 2,00 por ingresso.
- O produtor escolhe: **repassar ao comprador** (padrão) ou **absorver** (descontada do repasse).

> **É legal cobrar diferente no Pix e no cartão?** Sim. A **Lei 13.455/2017** permite preço diferenciado conforme o meio de pagamento, desde que o consumidor seja informado de forma clara.

### 3.2 Simulação de margem (ingresso de R$ 100,00, taxa repassada ao comprador)
| Meio | Comprador paga | Custo AbacatePay | Produtor recebe | **Margem NexuIngresso** |
|---|---|---|---|---|
| Pix | R$ 108,00 | R$ 0,80 | R$ 100,00 | **R$ 7,20** |
| Cartão à vista | R$ 109,00 | R$ 4,42 | R$ 100,00 | **R$ 4,58** |
| Cartão 2–6x | R$ 109,00 | R$ 4,96 | R$ 100,00 | **R$ 4,04** |
| Cartão 7–12x | R$ 109,00 | R$ 5,51 | R$ 100,00 | **R$ 3,49** |

Ingresso de **R$ 30,00** no Pix: taxa R$ 2,40, custo R$ 0,80, margem **R$ 1,60**. Por isso a taxa mínima de R$ 2,00 e o preço mínimo de R$ 10,00.

**Recomendação:** colocar no checkout um **selo "Pague com Pix e economize"**. O Pix dá quase o dobro de margem e não tem chargeback de cartão.

Dos valores acima ainda saem os **impostos sobre a taxa** (ISS + Simples ou Lucro Presumido) e o **custo dos payouts** (R$ 0,80 por repasse, diluído entre todos os ingressos do evento).

### 3.3 Cortesias
Como não haverá eventos gratuitos, cortesias são **ingressos emitidos pelo produtor dentro de um evento pago**:
- Limite de **até 10% da carga** do evento (configurável pelo admin).
- Sem pagamento do comprador. Cobrar **R$ 1,00 por cortesia emitida**, descontado do repasse (cobre infraestrutura e evita abuso).

---

## 4. Repasse ao produtor (fluxo financeiro)

| Etapa | Regra |
|---|---|
| Vendas | Entram na conta AbacatePay da NexuIngresso; o painel do produtor mostra o **saldo bloqueado** |
| Repasse padrão | **D+2 úteis após o evento**, via payout Pix para a chave validada do produtor |
| Antecipação (F2) | Até **50% do saldo antes do evento**, para produtores com histórico, com taxa de antecipação |
| Reserva de segurança | Reter **10% do saldo por 30 dias** após o evento (chargebacks/MED), liberado depois |
| Reembolsos | Abatidos do saldo do produtor; se não houver saldo, o produtor fica devedor (cláusula contratual) |

Por que repassar só depois do evento: se o evento for **cancelado ou adiado**, o Decreto 13.108/2026 obriga a **devolução integral, inclusive das taxas**. Se o dinheiro já foi repassado, a plataforma assume o prejuízo e responde de forma solidária perante o consumidor (CDC, arts. 7º e 25).

---

## 5. Conformidade legal

### 5.1 Leis e normas aplicáveis
| Norma | O que exige / impacto no sistema |
|---|---|
| **CDC – Lei 8.078/1990** | Informação clara, proibição de práticas abusivas, responsabilidade solidária da cadeia de fornecimento |
| **CDC art. 49 – Direito de arrependimento** | Compra online pode ser cancelada em **até 7 dias** da compra, com **devolução integral (ingresso + taxa)** |
| **Decreto 13.108/2026** (DOU 01/09/2026) – venda de ingressos | Ver §5.2. Vale para eventos culturais, shows e festas. **Eventos esportivos seguem a Lei Geral do Esporte** |
| **Decreto 7.962/2013** – comércio eletrônico | Mostrar no site **razão social, CNPJ, endereço e contato**; resumo do contrato antes da compra; confirmação imediata; canal de atendimento |
| **Decreto 11.034/2022** – SAC | Canal de atendimento acessível, resposta em até 7 dias corridos |
| **Lei 13.455/2017** | Permite preço diferente para Pix e cartão, desde que informado |
| **Lei 12.933/2013 + Decreto 8.537/2015** – meia-entrada | Meia para estudantes, PcD (+ acompanhante), jovens de baixa renda (ID Jovem) e idosos (Estatuto da Pessoa Idosa); **cota mínima de 40%** dos ingressos; comprovação na entrada |
| **Lei 10.741/2003** (Estatuto da Pessoa Idosa) | Meia-entrada para 60+ (fora da cota de 40%) |
| **Lei 14.597/2023** (Lei Geral do Esporte), art. 166 | Vender ingresso **esportivo** acima do preço de face é **crime** (1 a 2 anos de reclusão) |
| **LGPD – Lei 13.709/2018** | Base legal para os dados, política de privacidade, encarregado (DPO), direitos do titular, segurança |
| **ECA – Lei 8.069/1990** | Classificação etária obrigatória; bloquear compra por menor em evento +18 (confirmação de idade + conferência na portaria) |
| **Marco Civil – Lei 12.965/2014** | Guardar **logs de acesso por 6 meses** |
| **Lei 13.146/2015** (Estatuto da PcD) | Site acessível; reserva de espaços para PcD em locais com assento |
| **STJ – REsp 1.737.428** (embargos de 2020) | A taxa de conveniência é válida **se informada de forma clara e prévia, com o preço discriminado** |

### 5.2 Decreto 13.108/2026: requisitos e como o sistema atende
| Exigência do decreto | Implementação |
|---|---|
| Preço do ingresso e **todas as taxas** informados de forma **clara, destacada e discriminada** em todas as etapas, do anúncio ao fim da compra, com o **valor total** | Página do evento já mostra "R$ 100,00 + R$ 8,00 taxa = **R$ 108,00**"; mesmo detalhamento no carrinho, no checkout, no e-mail e no comprovante. Proibido mostrar só o preço sem a taxa |
| **Reserva temporária** suficiente para preencher dados e concluir a compra | Reserva de **15 minutos** com cronômetro visível; QR Pix com `expiresIn` igual ao tempo restante; ingresso volta ao estoque se expirar |
| **Preço congelado durante a reserva**, mesmo que vire o lote ou mude o preço | O preço é gravado no item reservado; a virada de lote não altera reservas abertas |
| **Fila virtual** com posição e tempo estimado em eventos de alta demanda | Módulo de fila (F2), ativado pelo admin ou pelo produtor, com posição e estimativa em tempo real |
| Medidas contra **compras massivas e robôs** | Limite por CPF e por pedido, captcha, rate limit por IP/dispositivo, bloqueio de cartões e CPFs suspeitos, verificação de e-mail/celular |
| **Transferência gratuita** de titularidade, com rastreabilidade e autenticidade | Botão "Transferir" na carteira; o novo titular aceita com conta e CPF; **QR antigo é invalidado e um novo é gerado**; histórico guardado |
| **Canal fácil de arrependimento** | Botão "Cancelar compra" em "Meus ingressos" durante os 7 dias, com estorno automático (Pix devolvido / cartão estornado) |
| **Cancelamento, adiamento ou mudança relevante**: o consumidor escolhe entre **nova data, crédito ou reembolso integral (com taxas)** | Fluxo "Evento alterado": e-mail + tela de escolha das 3 opções; reembolso integral via API |
| Revenda secundária deve mostrar que **não é canal oficial**, o **preço de face** e o valor acima dele | Nossa revenda é oficial e com teto no preço de face (§5.4), sem ágio; o preço de face sempre aparece |
| **Guardar dados e permitir auditoria** pelos órgãos de defesa do consumidor (Procon, Senacon) | Logs imutáveis de reservas, fila, preços, vendas, transferências e reembolsos; exportação para auditoria |

### 5.3 Política de reembolso (texto base para os Termos)
1. **Arrependimento:** até 7 dias após a compra → reembolso de **100% (ingresso + taxa)**. Se o evento acontecer antes de 7 dias da compra, o arrependimento vale até o início do evento. **Validar com advogado** a regra de corte (ex.: até 48h antes), porque o art. 49 não prevê exceção expressa.
2. **Cancelamento/adiamento pelo produtor:** reembolso **integral com taxas**, ou nova data, ou crédito, à escolha do consumidor.
3. **Depois de 7 dias, sem alteração do evento:** sem reembolso obrigatório. O comprador pode **transferir** (grátis) ou **revender** na plataforma.
4. Prazo de devolução: Pix em até **2 dias úteis**; cartão conforme a fatura (1–2 faturas).

### 5.4 Revenda oficial (F2): modelo 100% legal
- Revenda **apenas dentro da NexuIngresso**. O ingresso é reemitido para o comprador e o do vendedor é invalidado.
- **Preço máximo = preço de face pago** (ingresso + taxa original). **Sem ágio, em nenhum tipo de evento.** Assim evitamos cambismo (crime em eventos esportivos) e práticas abusivas.
- Taxa de revenda cobrada do **novo comprador** (8%/9%, a mesma regra); o vendedor recebe o valor de face.
- O produtor pode **desativar** a revenda no seu evento.
- Ingresso de meia-entrada revendido continua exigindo comprovação na entrada.

### 5.5 Meia-entrada no sistema
- O produtor cadastra a meia; o sistema **alerta se a cota de meia ficar abaixo de 40%** da carga.
- No checkout, o comprador marca o tipo de benefício (estudante, PcD, ID Jovem, idoso, professor se houver lei local) e aceita que **precisa apresentar o documento na entrada**.
- A meia é calculada sobre o **preço da inteira do mesmo lote**. Proibido "meia" que é na verdade o preço cheio.

### 5.6 Página institucional obrigatória (rodapé)
- Razão social, **CNPJ**, endereço, e-mail e telefone/WhatsApp de atendimento
- Termos de Uso (comprador), Termos do Produtor, Política de Privacidade, Política de Reembolso, Política de Meia-Entrada, Política de Cookies
- Link do canal de arrependimento e do SAC
- Nome do encarregado de dados (DPO) e e-mail para LGPD

---

## 6. Abertura e estrutura da empresa (checklist)

- [ ] **CNPJ**. Com contador, avaliar Simples Nacional (Anexo III ou V, conforme o Fator R) ou Lucro Presumido
- [ ] **CNAEs sugeridos** (validar com contador): 7490-1/04 (intermediação e agenciamento de serviços e negócios), 6319-4/00 (portais e provedores de conteúdo na internet), 7990-2/00 (reservas e outros serviços de turismo)
- [ ] **Inscrição municipal** e emissão de **NFS-e da taxa de serviço** (o ingresso em si é do produtor)
- [ ] Conta bancária PJ + conta AbacatePay validada
- [ ] Registro de **marca "NexuIngresso" no INPI**
- [ ] Termos jurídicos revisados por advogado (consumidor + LGPD)
- [ ] Domínio .com.br no CNPJ (Registro.br)
- [ ] Política de KYC de produtores: documento com foto, CPF/CNPJ, comprovante de endereço, chave Pix de mesma titularidade

---

## 7. Arquitetura técnica do pagamento

### 7.1 Estados do pedido
```
reservado ──(pagamento iniciado)──▶ aguardando_pagamento
   │                                      │
   └──(15 min expira)──▶ expirado         ├──(webhook completed)──▶ pago ──▶ ingressos emitidos (QR)
                                          │                           │
                                          └──(QR expira)──▶ expirado  ├──(arrependimento/cancelamento)──▶ reembolsado
                                                                      ├──(webhook disputed)──▶ em_disputa (QR bloqueado)
                                                                      └──(webhook lost)──▶ estornado (QR cancelado)
```

### 7.2 Estados do ingresso
`ativo` → `transferido` (novo QR para o novo titular) · `em_revenda` → `revendido` · `utilizado` (check-in) · `cancelado` · `bloqueado` (disputa)

### 7.3 Tabelas principais (rascunho)
- `users` (CPF, nome, e-mail, celular, data de nascimento, consentimentos LGPD)
- `producers` (CPF/CNPJ, KYC status, chave Pix validada, taxa personalizada, absorve_taxa)
- `events` (status, classificação etária, local, datas, revenda_habilitada, fila_habilitada)
- `ticket_types` / `batches` (preço, quantidade, início/fim, tipo inteira/meia/cortesia)
- `reservations` (expires_at, preço congelado)
- `orders` (valor ingresso, taxa, total, meio de pagamento, parcelas, abacatepay_id, status)
- `tickets` (titular, QR hash, status, histórico)
- `ticket_transfers` / `resale_listings`
- `refunds` (motivo: arrependimento/cancelamento/disputa)
- `payouts` (produtor, valor, abacatepay_payout_id, status)
- `ledger_entries` (livro-razão: cada centavo, entrada e saída)
- `webhook_events` (id único, payload, processado_em) → idempotência
- `audit_logs` (imutável, para Procon/Senacon e Marco Civil)

### 7.4 Regras técnicas críticas
1. Tudo em **centavos (inteiros)**. Nunca usar float para dinheiro.
2. **Nunca emitir ingresso pela volta do usuário à página.** Só pelo **webhook** validado.
3. Reserva de estoque com **transação/lock no banco**, para não vender acima da carga.
4. QR Code com **ID assinado (HMAC)**. Na F2, QR **dinâmico/rotativo** no app.
5. Conciliação diária: comparar o livro-razão com o extrato da AbacatePay.
6. Chaves da API só no servidor (variáveis de ambiente), nunca no front.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Evento cancelado depois do repasse | Repasse só depois do evento + reserva de 10%/30 dias + contrato com o produtor |
| Chargeback/MED > 3% (encerramento da conta AbacatePay) | Antifraude, limite por CPF, priorizar Pix, bloqueio de QR em disputa |
| Produtor golpista | KYC, aprovação manual dos primeiros eventos, repasse pós-evento |
| AbacatePay mudar regras ou recusar o modelo | Camada `PaymentProvider` abstrata no código para trocar de gateway sem reescrever |
| Autuação do Procon | Conformidade com o Decreto 13.108 desde o MVP + logs de auditoria |
| Crescimento exigir regulação do BC | Monitorar volume e migrar para gateway com split/subcontas |

---

## Fontes
- [AbacatePay — Preços e taxas](https://www.abacatepay.com/pricing) · [Docs: Taxas](https://docs.abacatepay.com/pages/concepts/taxas) · [Webhooks](https://docs.abacatepay.com/pages/webhooks) · [Criar cobrança](https://docs.abacatepay.com/api-reference/criar-uma-nova-cobran%C3%A7a) · [Criar QRCode Pix](https://docs.abacatepay.com/api-reference/criar-qrcode-pix) · [Parcelado no cartão](https://docs.abacatepay.com/pages/payment/installments) · [Indo para produção](https://docs.abacatepay.com/pages/production) · [Termos de uso](https://www.abacatepay.com/termos)
- [Decreto 13.108/2026 — Planalto](http://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13108.htm) · [Ministério da Justiça](https://www.gov.br/mj/pt-br/assuntos/noticias-1/decreto-estabelece-novas-regras-para-compra-e-revenda-de-ingressos-para-eventos) · [Conjur](https://conjur.com.br/2026-set-17/novas-regras-mudam-relacao-entre-consumidor-e-plataformas-de-ingressos/) · [Morais Andrade](https://moraisandrade.com/site-2026/consumidor-novas-regras-para-a-comercializacao-de-ingressos-ja-estao-em-vigor-decreto-no-13-108-2026-amplia-as-obrigacoes-de-produtores-comercializadores-e-plataformas-de-revenda-de-ingressos-ente/)
- [STJ — taxa de conveniência (AASP)](https://www.aasp.org.br/?p=40380) · [Gazeta do Povo — embargos](https://www.gazetadopovo.com.br/opiniao/artigos/stj-acerta-ao-permitir-taxa-de-conveniencia-na-compra-de-ingressos-on-line/)
- [Lei 12.933/2013 (meia-entrada)](https://h-internet.mprj.mp.br/documents/20184/238715/Lei_n_12933-13.pdf) · [Cambismo e Lei Geral do Esporte](https://emporiododireito.com.br/leitura/a-atipicidade-do-cambismo-em-eventos-nao-esportivos)
