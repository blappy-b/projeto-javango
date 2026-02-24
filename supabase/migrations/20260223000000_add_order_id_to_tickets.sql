-- Adiciona coluna order_id à tabela tickets para rastrear a ordem de compra

alter table public.tickets
  add column if not exists order_id uuid references public.orders(id);

-- Cria índice para melhorar performance de queries por order_id
create index if not exists idx_tickets_order_id on public.tickets(order_id);

-- Adiciona coluna mp_payment_id à tabela orders para rastrear o ID do pagamento no Mercado Pago
alter table public.orders
  add column if not exists mp_payment_id text;

-- Cria índice para melhorar performance de queries por mp_payment_id
create index if not exists idx_orders_mp_payment_id on public.orders(mp_payment_id);
