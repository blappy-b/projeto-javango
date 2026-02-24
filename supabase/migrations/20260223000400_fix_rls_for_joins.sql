-- Adiciona políticas faltantes que podem estar bloqueando JOINs

-- Permite que qualquer usuário autenticado leia eventos publicados
-- (necessário para o JOIN funcionar em my-tickets)
drop policy if exists events_select_public on public.events;
create policy events_select_public
on public.events
for select
using (
  status = 'published' 
  OR 
  exists (
    select 1 from public.tickets t
    where t.event_id = events.id 
      and t.user_id = auth.uid()
  )
);

-- Permite que qualquer usuário autenticado leia ticket_batches ativos
-- ou batches de tickets que ele possui
drop policy if exists ticket_batches_select_public on public.ticket_batches;
create policy ticket_batches_select_public
on public.ticket_batches
for select
using (
  is_active = true
  OR
  exists (
    select 1 from public.tickets t
    where t.batch_id = ticket_batches.id 
      and t.user_id = auth.uid()
  )
);

-- Remove políticas antigas que podem conflitar
drop policy if exists events_select_published on public.events;
drop policy if exists ticket_batches_select_active on public.ticket_batches;

-- Corrige política de update de tickets para não usar recursão
drop policy if exists tickets_staff_admin_update on public.tickets;
create policy tickets_staff_admin_update
on public.tickets
for update
using (
  user_id = auth.uid()
  OR
  auth.jwt() ->> 'role' = 'service_role'
)
with check (
  user_id = auth.uid()
  OR
  auth.jwt() ->> 'role' = 'service_role'
);
