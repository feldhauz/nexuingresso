# Planejamento do site de venda de ingressos

> Versão 0.1 — 07/10/2026. Complementa o [MAPA_FUNCIONALIDADES.md](MAPA_FUNCIONALIDADES.md): o mapa diz **o que** o produto faz; este documento diz **em que ordem, como e com quais riscos**.
>
> Nome escolhido em 07/10/2026: **Colaja**. "NexuIngresso" no mapa e no nome do repositório é o título de trabalho antigo; "a plataforma" neste documento é o Colaja.

---

## 1. Ponto de partida

| Item | Situação |
|---|---|
| Código | Nenhum. O repositório tem só documentação e skills. |
| Produto | Mapa de funcionalidades com 3 fases (MVP, F2, F3) e proposta de preço (7%, 5% no Pix). |
| Concorrência | Ingresso Fly analisada; "Bump" não identificada; benchmark de taxas de 4 plataformas. |
| Stack sugerida | Next.js, PostgreSQL, Prisma, gateway com Pix + cartão + split, Vercel, Resend. |
| Nome, marca, domínio | Em aberto. |

---

## 2. Decisões que travam o resto

Estas cinco precisam de resposta antes da primeira linha de código, porque mudam o banco de dados, o contrato com o gateway ou a identidade visual.

| # | Decisão | Por que trava | Recomendação |
|---|---|---|---|
| 1 | **Nome e domínio** | Marca, logo, e-mails transacionais, cadastro no gateway e termos de uso levam o nome. | Fechar em paralelo à semana 1. Critérios na seção 3. |
| 2 | **Cidade e nicho de lançamento** | Define a vitrine, o tom visual e quem são os 3 primeiros produtores. | Uma cidade e um nicho (ex.: festas universitárias). Vitrine vazia em dez cidades vende menos que cheia em uma. |
| 3 | **Gateway de pagamento** | Define o modelo financeiro inteiro (seção 5). | Escolher pelo critério "tem split com subconta do produtor", não pela menor taxa. |
| 4 | **Quando o produtor recebe** | O mapa prevê saque D+2. Se for D+2 da venda, a plataforma paga antes do evento acontecer. | Repasse padrão **após o evento**; antecipação só para produtor aprovado. Ver risco R1. |
| 5 | **Pessoa jurídica** | Gateway com split exige CNPJ e atividade compatível. | Confirmar CNAE e enquadramento com contador antes de contratar o gateway. |

Pendência herdada do mapa: confirmar qual é a "Bump" (site ou Instagram) para fechar a análise de concorrentes.

---

## 3. Nome e marca

O nome é a única parte do projeto que não dá para corrigir depois sem custo alto. Critérios, em ordem:

1. **Falável e escrevível de primeira** — o produtor vai dizer o nome em áudio de WhatsApp e em story.
2. **Domínio `.com.br` e @ do Instagram livres** com a mesma grafia.
3. **Sem colisão de marca** — busca no INPI nas classes de entretenimento/venda de ingressos (confirmar as classes com quem for fazer o registro).
4. **Não preso a uma região ou a um tipo de evento**, para não limitar a expansão.
5. **Curto o bastante para caber no QR Code impresso e no remetente do e-mail.**

Processo sugerido: corte pelos critérios 2 e 3, três finalistas testados com dois produtores, logo só depois da escolha (skill `logo-design`).

### Candidatos com `.com.br` livre

Consulta feita no Registro.br em 07/10/2026, em cerca de 170 nomes. Quase toda palavra comum do setor já está registrada (entrou, bipou, catraca, portaria, canhoto, pulseira, passe, lote, tadentro e outras). Os melhores entre os livres:

| Nome | Leitura | A favor | Contra |
|---|---|---|---|
| **Tiquei** | "tiquei" (de tíquete + "fiquei/garanti") | Curto, vira verbo ("já tiquei o meu"), serve para qualquer tipo de evento | Pode ser escrito "tikei" (esse domínio já tem dono) |
| **Entru** | "entrou" | 5 letras, cabe em qualquer lugar | Precisa soletrar; `entrou.com.br` é de outra pessoa |
| **Checkei** | "chequei" | Fala direto do check-in | Grafia mista de inglês e português |
| **Escaneou** | — | Descreve o gesto da portaria, fácil de falar | Mais longo; soa mais ferramenta de portaria que vitrine |
| **Pegalote** | "pega lote" | Linguagem de quem compra festa | Prende a marca à ideia de lote |
| **Dentroja** | "dentro já" | Promessa clara | Sem acento no domínio lê-se estranho |
| **Colaja** | "cola já" | Gíria jovem | Regional; pode envelhecer |

