# NexuIngresso — MVP e Mapa de Funcionalidades

> Documento base do produto. Versão 0.1 — out/2026.

---

## 1. Análise de concorrentes

### 1.1 Ingresso Fly (ingressofly.com)
- Ticketeira regional com foco no **Norte/Nordeste** (Pará e Amazonas), ~13 anos de mercado, ~31 mil seguidores no Instagram.
- **Venda híbrida:** site + app (iOS) + **ponto físico** de ingressos e pulseiras (Manaus).
- App: lista de eventos, detalhes (local, data, hora), seleção de ingressos, revisão do pedido e checkout, acompanhamento dos ingressos comprados.
- Forte em festas, shows regionais e blocos/carnaval.
- **Taxas:** não são divulgadas publicamente (negociação direta com produtor). Ticketeiras regionais desse porte costumam cobrar **10%–15% de taxa de conveniência** do comprador.

### 1.2 Bump
- Não encontramos material público indexado sobre a "Bump" como ticketeira (existe um app "Bump" de mapa entre amigos usado em blocos/festas, e uma produtora "Bump Produções" no RJ).
- **Ação:** confirmar o site/Instagram exato da Bump para completar esta seção. As funcionalidades típicas do segmento (festas/universitário) já estão cobertas no mapa abaixo.

### 1.3 Referências de taxa do mercado (benchmark)
| Plataforma | Taxa | Observação |
|---|---|---|
| Sympla | 10% + processamento (2–2,5%) | Mínimo R$ 3,99 p/ ingressos ≤ R$ 39,90; produtor pode absorver ou repassar |
| Eventiza | 8,5% | Se posiciona como "menor taxa" |
| AppTicket | 5% Pix/boleto · 7% cartão | Taxa diferenciada por meio de pagamento |
| Vendo Meu Ingresso | a partir de 5% | Saque D+1 via Pix |
| Ingresso Fly | não divulgada | Estimativa de mercado 10–15% |

### 1.4 Proposta de preço NexuIngresso (diferencial)
- **Eventos gratuitos:** R$ 0.
- **Taxa padrão:** **7%** (mínimo R$ 2,50), com o produtor escolhendo **repassar ao comprador ou absorver**.
- **Pix com desconto:** 5% para incentivar Pix (menor custo de processamento).
- **Parcelamento no cartão:** juros repassados ao comprador (até 12x).
- **Saque:** D+2 grátis; **antecipação D+0/D+1** com taxa extra (ex.: 1,5%).
- **Plano Pro / negociação** para grandes produtores (> X mil ingressos/mês).
- Taxa sempre **discriminada** no anúncio e no checkout (transparência / CDC).

---

## 2. MVP (fase 1 — o mínimo para vender o primeiro ingresso)

Objetivo: um produtor cria um evento, publica, vende via Pix/cartão e valida na portaria com QR Code.

| # | Módulo | Itens do MVP |
|---|---|---|
| 1 | **Contas** | Cadastro/login (e-mail + Google), perfil comprador, perfil produtor (CPF/CNPJ, dados bancários/Pix) |
| 2 | **Vitrine** | Home com eventos em destaque, busca por nome/cidade/data, página do evento (banner, descrição, local com mapa, data, classificação etária) |
| 3 | **Ingressos** | Tipos de ingresso (inteira, meia, VIP…), **lotes** com virada por data ou quantidade, limite por CPF |
| 4 | **Checkout** | Carrinho, dados do titular, **Pix** (QR + copia-e-cola), **cartão** (parcelado), timer de reserva (10 min), cupom de desconto |
| 5 | **Ingresso digital** | QR Code único por ingresso, e-mail de confirmação, "Meus ingressos" na conta, PDF |
| 6 | **Painel do produtor** | Criar/editar evento, vendas em tempo real, lista de participantes, exportar CSV |
| 7 | **Check-in** | Leitor de QR pela web (câmera do celular), validação online, bloqueio de reuso |
| 8 | **Financeiro** | Cálculo de taxa (repassa/absorve), extrato por evento, solicitação de saque |
| 9 | **Admin** | Aprovar produtores/eventos, ver pedidos, estornos, configurar taxas |
| 10 | **Legal** | Termos de uso, política de privacidade (LGPD), política de reembolso (7 dias CDC) |

**Stack sugerida:** Next.js (front + API) · PostgreSQL · Prisma · gateway de pagamento (Mercado Pago / Pagar.me / Asaas — Pix + cartão + split) · Vercel · e-mail transacional (Resend).

---

## 3. Mapa completo de funcionalidades

Legenda de fase: **[MVP]** fase 1 · **[F2]** fase 2 · **[F3]** fase 3 / diferencial

