-- Mantém consistência quando houver rollback da emissão de ingressos
create or replace function public.decrement_ticket_sold(batch_id_input uuid, quantity_input integer)
returns void
language plpgsql
security definer
as $$
declare
  current_sold integer;
begin
  if quantity_input <= 0 then
    raise exception 'quantity must be greater than zero';
  end if;

  select sold_quantity
    into current_sold
    from public.ticket_batches
   where id = batch_id_input
   for update;

  if not found then
    raise exception 'batch not found';
  end if;

  if current_sold - quantity_input < 0 then
    raise exception 'sold quantity cannot be negative';
  end if;

  update public.ticket_batches
     set sold_quantity = sold_quantity - quantity_input
   where id = batch_id_input;
end;
$$;

-- Expira pedidos pendentes antigos para evitar carrinho "travado"
create or replace function public.expire_stale_pending_orders(p_minutes integer default 30)
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
