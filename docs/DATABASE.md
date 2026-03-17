# Banco de Dados (Supabase/Postgres)

## Visão Geral
- Banco: **PostgreSQL via Supabase**.
- Autenticação: gerenciada por `auth.users`.
- Financeiro: valores monetários em **inteiros (centavos)** para evitar arredondamento (`price_cents`, `total_amount_cents`, etc.).
- Segurança: **RLS (Row Level Security)** habilitado nas tabelas públicas.

## Tabelas Principais

### `public.profiles`
Extensão de `auth.users` para RBAC (1:1).

- `id uuid` PK/FK -> `auth.users(id)`
- `email text`
- `role text default 'student'` (`admin`, `staff`, `student`)
- `created_at timestamptz default timezone('utc', now())`

### `public.events`
Shows, recitais e apresentações.

- `id uuid` PK
- `organizer_id uuid` FK -> `auth.users(id)`
- `title text not null`
- `description text`
- `location text`
- `start_date timestamptz not null`
- `end_date timestamptz not null`
- `status text default 'draft'` (`draft`, `published`, `cancelled`, `ended`)
- `created_at timestamptz default timezone('utc', now())`

### `public.ticket_batches`
Regras de preço e estoque por lote.

- `id uuid` PK
- `event_id uuid` FK -> `public.events(id)`
- `name text not null`
- `price_cents integer not null`
- `service_fee_percent numeric(5,2) default 0`
- `min_service_fee_cents integer default 0`
- `total_quantity integer not null`
- `sold_quantity integer default 0`
- `is_active boolean default true`
- `created_at timestamptz default timezone('utc', now())`

### `public.orders`
Carrinho/checkout com snapshot imutável dos itens.

- `id uuid` PK
- `user_id uuid` FK -> `auth.users(id)`
- `event_id uuid` FK -> `public.events(id)`
- `status text default 'pending'` (`pending`, `approved`, `rejected`)
- `total_amount_cents integer not null`
- `external_reference text`
- `items_snapshot jsonb not null`
- `created_at timestamptz default timezone('utc', now())`
- `updated_at timestamptz default timezone('utc', now())`

### `public.tickets`
Ingresso final (QR) criado após aprovação.

- `id uuid` PK (conteúdo do QR)
- `event_id uuid` FK -> `public.events(id)`
- `batch_id uuid` FK -> `public.ticket_batches(id)`
- `user_id uuid` FK -> `auth.users(id)`
- `guest_name text`
- `cpf text` — CPF do participante (para validação manual na portaria)
- `status text default 'valid'` (`valid`, `used`, `refunded`)
- `paid_price_cents integer not null`
- `paid_fee_cents integer not null`
- `purchased_at timestamptz default timezone('utc', now())`
- `used_at timestamptz`
- `validated_at timestamptz` — momento da validação
- `validated_by uuid` FK -> `auth.users(id)` — quem validou

### `public.staff_assignments`
Vinculação de membros da equipe a eventos específicos.

- `id uuid` PK
- `staff_id uuid` FK -> `public.profiles(id)` ON DELETE CASCADE
- `event_id uuid` FK -> `public.events(id)` ON DELETE CASCADE
- `created_at timestamptz default now()`
- UNIQUE constraint em `(staff_id, event_id)`

## Automações e Funções

### Trigger de criação automática de perfil
- Função: `public.handle_new_user()`
- Trigger: `on_auth_user_created` em `auth.users`
- Efeito: cria `public.profiles` com role inicial `student`.

### RPC de estoque
- Função: `public.increment_ticket_sold(batch_id_input uuid, quantity_input int default 1)`
- Uso: webhook de pagamento para incremento de `sold_quantity`.

## RLS (Resumo)

- `profiles`
  - SELECT: próprio usuário ou `admin/staff`.
- `events`
  - SELECT: eventos `published`.
  - INSERT/UPDATE/DELETE: apenas `admin`.
- `ticket_batches`
  - SELECT: lotes ativos (`is_active = true`).
  - INSERT/UPDATE/DELETE: apenas `admin`.
- `orders`
  - SELECT: próprio dono (`user_id = auth.uid()`).
  - INSERT: próprio dono.
  - UPDATE: feito por fluxo de serviço/webhook.
- `tickets`
  - SELECT: próprio dono OU staff atribuído ao evento.
  - UPDATE (check-in): `staff` (somente eventos atribuídos) e `admin`.
- `staff_assignments`
  - SELECT: próprio staff ou `admin`.
  - INSERT/DELETE: apenas `admin`.