```
NexuIngresso
├── 1. Comprador (site + app)
├── 2. Produtor (painel)
├── 3. Vendas & Marketing
├── 4. Pagamentos & Financeiro
├── 5. Operação no dia do evento
├── 6. Pós-evento & Relacionamento
├── 7. Administração da plataforma
└── 8. Segurança, Legal & Infra
```

### 3.1 Comprador
- [MVP] Home com destaques, categorias (shows, festas, universitário, teatro, esportes, cursos, infantil)
- [MVP] Busca e filtros: cidade, data, categoria, preço, gratuito
- [MVP] Página do evento: banner, descrição, atrações/line-up, mapa (Google Maps), classificação etária, política do evento
- [MVP] Cadastro/login social (Google, Apple) e por e-mail
- [MVP] Carteira "Meus ingressos" com QR Code
- [F2] Login por WhatsApp/SMS (OTP)
- [F2] **Transferência de ingresso** para outra pessoa (troca de titularidade)
- [F2] **Revenda oficial** entre usuários (marketplace seguro, com taxa)
- [F2] Ingresso no Apple Wallet / Google Wallet
- [F2] Favoritar eventos e seguir produtores; alerta de "virada de lote"
- [F2] Lista de espera para evento esgotado
- [F2] Compartilhar evento (WhatsApp, Instagram Stories)
- [F2] App mobile (iOS/Android) — PWA primeiro
- [F3] Recomendações personalizadas por histórico/cidade
- [F3] "Quem vai" — ver amigos confirmados, compra em grupo/rachar valor
- [F3] Modo offline do ingresso (QR disponível sem internet)
- [F3] Avaliação do evento e do produtor

### 3.2 Produtor (painel)
- [MVP] Criar evento (presencial, online, híbrido), rascunho → publicado
- [MVP] Tipos de ingresso: inteira, **meia-entrada** (com regra de comprovação), VIP, camarote, open bar, cortesia
- [MVP] **Lotes** com virada automática por data e/ou quantidade
- [MVP] Limite por pedido e por CPF; data de início/fim de vendas
- [MVP] Dashboard de vendas em tempo real
- [MVP] Lista de participantes + exportação CSV/Excel
- [F2] Evento privado (link secreto) e ingresso com senha
- [F2] **Mapa de assentos / setores** (teatro, mesas, camarotes) com editor visual
- [F2] Eventos recorrentes e com várias sessões/datas
- [F2] **Pacotes/combos** (ingresso + bebida, ingresso + camisa, excursão)
- [F2] **Venda de produtos** (camisas, abadás, kits, estacionamento)
- [F2] Formulário personalizado no checkout (tamanho de camisa, curso, atlética…)
- [F2] Multiusuário com permissões (dono, financeiro, check-in, promoter)
- [F2] Página do produtor (perfil público com todos os eventos)
- [F2] Duplicar evento
- [F3] **White-label**: domínio próprio, cores e logo do produtor
- [F3] Separação por **atléticas/organizações** (eventos universitários)
- [F3] Inscrições gratuitas com aprovação manual (lista VIP / RSVP)

### 3.3 Vendas & Marketing
- [MVP] Cupons de desconto (% ou R$, limite de uso, validade)
- [F2] **Promoters/comissários**: link e código próprio, ranking, comissão automática
- [F2] **PDV / bilheteria física** (venda no balcão, impressão, dinheiro/maquininha)
- [F2] Pontos de venda parceiros (lojas físicas — modelo Ingresso Fly)
- [F2] Pixel Meta, Google Analytics/Tag Manager, TikTok Pixel por evento
- [F2] Links rastreáveis (UTM) e relatório por canal
- [F2] Recuperação de carrinho abandonado (e-mail/WhatsApp)
- [F3] E-mail marketing e disparo de WhatsApp para base do produtor
- [F3] Programa de indicação (indique e ganhe)
- [F3] Destaque pago na vitrine (receita extra para a plataforma)
- [F3] Integração com Instagram (botão de compra / link na bio)
- [F3] Pré-venda exclusiva para fãs/cadastrados

### 3.4 Pagamentos & Financeiro
- [MVP] **Pix** (QR dinâmico + copia-e-cola, confirmação automática)
- [MVP] **Cartão de crédito** com parcelamento até 12x
- [MVP] Taxa de serviço configurável: **repassar ao comprador ou absorver**
- [MVP] Extrato por evento e solicitação de saque
- [F2] Cartão de débito, Apple Pay, Google Pay
- [F2] Boleto (com prazo de reserva)
- [F2] **Split de pagamento** automático (produtor, sócios, promoters, plataforma)
- [F2] **Antecipação de recebíveis** (D+0/D+1 com taxa)
- [F2] Reembolso/estorno pelo painel (total ou parcial)
- [F2] Antifraude (análise de risco do cartão, 3DS)
- [F2] Emissão de nota fiscal da taxa de serviço
- [F3] Pix parcelado / "compre agora, pague depois"
- [F3] **Cashless**: pulseira/QR com saldo para consumo no evento
- [F3] Conciliação financeira e relatório contábil

