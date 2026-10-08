// Esquema do banco (PostgreSQL). Datas sempre em UTC; o fuso do evento fica em events.time_zone.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  cpf text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_codes (
  id text PRIMARY KEY,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_codes_email ON login_codes (email, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS producers (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES users (id),
  name text NOT NULL,
  document text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pendente', -- pendente | aprovado | recusado
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  producer_id text NOT NULL REFERENCES producers (id),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  venue text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL,
  city_slug text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  time_zone text NOT NULL DEFAULT 'America/Sao_Paulo',
  min_age int NOT NULL DEFAULT 0,
  poster_bg text NOT NULL DEFAULT '#2b3bff',
  poster_fg text NOT NULL DEFAULT '#ffffff',
  status text NOT NULL DEFAULT 'rascunho', -- rascunho | em_analise | publicado | recusado | cancelado
  absorb_fee boolean NOT NULL DEFAULT false,
  max_per_cpf int NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_vitrine ON events (status, starts_at);

CREATE TABLE IF NOT EXISTS ticket_types (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES events (id),
  name text NOT NULL,
  detail text NOT NULL DEFAULT '',
  is_half boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0
);

-- sold conta ingressos pagos e reservados; a reserva expirada devolve.
CREATE TABLE IF NOT EXISTS lots (
  id text PRIMARY KEY,
  ticket_type_id text NOT NULL REFERENCES ticket_types (id),
  name text NOT NULL,
  price_cents int NOT NULL CHECK (price_cents >= 0),
  quantity int NOT NULL CHECK (quantity >= 0),
  sold int NOT NULL DEFAULT 0 CHECK (sold >= 0),
  ends_at timestamptz,
  position int NOT NULL DEFAULT 0,
  CHECK (sold <= quantity)
);

CREATE TABLE IF NOT EXISTS coupons (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES events (id),
  code text NOT NULL,
  percent_off int NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  max_uses int,
  used int NOT NULL DEFAULT 0,
  UNIQUE (event_id, code)
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id),
  event_id text NOT NULL REFERENCES events (id),
  status text NOT NULL DEFAULT 'pendente', -- pendente | aguardando | pago | expirado | reembolsado
  method text, -- pix | card | gratis
  subtotal_cents int NOT NULL,
  discount_cents int NOT NULL DEFAULT 0,
  fee_cents int NOT NULL DEFAULT 0,       -- taxa da plataforma, gravada no pagamento
  total_cents int NOT NULL DEFAULT 0,     -- o que o comprador paga
  producer_cents int NOT NULL DEFAULT 0,  -- parte do produtor no split
  coupon_id text REFERENCES coupons (id),
  buyer_name text,
  buyer_cpf text,
  charge_id text UNIQUE,
  pix_code text,
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user ON orders (user_id, created_at);
CREATE INDEX IF NOT EXISTS orders_event ON orders (event_id, status);

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id),
  ticket_type_id text NOT NULL REFERENCES ticket_types (id),
  lot_id text NOT NULL REFERENCES lots (id),
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price_cents int NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id),
  event_id text NOT NULL REFERENCES events (id),
  ticket_type_id text NOT NULL REFERENCES ticket_types (id),
  owner_id text NOT NULL REFERENCES users (id),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'valido', -- valido | usado | em_transferencia | cancelado
  used_at timestamptz,
  used_by text REFERENCES users (id),
  transfer_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tickets_owner ON tickets (owner_id);
CREATE INDEX IF NOT EXISTS tickets_event ON tickets (event_id);

CREATE TABLE IF NOT EXISTS transfers (
  id text PRIMARY KEY,
  ticket_id text NOT NULL REFERENCES tickets (id),
  from_user_id text NOT NULL REFERENCES users (id),
  to_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente', -- pendente | aceita | cancelada
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id),
  user_id text NOT NULL REFERENCES users (id),
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'aberto', -- aberto | aprovado | recusado
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkin_staff (
  event_id text NOT NULL REFERENCES events (id),
  email text NOT NULL,
  PRIMARY KEY (event_id, email)
);