Também livres, mas mais fracos: `tiqei`, `tiquou`, `tiqa`, `roleja`, `viroulote`, `garantelote`, `pegaingresso`, `colanessa`, `pulseirou`, `rolezei`, `baladei`, `entrouja`, `bipaqui`. `tiqo` está livre, porém existe a plataforma de ingressos europeia Tiqqo — evitar.

**Ainda não verificado:** o @ no Instagram de cada nome e a busca de marca no INPI. Domínio livre hoje não é reserva: registrar o escolhido no mesmo dia da decisão.

---

## 4. Escopo: o que entra de verdade no MVP

O MVP do mapa tem 10 módulos em 6–8 semanas. Para uma pessoa desenvolvendo, isso só cabe com cortes. A meta é a do próprio mapa: **um produtor cria o evento, vende por Pix e cartão e valida na portaria com QR Code.**

### Mantém
- Contas por e-mail (código enviado ao e-mail, sem senha) e Google; perfil de comprador e de produtor.
- Vitrine: home, busca por nome/cidade/data, página do evento.
- Tipos de ingresso e lotes com virada por data ou quantidade; limite por CPF.
- Checkout com Pix e cartão, reserva de 10 minutos, cupom.
- Ingresso com QR Code, e-mail de confirmação, "Meus ingressos".
- Painel do produtor: criar/editar evento, vendas, lista de participantes, CSV.
- Check-in pela câmera do celular, com bloqueio de reuso.
- Admin mínimo: aprovar produtor e evento, ver pedidos, estornar.
- Termos, privacidade e política de reembolso.

### Muda em relação ao mapa
| Item | No mapa | Proposta | Motivo |
|---|---|---|---|
| Transferência de ingresso por e-mail | F2 | **MVP** | É o caminho principal para quem desistiu de ir, à frente do reembolso (seção 6.1). |
| Split de pagamento | F2 | **MVP** | Sem split, o dinheiro do produtor passa pela conta da plataforma e o repasse vira trabalho manual e risco (seção 5). |
| Antifraude e 3DS no cartão | F2 | **MVP**, usando o que o gateway já oferece | Ingresso é alvo clássico de cartão clonado; o chargeback cai na plataforma. |
| Solicitação de saque | MVP | Sai; vira repasse automático do gateway | Consequência do split. |
| Login com Apple | MVP | F2 | Só é obrigatório quando houver app na App Store. |
| PDF do ingresso | MVP | F2 | O QR na tela e no e-mail resolve a portaria. |
| Evento online e híbrido | MVP | F2 | O nicho de lançamento é presencial. |
| Exportar/excluir dados (LGPD) | MVP | Atendimento manual por e-mail no início | A obrigação é atender o pedido, não ter botão. |

### Plano de corte, se o prazo apertar
Nesta ordem: cupom de desconto, busca por data, login com Google, cartão parcelado (lançar com Pix e cartão à vista).

---

## 5. Modelo financeiro e pagamentos

É a parte com mais risco e a que mais muda a arquitetura.

**Modelo recomendado: split no gateway com subconta por produtor.** O comprador paga, o gateway separa na origem a parte do produtor e a taxa da plataforma. A plataforma nunca tem o dinheiro do produtor na própria conta.

Consequências práticas:
- O cadastro e a verificação do produtor (KYC) passam a ser feitos pelo gateway.
- "Saque" deixa de ser um módulo: o painel só mostra o extrato e a data prevista de repasse.
- Estorno precisa desfazer o split; conferir como o gateway escolhido trata estorno parcial.
- O enquadramento regulatório de quem intermedeia pagamentos deve ser validado com contador ou advogado antes do lançamento.

**Cálculo de taxa** (regra do mapa, centralizada em uma única função testada):
- 7% no cartão, 5% no Pix, mínimo de R$ 2,50 por ingresso, R$ 0 em evento gratuito.
- Produtor escolhe repassar ao comprador ou absorver.
- Valores sempre em centavos inteiros; a taxa cobrada fica gravada no pedido, não é recalculada depois.

**Margem a verificar antes de fixar o preço.** A taxa de 7% precisa cobrir o custo do gateway no cartão, o antifraude e os chargebacks. Levantar as tarifas reais dos gateways candidatos e simular três tíquetes (R$ 20, R$ 60, R$ 150) antes de divulgar a tabela.