### 3.5 Operação no dia do evento
- [MVP] Check-in por QR Code pela câmera do celular (web)
- [MVP] Bloqueio de ingresso já utilizado, contadores de entrada
- [F2] **App de check-in offline** (sincroniza depois)
- [F2] Múltiplos portões/operadores simultâneos, check-in por setor
- [F2] Busca por nome/CPF na portaria
- [F2] **QR Code dinâmico** (rotativo, anti-print/anti-fraude)
- [F2] Troca de ingresso por **pulseira** (modelo Fly/universitário)
- [F3] Check-in por reconhecimento facial
- [F3] Pulseiras **NFC/RFID** e controle de acesso por área (pista, VIP, backstage)
- [F3] Dashboard ao vivo de lotação

### 3.6 Pós-evento & Relacionamento
- [F2] Pesquisa de satisfação (NPS) automática
- [F2] Certificado de participação (cursos/palestras)
- [F2] Base de clientes do produtor (CRM) com segmentação
- [F3] Galeria de fotos do evento
- [F3] Programa de fidelidade (pontos/benefícios)

### 3.7 Administração da plataforma
- [MVP] Aprovação de produtores (KYC: CPF/CNPJ, documento) e moderação de eventos
- [MVP] Gestão de pedidos, estornos e taxas
- [F2] Taxa personalizada por produtor/evento
- [F2] Central de ajuda (FAQ) + atendimento (chat/WhatsApp) + tickets de suporte
- [F2] Relatórios globais (GMV, receita de taxas, eventos ativos)
- [F3] Gestão de banners/destaques da home
- [F3] Painel de fraude e chargebacks

### 3.8 Segurança, Legal & Infra
- [MVP] LGPD: consentimento, exportar/excluir dados
- [MVP] Termos, política de privacidade, **política de reembolso** (direito de arrependimento — 7 dias, até 48h antes do evento)
- [MVP] Meia-entrada conforme Lei 12.933/2013 (cota de 40%)
- [MVP] HTTPS, senhas com hash, rate limit, logs de auditoria
- [F2] Autenticação em 2 fatores para produtores
- [F2] **Fila virtual** para eventos de alta demanda
- [F2] Proteção anti-bot / anti-cambista (captcha, limite por CPF/dispositivo)
- [F3] Acessibilidade (WCAG), multi-idioma, multi-moeda
- [F3] API pública e webhooks para integrações

---

## 4. Roadmap sugerido

| Fase | Prazo estimado | Entrega |
|---|---|---|
| **MVP** | 6–8 semanas | Vender e validar ingresso (Pix + cartão + QR), painel básico, saque |
| **F2** | +2–3 meses | Promoters, PDV, mapa de assentos, transferência/revenda, app check-in offline, split, antecipação |
| **F3** | +3–6 meses | White-label, cashless/NFC, CRM e marketing, app nativo, API pública |

## 5. Diferenciais competitivos (posicionamento)
1. **Taxa menor e transparente** (7% vs. 10–15%) e desconto no Pix.
2. **Saque rápido** (D+2 grátis, D+0 com antecipação).
3. **Promoters + PDV físico** (força do Ingresso Fly) somados à experiência digital moderna.
4. **Revenda oficial segura** contra cambista e golpe.
5. **Check-in offline** confiável mesmo sem internet no local.

---

## Fontes
- [Ingresso Fly — site](https://ingressofly.com/) · [Instagram](https://www.instagram.com/ingressoflyoficial/) · [App Store](https://apps.apple.com/br/app/ingresso-fly-app/id6757499039)
- [Sympla — Quanto custa](https://produtores.sympla.com.br/quanto-custa/)
- [Eventiza](https://eventiza.com.br/)
- [AppTicket](https://appticket.com.br/vender-ingressos-inscricoes-online)
- [Vendo Meu Ingresso](https://www.vendomeuingresso.com/alternativa-sympla)
- [IngressoLive — eventos universitários](https://www.ingressolive.com/tipo-de-evento/eventos-universitarios.html)
- [Bump — app de mapa para amigos](https://apps.apple.com/br/app/bump-mapa-para-amigos/id6471519217)
