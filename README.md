# Colaja

Site de venda de ingressos para festas e shows — [colajaingressos.com.br](https://colajaingressos.com.br), Instagram [@colaja.ingressos](https://www.instagram.com/colaja.ingressos). O planejamento está em [docs/PLANEJAMENTO.md](docs/PLANEJAMENTO.md) e o mapa de funcionalidades em [docs/MAPA_FUNCIONALIDADES.md](docs/MAPA_FUNCIONALIDADES.md).

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # regras de taxa, lote, datas e CPF
npm run lint
npm run build
```

Sem configuração nenhuma, `npm run dev` sobe o site em **modo de demonstração**:

- banco PostgreSQL embutido (PGlite) gravado em `.data/`, com quatro eventos de exemplo;
- pagamento simulado: a tela do Pix tem um botão que faz o papel do banco;
- e-mails não são enviados; aparecem em `/demo/emails`, inclusive o código de login.

Para zerar o banco local, pare o site e apague a pasta `.data/`.

O acesso a `/feldhauspanel` é de quem está em `ADMIN_EMAILS` (arquivo `.env.local`; modelo em `.env.example`).

## O que existe

| Área | Rota | O que faz |
|---|---|---|
| Vitrine | `/`, `/eventos/[cidade]`, `/e/[slug]` | Busca por nome, cidade e data; página do evento com dados estruturados, imagem de compartilhamento e estado de encerrado |
| Login | `/entrar` | Código de 6 dígitos por e-mail, sem senha |
| Checkout | `/checkout/[pedido]` | Reserva de 10 minutos, cupom, Pix e cartão, taxa visível |
| Ingressos | `/ingressos`, `/ingressos/[id]` | QR Code por ingresso, transferência por e-mail, pedido de reembolso |
| Transferência | `/transferencia/[token]` | Aceite por quem recebeu; o ingresso ganha código novo |
| Produtor | `/produtor` | Cadastro, perfil público, evento com foto, final do link editável, line-up com foto por atração, estilos, tipos de ingresso (inclusive camarote e mesa), lotes, cupons, equipe da portaria, vendas, participantes e CSV |
| Vendas do produtor | `/produtor/vendas`, `/produtor/saque` | Resumo (ingressos, vendas, quanto recebe), listas de vendas, nomes e camarotes com filtro por evento; saque por Pix depois da verificação de identidade (o pedido cai no painel do dono, que paga e marca como pago) |
| Camarote | `/camarotes/[id]` | Quem compra dá nome ao camarote, cadastra os convidados e gera um QR Code para cada um |
| Perfil do produtor | `/p/[slug]` | Sobre, próximos eventos, eventos passados, atrações e botão Seguir; quem segue recebe e-mail a cada evento novo |
| Portaria | `/checkin/[evento]` | Leitor de QR pela câmera, com os estados válido, já usado e inválido |
| Painel do dono | `/feldhauspanel` | Vendas, lucro, pessoas usando, verificação de produtor (documentos), aprovação de evento, cortesias a partir do link do evento, estorno. Só abre para quem está em `ADMIN_EMAILS`; para os demais responde como página inexistente |
| Legal | `/termos`, `/termos-produtor`, `/privacidade`, `/reembolso` | Termos do comprador, contrato do produtor (o mesmo texto de `src/lib/contract.ts`, que ele lê em páginas e aceita antes de enviar documentos), privacidade e reembolso. Textos-base, a validar com advogado |

## Onde ficam as regras

- `src/lib/fees.ts` — taxa (5% Pix, 7% cartão, mínimo R$ 2,50) e valores do pedido.
- `src/lib/lots.ts` — virada de lote por data ou quantidade.
- `src/lib/orders.ts` — reserva de estoque, pagamento, aviso do gateway (webhook) e estorno.
- `src/lib/tickets.ts` — transferência e check-in.
- `src/lib/groups.ts` — camarote: convidados e geração dos QR Codes.
- `src/lib/sales.ts` — painel de vendas do produtor, saldo e pedidos de saque.
- `src/lib/kyc.ts` — verificação de identidade do produtor (documentos e selfie), que libera o repasse.
- `src/lib/gateway.ts` — fronteira com o gateway de pagamento. **Hoje só existe o simulado.**
- `src/lib/schema.ts` — tabelas do banco.

## O que falta para vender de verdade

A taxa de serviço não aparece em nenhuma tela: o comprador vê sempre o preço final (`buyerPrice` em `src/lib/fees.ts`) e as porcentagens ficam só nos termos de uso.

Conta de produtor exige CPF ou CNPJ com dígitos válidos e 18 anos ou mais. O CNPJ é consultado na Receita pela BrasilAPI. A conferência de RG e selfie é manual, no painel; verificação automática de documento e rosto depende de contratar um serviço de KYC ou usar a do gateway.

1. **Gateway de pagamento** com Pix, cartão e split (decisão 3 do planejamento). Entra em `src/lib/gateway.ts`; o aviso de pagamento chega em `/api/webhooks/pagamento`.
2. **Banco PostgreSQL** de produção (Supabase): definir `DATABASE_URL` com a connection string do projeto; as tabelas são criadas no primeiro acesso. Com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, as fotos de documento vão para um bucket privado do Supabase Storage (`src/lib/storage.ts`). Nenhum dos dois caminhos foi testado contra um projeto real ainda.
3. **Envio de e-mail**: definir `RESEND_API_KEY` e `MAIL_FROM`, com o domínio verificado no Resend. Também ainda não testado.
4. **Caixa de e-mail** `contato@colajaingressos.com.br` (aparece nas páginas legais; muda em `src/lib/config.ts`).
5. **Textos legais** revisados por advogado, com razão social e CNPJ.
6. Do planejamento, ficaram para depois: login com Google, QR Code dentro do e-mail, testes automatizados de ponta a ponta e limite de tentativas por IP.

Nunca ligue `COLAJA_DEMO=1` no site público: no modo de demonstração qualquer pessoa confirma o próprio pagamento.

## Logo

Os arquivos ficam em `brand/final/`. A geometria é gerada por `brand/build_logo.py`; `npm run logo` refaz os SVGs, o ícone do site e os caminhos usados pelo componente `Logo`.
