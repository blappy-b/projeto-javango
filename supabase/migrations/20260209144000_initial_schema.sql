-- Extensões necessárias
create extension if not exists "pgcrypto";

-- Enums
do $$
begin
  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'user_role'
  ) then
    create type public.user_role as enum ('customer', 'staff', 'admin');
  end if;

  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'event_status'
  ) then
    create type public.event_status as enum ('draft', 'published', 'cancelled');
  end if;

  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'order_status'
  ) then
    create type public.order_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;

  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'ticket_status'
  ) then
    create type public.ticket_status as enum ('valid', 'used', 'cancelled');
  end if;
end
$$;

-- Função padrão para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (espelho de auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- Eventos
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  start_date timestamptz not null,
  end_date timestamptz,
  image_url text,
  status public.event_status not null default 'draft',
  organizer_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_dates_check check (end_date is null or end_date >= start_date)
);

create index if not exists idx_events_status on public.events (status);
create index if not exists idx_events_start_date on public.events (start_date);
create index if not exists idx_events_organizer on public.events (organizer_id);

drop trigger if exists trg_events_set_updated_at on public.events;
create trigger trg_events_set_updated_at
before update on public.events
for each row execute procedure public.set_updated_at();

-- Lotes de ingresso
create table if not exists public.ticket_batches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  service_fee_percent numeric(5,2) not null default 0,
  min_service_fee_cents integer not null default 0 check (min_service_fee_cents >= 0),
  total_quantity integer not null check (total_quantity >= 0),
  sold_quantity integer not null default 0 check (sold_quantity >= 0),
  is_active boolean not null default false,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  constraint ticket_batches_dates_check check (end_date is null or start_date is null or end_date >= start_date),
  constraint ticket_batches_sold_not_gt_total check (sold_quantity <= total_quantity)
);

create index if not exists idx_ticket_batches_event on public.ticket_batches (event_id);
create index if not exists idx_ticket_batches_event_active on public.ticket_batches (event_id, is_active);

-- Pedidos
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  total_amount_cents integer not null check (total_amount_cents >= 0),
  mp_preference_id text,
  mp_payment_id text,
  status public.order_status not null default 'pending',
  items_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_event on public.orders (event_id);
create index if not exists idx_orders_status on public.orders (status);

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

-- Ingressos
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  batch_id uuid not null references public.ticket_batches (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  guest_name text,
  status public.ticket_status not null default 'valid',
  paid_price_cents integer not null default 0 check (paid_price_cents >= 0),
  paid_fee_cents integer not null default 0 check (paid_fee_cents >= 0),
  qr_hash text unique,
  purchased_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tickets_user on public.tickets (user_id);
create index if not exists idx_tickets_event on public.tickets (event_id);
create index if not exists idx_tickets_batch on public.tickets (batch_id);
create index if not exists idx_tickets_status on public.tickets (status);

-- RPC usada no webhook de pagamento
create or replace function public.increment_ticket_sold(batch_id_input uuid, quantity_input integer)
returns void
language plpgsql
security definer
as $$
declare
  current_total integer;
  current_sold integer;
begin
  if quantity_input <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  select total_quantity, sold_quantity
    into current_total, current_sold
    from public.ticket_batches
   where id = batch_id_input
   for update;

  if not found then
    raise exception 'batch not found';
  end if;

  if current_sold + quantity_input > current_total then
    raise exception 'insufficient stock';
  end if;

  update public.ticket_batches
     set sold_quantity = sold_quantity + quantity_input
   where id = batch_id_input;
end;
$$;

-- RPC usada para exclusão segura de evento
create or replace function public.delete_event_if_no_sales(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.events
    where id = p_event_id
      and organizer_id = p_user_id
  ) then
    raise exception 'not authorized';
  end if;

  if exists (
    select 1
      from public.ticket_batches
     where event_id = p_event_id
       and sold_quantity > 0
  ) then
    raise exception 'event has sales';
  end if;

  delete from public.events where id = p_event_id;
end;
$$;
