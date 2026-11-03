-- Salva o método de pagamento da ordem para calcular a taxa real do Mercado Pago
-- (pix, credit_card, debit_card, prepaid_card, account_money, ticket...).

alter table public.orders
  add column if not exists payment_method text;

-- O painel admin lê tickets com a ordem embutida usando a sessão do usuário,
-- então o admin precisa de SELECT nas duas tabelas.
drop policy if exists orders_admin_select on public.orders;
create policy orders_admin_select
on public.orders for select
to authenticated
using (public.get_my_role() = 'admin');

drop policy if exists tickets_admin_select on public.tickets;
create policy tickets_admin_select
on public.tickets for select
to authenticated
using (public.get_my_role() = 'admin');

-- Recria com o novo parâmetro; sem o drop ficariam duas sobrecargas da função.
drop function if exists public.process_approved_order_payment(uuid, text, text);

create or replace function public.process_approved_order_payment(
  p_order_id uuid,
  p_payment_id text,
  p_guest_name text default 'Convidado',
  p_payment_method text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_batch_id uuid;
  v_quantity integer;
  v_unit_price_cents integer;
  v_fee_cents integer;
begin
  -- Lock pessimista na ordem para serializar webhooks concorrentes da mesma compra.
  select *
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- Idempotência: se já aprovou, não recria ingressos.
  if v_order.status = 'approved' then
    return 'already_processed';
  end if;

  if v_order.items_snapshot is null then
    raise exception 'ORDER_ITEMS_MISSING';
  end if;

  for v_item in
    select value
      from jsonb_array_elements(v_order.items_snapshot)
  loop
    v_batch_id := (v_item->>'batch_id')::uuid;
    v_quantity := greatest(coalesce((v_item->>'quantity')::integer, 0), 0);
    v_unit_price_cents := greatest(coalesce((v_item->>'unit_price_cents')::integer, 0), 0);
    v_fee_cents := greatest(coalesce((v_item->>'fee_cents')::integer, 0), 0);

    if v_quantity = 0 then
      continue;
    end if;

    perform public.increment_ticket_sold(v_batch_id, v_quantity);

    insert into public.tickets (
      order_id,
      event_id,
      batch_id,
      user_id,
      status,
      paid_price_cents,
      paid_fee_cents,
      guest_name
    )
    select
      v_order.id,
      v_order.event_id,
      v_batch_id,
      v_order.user_id,
      'valid'::public.ticket_status,
      v_unit_price_cents,
      v_fee_cents,
      coalesce(nullif(p_guest_name, ''), 'Convidado')
    from generate_series(1, v_quantity);
  end loop;

  update public.orders
     set status = 'approved',
         mp_payment_id = p_payment_id,
         payment_method = coalesce(p_payment_method, payment_method),
         updated_at = now()
   where id = v_order.id;

  return 'processed';
end;
$$;

-- Só o webhook (service_role) pode aprovar pagamentos; sem isso, qualquer usuário
-- conseguiria chamar a função via RPC e gerar ingressos sem pagar.
revoke execute on function public.process_approved_order_payment(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.process_approved_order_payment(uuid, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
