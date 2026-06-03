-- Atualiza a função de expiração de pedidos para usar 5 minutos como padrão
-- e adiciona trigger para cancelar automaticamente pedidos expirados

-- Recria a função com default de 5 minutos
create or replace function public.expire_stale_pending_orders(p_minutes integer default 5)
returns integer
language plpgsql
security definer
as $$
declare
  updated_count integer;
begin
  if p_minutes <= 0 then
    raise exception 'p_minutes must be greater than zero';
  end if;

  update public.orders
     set status = 'cancelled',
         updated_at = now()
   where status = 'pending'
     and created_at < now() - make_interval(mins => p_minutes);

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- Função para verificar se um pedido expirou (útil para consultas)
create or replace function public.is_order_expired(order_created_at timestamptz)
returns boolean
language sql
immutable
as $$
  select order_created_at < now() - interval '5 minutes';
$$;

-- Adiciona comentário explicativo
comment on function public.expire_stale_pending_orders is 
  'Expira pedidos pendentes que ultrapassaram o tempo limite (padrão: 5 minutos). Muda status para cancelled.';

comment on function public.is_order_expired is 
  'Verifica se um pedido expirou (mais de 5 minutos desde a criação).';