---

## 6. Arquitetura

Um único projeto Next.js (App Router) na Vercel, sem microsserviços. O produto tem cinco áreas com públicos diferentes:

| Área | Rota | Renderização | Observação |
|---|---|---|---|
| Vitrine | `/`, `/eventos/[cidade]`, `/e/[slug]` | Servidor, com cache e revalidação | É o que o Google e o WhatsApp leem. |
| Checkout | `/checkout/[pedido]` | Dinâmica | Sem cache; timer de reserva. |
| Conta do comprador | `/conta` | Dinâmica, autenticada | "Meus ingressos". |
| Painel do produtor | `/produtor` | Dinâmica, autenticada | Vendas e participantes. |
| Check-in | `/checkin/[evento]` | App de página única, instalável (PWA) | Usa a câmera; base para o modo offline da F2. |
| Admin | `/admin` | Dinâmica, restrita | Aprovações e estornos. |

**Serviços:** PostgreSQL gerenciado, Prisma, autenticação por biblioteca pronta (não escrever login à mão), Resend para e-mail, armazenamento de objetos para banners, limitador de requisições no login e no checkout.

**Entidades principais:** Usuário, Produtor, Evento, TipoDeIngresso, Lote, Pedido, ItemDoPedido, Ingresso, Pagamento, Cupom, CheckIn, RegistroDeAuditoria.

**Quatro pontos em que erro custa dinheiro:**

1. **Estoque sob concorrência.** Reserva e baixa do lote dentro de transação com trava, para dois compradores não levarem o último ingresso. A virada de lote por quantidade acontece na mesma transação.
2. **Reserva de 10 minutos.** O pedido nasce "pendente" com validade; expirado, devolve o estoque. Um Pix pago depois da expiração precisa de regra definida: honrar se ainda houver estoque, estornar se não houver.
3. **Webhooks do gateway.** Validar assinatura, processar de forma idempotente (o mesmo aviso chega mais de uma vez) e nunca confiar no retorno do navegador para marcar um pedido como pago.
4. **QR Code e check-in.** O QR carrega um identificador aleatório longo, sem dados pessoais. A validação é uma única atualização atômica "marcar como usado se ainda não foi", para dois leitores na mesma portaria não liberarem o mesmo ingresso.

### 6.1 QR Code por ingresso e transferência

**Geração.** Cada ingresso vendido recebe um código próprio, ligado ao evento e ao dono atual. O QR é só esse código; nome, CPF e tipo de ingresso ficam no servidor e aparecem na tela de quem escaneia.

**Leitura.** Feita na área de check-in por quem o produtor autorizou. A tela responde com um de três estados, em tela cheia e com cor e texto: válido (mostra nome e tipo), já usado (mostra quando), inválido (outro evento, cancelado ou transferido).

**Conta.** A compra exige e-mail confirmado antes do pagamento, e esse e-mail já é a conta. Login por código enviado ao e-mail, sem senha, para não haver cadastro separado.

**Transferência**, passo a passo:

1. Em "Meus ingressos", o dono toca em **Transferir** e informa o e-mail de quem vai receber.
2. O ingresso fica "em transferência" e o QR atual para de valer na hora.
3. A pessoa recebe um e-mail com o link; ao entrar com aquele e-mail (a conta é criada ali se não existir), aceita o ingresso.
4. No aceite, o ingresso muda de dono e ganha um **código novo**. O antigo nunca mais funciona, então print guardado não serve.
5. Enquanto não houver aceite, o dono pode cancelar e recuperar o ingresso.

Regras:
- Ingresso já usado na portaria não transfere.
- Transferência fecha algumas horas antes do evento (definir; sugestão: 2 h).
- Limite de transferências por ingresso (sugestão: 2), para não virar revenda em cadeia.
- Meia-entrada continua meia: quem recebe precisa ter direito e comprovar na portaria. Avisar isso na tela.
- A transferência é gratuita e a plataforma não intermedeia dinheiro entre as pessoas. Avisar que o pagamento entre elas é por conta e risco de quem combina. Revenda com pagamento pela plataforma continua na F2.
- Todo passo fica no registro de auditoria.

**Reembolso.** Na tela do ingresso, "Transferir" é o botão principal e "Pedir reembolso" fica como opção secundária. Ele não pode sumir: o direito de arrependimento em compra online é garantido por lei, e esconder o pedido gera reclamação e risco jurídico. Validar o texto da política com advogado.

