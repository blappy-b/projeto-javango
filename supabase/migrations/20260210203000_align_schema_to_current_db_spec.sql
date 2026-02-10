-- Alinha schema ao modelo atual informado (Supabase/Postgres)

create extension if not exists "pgcrypto";

-- =====================================================
-- PROFILES
-- =====================================================

create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'student',
  created_at timestamptz default timezone('utc'::text, now())
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists created_at timestamptz default timezone('utc'::text, now());

-- Migração de enum antigo para texto (quando existir)
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'profiles'
       and column_name = 'role'
       and udt_name = 'user_role'
  ) then
    alter table public.profiles
      alter column role type text using
        case
          when role::text = 'customer' then 'student'
          else role::text
        end;
  end if;
end
$$;

update public.profiles
   set role = 'student'
 where role is null or role not in ('admin', 'staff', 'student');

alter table public.profiles
  alter column role set default 'student';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'staff', 'student'));

-- Remove colunas legadas não utilizadas no modelo atual
alter table public.profiles drop column if exists full_name;
alter table public.profiles drop column if exists updated_at;

-- =====================================================
-- EVENTS
-- =====================================================

create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  organizer_id uuid references auth.users(id),
  title text not null,
  description text,
  location text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text default 'draft',
  created_at timestamptz default timezone('utc'::text, now())
);

alter table public.events
  add column if not exists organizer_id uuid,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz,
  add column if not exists status text,
  add column if not exists created_at timestamptz default timezone('utc'::text, now());

update public.events set end_date = start_date where end_date is null and start_date is not null;

alter table public.events
  alter column title set not null,
  alter column start_date set not null,
  alter column end_date set not null,
  alter column status set default 'draft';

-- Migração de enum antigo para texto (quando existir)
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'events'
       and column_name = 'status'
       and udt_name = 'event_status'
  ) then
    alter table public.events
      alter column status type text using status::text;
  end if;
end
$$;

update public.events
   set status = 'draft'
 where status is null or status not in ('draft', 'published', 'cancelled', 'ended');

alter table public.events
  drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check check (status in ('draft', 'published', 'cancelled', 'ended'));

-- FK para auth.users no modelo atual
alter table public.events drop constraint if exists events_organizer_id_fkey;
alter table public.events
  add constraint events_organizer_id_fkey
  foreign key (organizer_id) references auth.users(id);

-- Remove colunas legadas fora do modelo atual
alter table public.events drop column if exists image_url;
alter table public.events drop column if exists updated_at;

-- =====================================================
-- TICKET_BATCHES
-- =====================================================

create table if not exists public.ticket_batches (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) not null,
  name text not null,
  price_cents integer not null,
  service_fee_percent numeric(5,2) default 0,
  min_service_fee_cents integer default 0,
  total_quantity integer not null,
  sold_quantity integer default 0,
  is_active boolean default true,
  created_at timestamptz default timezone('utc'::text, now())
);

alter table public.ticket_batches
  add column if not exists event_id uuid,
  add column if not exists name text,
  add column if not exists price_cents integer,
  add column if not exists service_fee_percent numeric(5,2) default 0,
  add column if not exists min_service_fee_cents integer default 0,
  add column if not exists total_quantity integer,
  add column if not exists sold_quantity integer default 0,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default timezone('utc'::text, now());

update public.ticket_batches set sold_quantity = 0 where sold_quantity is null;
update public.ticket_batches set min_service_fee_cents = 0 where min_service_fee_cents is null;
update public.ticket_batches set service_fee_percent = 0 where service_fee_percent is null;
update public.ticket_batches set is_active = true where is_active is null;

alter table public.ticket_batches
  alter column event_id set not null,
  alter column name set not null,
  alter column price_cents set not null,
  alter column total_quantity set not null,
  alter column sold_quantity set default 0,
  alter column is_active set default true;

alter table public.ticket_batches
  drop constraint if exists ticket_batches_price_cents_check,
  drop constraint if exists ticket_batches_total_quantity_check,
  drop constraint if exists ticket_batches_sold_quantity_check,
  drop constraint if exists ticket_batches_min_service_fee_cents_check,
  drop constraint if exists ticket_batches_sold_not_gt_total;

alter table public.ticket_batches
  add constraint ticket_batches_price_cents_check check (price_cents >= 0),
  add constraint ticket_batches_total_quantity_check check (total_quantity >= 0),
  add constraint ticket_batches_sold_quantity_check check (sold_quantity >= 0),
  add constraint ticket_batches_min_service_fee_cents_check check (min_service_fee_cents >= 0),
  add constraint ticket_batches_sold_not_gt_total check (sold_quantity <= total_quantity);

alter table public.ticket_batches drop column if exists start_date;
alter table public.ticket_batches drop column if exists end_date;

-- =====================================================
-- ORDERS
-- =====================================================

create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  event_id uuid references public.events(id) not null,
  status text default 'pending',
  total_amount_cents integer not null,
  external_reference text,
  items_snapshot jsonb not null,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.orders
  add column if not exists user_id uuid,
  add column if not exists event_id uuid,
  add column if not exists status text,
  add column if not exists total_amount_cents integer,
  add column if not exists external_reference text,
  add column if not exists items_snapshot jsonb,
  add column if not exists created_at timestamptz default timezone('utc'::text, now()),
  add column if not exists updated_at timestamptz default timezone('utc'::text, now());