-- Avisos do gateway já processados: o mesmo aviso pode chegar mais de uma vez.
CREATE TABLE IF NOT EXISTS webhook_events (
  id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY,
  actor_id text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Perfil público do produtor, line-up e estilos do evento.
ALTER TABLE producers ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE producers ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '';
UPDATE producers SET slug = trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || left(id, 4)
  WHERE slug IS NULL;
-- lineup guardava um nome por linha; hoje as atrações ficam em lineup_artists.
-- Estilos separados por vírgula em moods.
ALTER TABLE events ADD COLUMN IF NOT EXISTS lineup text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS moods text NOT NULL DEFAULT '';

-- Atrações do evento, cadastradas uma a uma, com foto opcional guardada no próprio banco.
CREATE TABLE IF NOT EXISTS lineup_artists (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES events (id),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  photo bytea,
  photo_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lineup_artists_event ON lineup_artists (event_id, position);

-- Foto do evento. banner_version entra no endereço da imagem e muda a cada troca.
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner bytea;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_type text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_version int NOT NULL DEFAULT 0;

-- Quando o produtor muda o final do link, o endereço antigo continua levando ao evento.
CREATE TABLE IF NOT EXISTS slug_redirects (
  slug text PRIMARY KEY,
  event_id text NOT NULL REFERENCES events (id)
);

-- Camarote ou mesa: um ingresso que vale para group_size pessoas.
ALTER TABLE ticket_types ADD COLUMN IF NOT EXISTS group_size int NOT NULL DEFAULT 1;
CREATE TABLE IF NOT EXISTS ticket_groups (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id),
  event_id text NOT NULL REFERENCES events (id),
  ticket_type_id text NOT NULL REFERENCES ticket_types (id),
  owner_id text NOT NULL REFERENCES users (id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Ingresso de camarote nasce 'sem_nome' e só vale na portaria depois que os QR Codes são gerados.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS group_id text REFERENCES ticket_groups (id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS holder_name text;

-- Cadastro de produtor: basta CPF ou CNPJ válido e ser maior de idade. A verificação de
-- identidade (kyc_*) é à parte e libera o repasse do dinheiro.
ALTER TABLE producers ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'nao_enviado'; -- nao_enviado | em_analise | aprovado | recusado
ALTER TABLE producers ADD COLUMN IF NOT EXISTS kyc_note text NOT NULL DEFAULT '';
ALTER TABLE producers ADD COLUMN IF NOT EXISTS cnpj_info text NOT NULL DEFAULT '';
UPDATE producers SET status = 'aprovado' WHERE status = 'pendente';

-- Fotos dos documentos da verificação. Só o admin lê.
CREATE TABLE IF NOT EXISTS producer_documents (
  id text PRIMARY KEY,
  producer_id text NOT NULL REFERENCES producers (id),
  kind text NOT NULL, -- rg_frente | rg_verso | selfie | cnpj_doc
  bytes bytea NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (producer_id, kind)
);

-- Com Supabase Storage configurado, a foto fica lá (storage_path) e bytes fica vazio.
ALTER TABLE producer_documents ALTER COLUMN bytes DROP NOT NULL;
ALTER TABLE producer_documents ADD COLUMN IF NOT EXISTS storage_path text;

-- Aceite eletrônico do contrato do produtor: versão aceita e quando.
ALTER TABLE producers ADD COLUMN IF NOT EXISTS contract_version text;
ALTER TABLE producers ADD COLUMN IF NOT EXISTS contract_accepted_at timestamptz;

-- Pedidos de saque do produtor. O admin paga por Pix e marca como pago.
CREATE TABLE IF NOT EXISTS payouts (
  id text PRIMARY KEY,
  producer_id text NOT NULL REFERENCES producers (id),
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  pix_key text NOT NULL,
  status text NOT NULL DEFAULT 'solicitado', -- solicitado | pago
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS producer_followers (
  producer_id text NOT NULL REFERENCES producers (id),
  user_id text NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (producer_id, user_id)
);

CREATE TABLE IF NOT EXISTS emails (
  id text PRIMARY KEY,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

/** Passa o line-up antigo (texto, um nome por linha) para o cadastro individual. Roda a cada início. */
export const MIGRATE_LINEUP = [
  `INSERT INTO lineup_artists (id, event_id, name, position)
   SELECT md5(e.id || ':' || t.ord), e.id, trim(t.name), t.ord::int
   FROM events e, unnest(string_to_array(e.lineup, E'\\n')) WITH ORDINALITY AS t(name, ord)
   WHERE e.lineup <> '' AND trim(t.name) <> ''
   ON CONFLICT (id) DO NOTHING`,
  `UPDATE events SET lineup = '' WHERE lineup <> ''`,
];