**Datas:** gravar em UTC e guardar o fuso do evento. O Brasil tem mais de um fuso, e a virada de lote "à meia-noite" tem que ser a meia-noite do local do evento.

**Dados de cartão** nunca passam pelo servidor da plataforma: o formulário do gateway gera um token no navegador.

---

## 7. Design e experiência

**Contexto de uso que orienta tudo:** o comprador chega pelo celular, vindo de um link no Instagram ou no WhatsApp, quer comprar em menos de dois minutos e muitas vezes está na rua. O produtor usa o painel no computador para criar o evento e no celular para acompanhar vendas.

### Direção: limpo, poucas funções à vista

O pedido é um site bonito e fácil de mexer, não um site cheio de recursos. Isso vira regra de projeto:

- **Uma ação principal por tela.** Página do evento: comprar. Ingresso: mostrar o QR. Check-in: escanear.
- **O banner do evento é a cor da página.** A interface fica neutra para a arte do produtor aparecer.
- **Uma cor de marca só**, usada no botão principal e em quase mais nada.
- **Sem carrossel, pop-up, contador de urgência falso ou selo piscando.**
- **Função nova só entra se não adicionar item ao menu principal.**

### Base no Firma App

O layout do app mobile do Firma (`Desktop/Firma/Firma app/mobile`) serve de base de estrutura, em versão mais enxuta.

| Do Firma | Como entra aqui |
|---|---|
| Fundo neutro, cartões em superfície clara, uma cor de marca | Mantém a lógica; a cor é a da nova marca |
| Space Grotesk nos títulos e Inter no corpo | Mantém como ponto de partida |
| Barra inferior com 4 abas e botão central em destaque | 3 abas: **Eventos**, **Ingressos** (central, em destaque), **Conta** |
| Botão principal fixo no rodapé da tela | Vira o "Comprar" e o "Pagar" |
| Tema claro e escuro com os mesmos papéis de cor | Mantém |
| Ícones Iconly, traço fino e versão cheia na aba ativa | Mantém |

Não entra: a identidade amarelo e preto (é do Firma), a tela de sequência, as telas de finanças e vendas e o botão "+" central.

O painel do produtor e o check-in usam os mesmos componentes, com menu próprio.

### Estrutura da vitrine
Padrão de marketplace indicado pela skill `ui-ux-pro-max`, reduzido ao essencial:

1. Topo com busca (cidade + nome do evento) como elemento principal.
2. Eventos em destaque.
3. Bloco de confiança: taxa discriminada, transferência, pagamento seguro.
4. Chamada para o produtor ("Venda seus ingressos").

Categorias só aparecem quando houver eventos suficientes para preenchê-las.

### Cor de marca
A skill `ui-ux-pro-max` sugeriu roxo `#7C3AED` com laranja `#F97316` e títulos em Bebas Neue. Não adotar: é a combinação mais comum em sites de evento, usa duas cores fortes onde a direção pede uma, e Bebas Neue só tem caixa alta. A cor única sai junto com o nome e o logo.

### Regras de interface para o MVP
- Projetar primeiro em 375 px; conferir em 768, 1024 e 1440.
- Botão de compra fixo na parte de baixo da página do evento, ao alcance do polegar.
- Áreas de toque de no mínimo 44 × 44 px; texto de corpo de no mínimo 16 px.
- Checkout em uma tela, com o total e a taxa visíveis o tempo todo.
- Pix: botão "Copiar código" maior que o QR, porque quem compra pelo celular não consegue escanear a própria tela.
- Banner do evento com espaço reservado, para a página não pular ao carregar.
- Contraste mínimo de 4,5:1, foco visível no teclado, respeito a `prefers-reduced-motion`.
- Ícones em SVG de um único conjunto.

### Telas a desenhar antes de codar
Página do evento, checkout, tela do Pix aguardando pagamento, ingresso com QR, transferência (enviar e aceitar), leitor de check-in (com os três estados: válido, já usado, inválido) e formulário de criação de evento.

---

## 8. SEO e aquisição

A página do evento é o principal canal orgânico e o que aparece no link compartilhado.

