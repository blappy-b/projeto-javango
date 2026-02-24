-- ============================================================
-- MIGRATIONS CONSOLIDADAS - Aplicar no SQL Editor do Supabase
-- ============================================================
-- Execute todo este arquivo de uma vez no SQL Editor
-- https://app.supabase.com/project/_/sql/new
-- ============================================================

-- 1️⃣ Adiciona coluna order_id à tabela tickets
-- ------------------------------------------------------------
alter table public.tickets
  add column if not exists order_id uuid references public.orders(id);

create index if not exists idx_tickets_order_id on public.tickets(order_id);

-- 2️⃣ Adiciona coluna mp_payment_id à tabela orders
-- ------------------------------------------------------------
alter table public.orders
  add column if not exists mp_payment_id text;

create index if not exists idx_orders_mp_payment_id on public.orders(mp_payment_id);

-- 3️⃣ Corrige recursão infinita na política de RLS da tabela profiles
-- ------------------------------------------------------------
drop policy if exists profiles_select_own_or_staff_admin on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- 4️⃣ Adiciona coluna image_url de volta à tabela events
-- ------------------------------------------------------------
alter table public.events
  add column if not exists image_url text;

comment on column public.events.image_url is 'URL da imagem do evento (pode ser URL externa ou caminho local em /public)';

-- ============================================================
-- FIM DAS MIGRATIONS
-- ============================================================