-- Migração de enum antigo para texto (quando existir)
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'orders'
       and column_name = 'status'
       and udt_name = 'order_status'
  ) then
    alter table public.orders
      alter column status type text using status::text;
  end if;
end
$$;

update public.orders set status = 'pending' where status is null or status not in ('pending', 'approved', 'rejected');
update public.orders set items_snapshot = '[]'::jsonb where items_snapshot is null;

alter table public.orders
  alter column status set default 'pending',
  alter column user_id set not null,
  alter column event_id set not null,
  alter column total_amount_cents set not null,
  alter column items_snapshot set not null;

alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_total_amount_cents_check;

alter table public.orders
  add constraint orders_status_check check (status in ('pending', 'approved', 'rejected')),
  add constraint orders_total_amount_cents_check check (total_amount_cents >= 0);

-- Ajusta FKs ao modelo atual
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey foreign key (user_id) references auth.users(id);

-- Legado Mercado Pago -> coluna única de referência externa
alter table public.orders drop column if exists mp_preference_id;
alter table public.orders drop column if exists mp_payment_id;

-- =====================================================
-- TICKETS
-- =====================================================

create table if not exists public.tickets (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) not null,
  batch_id uuid references public.ticket_batches(id) not null,
  user_id uuid references auth.users(id) not null,
  guest_name text,
  status text default 'valid',
  paid_price_cents integer not null,
  paid_fee_cents integer not null,
  purchased_at timestamptz default timezone('utc'::text, now()),
  used_at timestamptz
);

alter table public.tickets
  add column if not exists event_id uuid,
  add column if not exists batch_id uuid,
  add column if not exists user_id uuid,
  add column if not exists guest_name text,
  add column if not exists status text,
  add column if not exists paid_price_cents integer,
  add column if not exists paid_fee_cents integer,
  add column if not exists purchased_at timestamptz default timezone('utc'::text, now()),
  add column if not exists used_at timestamptz;

-- Migração de enum antigo para texto (quando existir)
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'tickets'
       and column_name = 'status'
       and udt_name = 'ticket_status'
  ) then
    alter table public.tickets
      alter column status type text using status::text;
  end if;
end
$$;

update public.tickets set status = 'valid' where status is null or status not in ('valid', 'used', 'refunded');
update public.tickets set paid_price_cents = 0 where paid_price_cents is null;
update public.tickets set paid_fee_cents = 0 where paid_fee_cents is null;

alter table public.tickets
  alter column event_id set not null,
  alter column batch_id set not null,
  alter column user_id set not null,
  alter column paid_price_cents set not null,
  alter column paid_fee_cents set not null,
  alter column status set default 'valid';

alter table public.tickets
  drop constraint if exists tickets_status_check,
  drop constraint if exists tickets_paid_price_cents_check,
  drop constraint if exists tickets_paid_fee_cents_check;

alter table public.tickets
  add constraint tickets_status_check check (status in ('valid', 'used', 'refunded')),
  add constraint tickets_paid_price_cents_check check (paid_price_cents >= 0),
  add constraint tickets_paid_fee_cents_check check (paid_fee_cents >= 0);

-- Ajusta FKs ao modelo atual
alter table public.tickets drop constraint if exists tickets_user_id_fkey;
alter table public.tickets
  add constraint tickets_user_id_fkey foreign key (user_id) references auth.users(id);

-- Migra coluna legada validated_at para used_at quando necessário
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tickets' and column_name = 'validated_at'
  ) then
    update public.tickets
       set used_at = coalesce(used_at, validated_at)
     where validated_at is not null;

    alter table public.tickets drop column validated_at;
  end if;
end
$$;

-- Remove colunas legadas fora do modelo atual
alter table public.tickets drop column if exists validated_by;
alter table public.tickets drop column if exists qr_hash;
alter table public.tickets drop column if exists created_at;

-- =====================================================
-- AUTOMAÇÕES
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_orders_set_updated_at on public.orders;
create trigger trg_orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.increment_ticket_sold(batch_id_input uuid, quantity_input int default 1)
returns void
language plpgsql
security definer
as $$
begin
  if quantity_input <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  update public.ticket_batches
     set sold_quantity = sold_quantity + quantity_input
   where id = batch_id_input;

  if not found then
    raise exception 'batch not found';
  end if;
end;
$$;

-- =====================================================
-- RLS E POLÍTICAS
-- =====================================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_batches enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;

-- profiles
drop policy if exists profiles_select_own_or_staff_admin on public.profiles;
create policy profiles_select_own_or_staff_admin
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
);

-- events
drop policy if exists events_select_published on public.events;
create policy events_select_published
on public.events
for select
using (status = 'published');

drop policy if exists events_admin_all on public.events;
create policy events_admin_all
on public.events
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- ticket_batches
drop policy if exists ticket_batches_select_active on public.ticket_batches;
create policy ticket_batches_select_active
on public.ticket_batches
for select
using (is_active = true);

drop policy if exists ticket_batches_admin_all on public.ticket_batches;
create policy ticket_batches_admin_all
on public.ticket_batches
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- orders
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
on public.orders
for select
using (user_id = auth.uid());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
on public.orders
for insert
with check (user_id = auth.uid());

-- tickets
drop policy if exists tickets_select_own on public.tickets;
create policy tickets_select_own
on public.tickets
for select
using (user_id = auth.uid());

drop policy if exists tickets_staff_admin_update on public.tickets;
create policy tickets_staff_admin_update
on public.tickets
for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);
