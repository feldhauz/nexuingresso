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

### 1.4 Proposta de preço NexuIngresso
> Detalhes completos em [PLANO_PAGAMENTOS_E_LEGAL.md](./PLANO_PAGAMENTOS_E_LEGAL.md).
- **Sem eventos gratuitos.** Todo evento tem ao menos um ingresso pago (mínimo R$ 10,00).
- **Taxa de serviço:** **8% no Pix** e **9% no cartão** (mínimo R$ 2,00), mostrada de forma discriminada do anúncio ao comprovante (Decreto 13.108/2026).
- O produtor escolhe **repassar ao comprador** (padrão) **ou absorver**.
- **Gateway:** AbacatePay (CNPJ). Pix R$ 0,80; cartão 3,5%–4,5% + R$ 0,60.
- **Repasse ao produtor:** D+2 úteis após o evento; antecipação parcial na F2.
- **Transferência de ingresso gratuita** e **revenda oficial com teto no preço de face**.

---

## 2. MVP (fase 1 — o mínimo para vender o primeiro ingresso)

Objetivo: um produtor cria um evento, publica, vende via Pix/cartão e valida na portaria com QR Code.

| # | Módulo | Itens do MVP |
|---|---|---|
| 1 | **Contas** | Cadastro/login (e-mail + Google), perfil comprador, perfil produtor (CPF/CNPJ, dados bancários/Pix) |
| 2 | **Vitrine** | Home com eventos em destaque, busca por nome/cidade/data, página do evento (banner, descrição, local com mapa, data, classificação etária) |
| 3 | **Ingressos** | Tipos de ingresso (inteira, meia, VIP…), **lotes** com virada por data ou quantidade, limite por CPF |
| 4 | **Checkout** | Carrinho, dados do titular, **Pix** (QR + copia-e-cola), **cartão** (parcelado), reserva de 15 min com preço congelado, preço + taxa discriminados, cupom de desconto |
| 5 | **Ingresso digital** | QR Code único por ingresso, e-mail de confirmação, "Meus ingressos" na conta, PDF, **transferência gratuita**, **botão de arrependimento (7 dias)** |
| 6 | **Painel do produtor** | Criar/editar evento, vendas em tempo real, lista de participantes, exportar CSV |
| 7 | **Check-in** | Leitor de QR pela web (câmera do celular), validação online, bloqueio de reuso |
| 8 | **Financeiro** | Taxa 8% Pix / 9% cartão (repassa/absorve), extrato por evento, repasse via payout AbacatePay após o evento, reembolsos |
| 9 | **Admin** | Aprovar produtores/eventos, ver pedidos, estornos, configurar taxas |
| 10 | **Legal** | Termos de uso, política de privacidade (LGPD), política de reembolso (7 dias CDC) |

**Stack sugerida:** Next.js (front + API) · PostgreSQL · Prisma · **AbacatePay** (Pix + cartão, conta CNPJ) atrás de uma camada `PaymentProvider` trocável · Vercel · e-mail transacional (Resend).

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
- [MVP] Busca e filtros: cidade, data, categoria, faixa de preço
- [MVP] Página do evento: banner, descrição, atrações/line-up, mapa (Google Maps), classificação etária, política do evento
- [MVP] Cadastro/login social (Google, Apple) e por e-mail
- [MVP] Carteira "Meus ingressos" com QR Code
- [F2] Login por WhatsApp/SMS (OTP)
- [MVP] **Transferência gratuita de ingresso** com novo QR e histórico (obrigatória — Decreto 13.108/2026)
- [MVP] **Canal de arrependimento** (cancelar em até 7 dias com reembolso integral)
- [F2] **Revenda oficial** entre usuários, **teto no preço de face** (sem ágio), taxa do novo comprador
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
- [MVP] Tipos de ingresso: inteira, **meia-entrada** (alerta de cota mínima de 40%), VIP, camarote, open bar, cortesia (até 10% da carga, R$ 1,00 cada)
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
- [F3] Lista VIP com aprovação manual (sempre vinculada a um evento pago)

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
- [MVP] Taxa de serviço **8% Pix / 9% cartão**: **repassar ao comprador ou absorver**
- [MVP] Extrato por evento e repasse automático D+2 após o evento (payout Pix AbacatePay)
- [MVP] Reembolso automático (arrependimento / cancelamento do evento) via API
- [F2] Cartão de débito, Apple Pay, Google Pay
- [F2] Boleto (com prazo de reserva)
- [F2] Divisão de repasse (produtor, sócios, promoters) via payouts — split nativo só se migrar de gateway
- [F2] **Antecipação de recebíveis** (D+0/D+1 com taxa)
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
- [MVP] Termos, política de privacidade, **política de reembolso** (arrependimento 7 dias; cancelamento/adiamento = reembolso integral com taxas)
- [MVP] Rodapé com razão social, CNPJ, endereço e SAC (Decreto 7.962/2013); logs de auditoria (Decreto 13.108 e Marco Civil)
- [MVP] Meia-entrada conforme Lei 12.933/2013 (cota de 40%)
- [MVP] HTTPS, senhas com hash, rate limit, logs de auditoria
- [F2] Autenticação em 2 fatores para produtores
- [F2] **Fila virtual** com posição e tempo estimado (Decreto 13.108/2026)
- [MVP] Proteção anti-bot (captcha, limite por CPF/pedido, rate limit) — exigida pelo Decreto 13.108/2026
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
1. **Taxa menor e transparente** (8–9% vs. 10–15%), mais barata no Pix e 100% conforme o Decreto 13.108/2026.
2. **Repasse rápido** (D+2 após o evento, antecipação parcial para produtores com histórico).
3. **Promoters + PDV físico** (força do Ingresso Fly) somados à experiência digital moderna.
4. **Transferência grátis + revenda oficial sem ágio** contra cambista e golpe.
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
