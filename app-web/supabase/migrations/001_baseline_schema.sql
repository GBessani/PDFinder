-- =====================================================================
-- PDFinder - schema baseline
-- Lista de desejos + notificacao automatica via WhatsApp
-- Stack: Supabase (Postgres) com RLS multiusuario
-- =====================================================================

-- gen_random_uuid() (nativo no Postgres via pgcrypto)
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PRODUTOS
-- ---------------------------------------------------------------------
create table public.produtos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null check (char_length(trim(nome)) > 0),
  created_at  timestamptz not null default now()
);

-- evita produto duplicado por usuario (case-insensitive)
create unique index produtos_user_nome_uniq
  on public.produtos (user_id, lower(nome));

-- ---------------------------------------------------------------------
-- CONTATOS
-- ---------------------------------------------------------------------
create table public.contatos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null check (char_length(trim(nome)) > 0),
  telefone    text not null,   -- so digitos, formato E.164 (ex: 5544998601878)
  opt_in      boolean not null default true,  -- consentimento p/ avisos (LGPD)
  created_at  timestamptz not null default now()
);

create unique index contatos_user_telefone_uniq
  on public.contatos (user_id, telefone);

-- ---------------------------------------------------------------------
-- WISHLIST  (contato <-> produto desejado)
-- ---------------------------------------------------------------------
create table public.wishlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  contato_id  uuid not null references public.contatos(id) on delete cascade,
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (contato_id, produto_id)
);

create index wishlist_user_id_idx    on public.wishlist (user_id);
create index wishlist_produto_id_idx on public.wishlist (produto_id);

-- ---------------------------------------------------------------------
-- NOTIFICACOES  (log de avisos disparados)
-- ---------------------------------------------------------------------
create table public.notificacoes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  contato_id  uuid references public.contatos(id) on delete set null,
  produto_id  uuid references public.produtos(id) on delete set null,
  pdf_origem  text,                       -- nome/identificacao da nota de origem
  status      text not null default 'pendente'
              check (status in ('pendente','enviado','erro','ignorado')),
  erro        text,                       -- detalhe se status = 'erro'
  enviado_em  timestamptz,
  created_at  timestamptz not null default now()
);

create index notificacoes_user_id_idx on public.notificacoes (user_id);
create index notificacoes_status_idx  on public.notificacoes (user_id, status);

-- =====================================================================
-- RLS - cada usuario so enxerga e mexe nos proprios dados
-- =====================================================================
alter table public.produtos     enable row level security;
alter table public.contatos     enable row level security;
alter table public.wishlist     enable row level security;
alter table public.notificacoes enable row level security;

-- PRODUTOS
create policy "produtos_select_own" on public.produtos
  for select using (auth.uid() = user_id);
create policy "produtos_insert_own" on public.produtos
  for insert with check (auth.uid() = user_id);
create policy "produtos_update_own" on public.produtos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "produtos_delete_own" on public.produtos
  for delete using (auth.uid() = user_id);

-- CONTATOS
create policy "contatos_select_own" on public.contatos
  for select using (auth.uid() = user_id);
create policy "contatos_insert_own" on public.contatos
  for insert with check (auth.uid() = user_id);
create policy "contatos_update_own" on public.contatos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "contatos_delete_own" on public.contatos
  for delete using (auth.uid() = user_id);

-- WISHLIST
create policy "wishlist_select_own" on public.wishlist
  for select using (auth.uid() = user_id);
create policy "wishlist_insert_own" on public.wishlist
  for insert with check (auth.uid() = user_id);
create policy "wishlist_update_own" on public.wishlist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wishlist_delete_own" on public.wishlist
  for delete using (auth.uid() = user_id);

-- NOTIFICACOES
create policy "notificacoes_select_own" on public.notificacoes
  for select using (auth.uid() = user_id);
create policy "notificacoes_insert_own" on public.notificacoes
  for insert with check (auth.uid() = user_id);
create policy "notificacoes_update_own" on public.notificacoes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notificacoes_delete_own" on public.notificacoes
  for delete using (auth.uid() = user_id);
