# Banco de Dados (Supabase/Postgres)

Este documento descreve o estado **atual** do banco de dados com base na cópia do Schema Visualizer do Supabase enviada no contexto do projeto.

## Visão geral

O modelo está centrado em cinco tabelas:

- `profiles`: dados de perfil dos usuários autenticados.
- `events`: eventos cadastrados pelos organizadores.
- `ticket_batches`: lotes de ingressos por evento.
- `orders`: pedidos de compra de ingressos.
- `tickets`: ingressos emitidos por pedido/lote, com validação por QR.

## Tabelas e campos

### `public.profiles`

Representa o perfil da aplicação para cada usuário do Supabase Auth.

- `id` (`uuid`, PK, FK -> `auth.users.id`)
- `full_name` (`text`, opcional)
- `email` (`text`, opcional)
- `role` (`user_role`, default: `customer`)
- `created_at` (`timestamptz`, default: `now()`)
- `updated_at` (`timestamptz`, default: `now()`)

### `public.events`

Cadastro de eventos.

- `id` (`uuid`, PK, default: `uuid_generate_v4()`)
- `title` (`text`, obrigatório)
- `description` (`text`, opcional)
- `location` (`text`, opcional)
- `start_date` (`timestamptz`, obrigatório)
- `end_date` (`timestamptz`, opcional)
- `image_url` (`text`, opcional)
- `status` (`event_status`, default: `draft`)
- `organizer_id` (`uuid`, FK -> `public.profiles.id`)
- `created_at` (`timestamptz`, default: `now()`)
- `updated_at` (`timestamptz`, default: `now()`)

### `public.ticket_batches`

Lotes de ingressos por evento.

- `id` (`uuid`, PK, default: `uuid_generate_v4()`)
- `event_id` (`uuid`, obrigatório, FK -> `public.events.id`)
- `name` (`text`, obrigatório)
- `price_cents` (`integer`, obrigatório)
- `service_fee_percent` (`numeric`, default: `0`)
- `min_service_fee_cents` (`integer`, default: `0`)
- `total_quantity` (`integer`, obrigatório)
- `sold_quantity` (`integer`, default: `0`)
- `is_active` (`boolean`, default: `false`)
- `start_date` (`timestamptz`, opcional)
- `end_date` (`timestamptz`, opcional)
- `created_at` (`timestamptz`, default: `now()`)

### `public.orders`

Pedidos de compra.

- `id` (`uuid`, PK, default: `uuid_generate_v4()`)
- `user_id` (`uuid`, FK -> `public.profiles.id`)
- `event_id` (`uuid`, FK -> `public.events.id`)
- `total_amount_cents` (`integer`, obrigatório)
- `mp_preference_id` (`text`, opcional)
- `mp_payment_id` (`text`, opcional)
- `status` (`order_status`, default: `pending`)
- `created_at` (`timestamptz`, default: `now()`)
- `updated_at` (`timestamptz`, default: `now()`)
- `items_snapshot` (`jsonb`, opcional)

### `public.tickets`

Ingressos individuais gerados a partir dos pedidos.

- `id` (`uuid`, PK, default: `uuid_generate_v4()`)
- `order_id` (`uuid`, obrigatório, FK -> `public.orders.id`)
- `batch_id` (`uuid`, obrigatório, FK -> `public.ticket_batches.id`)
- `owner_name` (`text`, obrigatório)
- `qr_hash` (`text`, único)
- `status` (`ticket_status`, default: `valid`)
- `validated_at` (`timestamptz`, opcional)
- `validated_by` (`uuid`, FK -> `public.profiles.id`)
- `created_at` (`timestamptz`, default: `now()`)

## Relacionamentos

- `profiles (1) -> (N) events` via `events.organizer_id`
- `events (1) -> (N) ticket_batches` via `ticket_batches.event_id`
- `profiles (1) -> (N) orders` via `orders.user_id`
- `events (1) -> (N) orders` via `orders.event_id`
- `orders (1) -> (N) tickets` via `tickets.order_id`
- `ticket_batches (1) -> (N) tickets` via `tickets.batch_id`
- `profiles (1) -> (N) tickets validados` via `tickets.validated_by`

## Tipos customizados (enums)

O schema referencia os tipos:

- `user_role`
- `event_status`
- `order_status`
- `ticket_status`

Os valores possíveis de cada enum não foram incluídos na exportação enviada (somente defaults observados: `customer`, `draft`, `pending`, `valid`).

## Observações

- Este documento é **descritivo** do estado atual e não substitui migrations SQL versionadas.
- O schema original recebido continha o aviso de contexto (“not meant to be run”), então a ordem de criação e constraints pode exigir ajustes em uma execução real.