- **Dados estruturados** `Event` com `Offer` (preço, disponibilidade, data, local) em toda página de evento.
- **URLs legíveis:** `/e/nome-do-evento-cidade` e páginas de listagem por cidade e por categoria.
- **Imagem de compartilhamento** gerada por evento (banner, data, cidade), porque o link vai circular em WhatsApp e Instagram.
- **Título e descrição únicos** por evento, com nome, cidade e data.
- **Evento encerrado não vira erro 404:** a página continua no ar marcada como encerrada e aponta para os próximos eventos do produtor.
- **Sitemap** atualizado a cada publicação.
- **Desempenho:** imagens em formato moderno e no tamanho certo, fontes com carregamento otimizado, o mínimo de JavaScript na vitrine.

---

## 9. Qualidade e segurança

| Camada | O que cobrir |
|---|---|
| Testes unitários | Cálculo de taxa, virada de lote, validade da reserva, cota de meia-entrada. |
| Testes de integração | Webhook repetido, pagamento após expiração, compra simultânea do último ingresso. |
| Testes ponta a ponta (Playwright, skill `webapp-testing`) | Comprar por Pix em ambiente de teste do gateway; criar e publicar evento; fazer check-in e tentar reutilizar o ingresso. |
| Segurança | Assinatura dos webhooks, limite de tentativas em login e checkout, autorização conferida no servidor em toda ação do painel, registro de auditoria em estorno e alteração de dados bancários. |
| Privacidade | Coletar só o necessário (nome, e-mail, CPF), base legal descrita na política, canal para pedidos do titular. |
| Operação | Monitoramento de erros e alerta para falha de webhook desde o primeiro evento real. |

---

## 10. Cronograma

Oito semanas, uma pessoa desenvolvendo. Cada etapa termina com algo demonstrável.

| Semana | Entrega | Pronto quando |
|---|---|---|
| 0 | Decisões da seção 2, conta no gateway aberta, telas-chave desenhadas | Gateway em modo de teste aprovado; nome em lista curta |
| 1 | Projeto base, banco, autenticação, perfis | Cadastro e login funcionando em produção |
| 2 | Painel do produtor: evento, tipos de ingresso, lotes | Produtor cria e publica um evento |
| 3 | Vitrine, busca, página do evento, SEO | Evento publicado aparece com dados estruturados válidos |
| 4 | Pedido, reserva de estoque, Pix, webhooks | Compra por Pix de ponta a ponta em ambiente de teste |
| 5 | Ingresso com QR, e-mail, "Meus ingressos", transferência, cartão | Ingresso transferido entra com o código novo e o antigo é recusado |
| 6 | Check-in pela câmera, lista de participantes, CSV | Dois celulares validando a mesma lista sem duplicar entrada |
| 7 | Split, extrato do produtor, admin, estorno | Repasse e estorno conferidos no painel do gateway |
| 8 | Páginas legais, testes ponta a ponta, evento piloto | Um evento real pequeno vendido e validado na portaria |

O evento piloto deve ser pequeno e de um produtor parceiro, com alguém da plataforma presente na portaria.

---

## 11. Riscos

| # | Risco | Efeito | Mitigação |
|---|---|---|---|
| R1 | Repasse ao produtor antes do evento, e o evento é cancelado | A plataforma devolve dinheiro que já saiu | Repasse após o evento por padrão; antecipação só com histórico e limite |
| R2 | Chargeback de cartão | Prejuízo direto, pode levar a bloqueio pelo gateway | Antifraude e 3DS desde o MVP; limite por CPF; começar com produtores conhecidos |
| R3 | Venda acima do estoque em virada de lote | Reembolso e desgaste com o produtor | Transação com trava e teste de concorrência (seção 6) |
| R4 | Internet ruim na portaria | Fila e entrada liberada no olho | Lista de participantes exportável como plano B no MVP; check-in offline na F2 |
| R5 | Margem insuficiente a 7% | Operação no prejuízo em tíquete baixo | Simulação da seção 5 antes de divulgar preço |
| R6 | Vitrine vazia no lançamento | Comprador não volta | Lançar com eventos de 3 produtores já fechados |
| R7 | Prazo de 8 semanas para uma pessoa | Atraso ou qualidade baixa no checkout | Plano de corte da seção 4; não cortar testes de pagamento |

---

## 12. Próximos passos

1. Responder às cinco decisões da seção 2.
2. Levantar tarifas e regras de split de três gateways e rodar a simulação de margem.
3. Escolher o nome entre os candidatos da seção 3, conferir o @ no Instagram e o INPI, e registrar o domínio no mesmo dia.
4. Desenhar as telas da seção 7.
5. Iniciar a semana 1.
