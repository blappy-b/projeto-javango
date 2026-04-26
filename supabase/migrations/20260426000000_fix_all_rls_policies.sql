-- =====================================================
-- FIX: Corrige TODAS as políticas RLS
-- =====================================================
-- 
-- Problema: Políticas conflitantes e faltantes impedindo
-- que estudantes façam compras.
--
-- Solução: Remove todas as políticas e recria de forma correta.
-- =====================================================

-- =====================================================
-- FUNÇÃO HELPER: Verifica role sem causar recursão
-- =====================================================
-- Usa SECURITY DEFINER para ignorar RLS ao consultar profiles

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- =====================================================
-- PASSO 1: Remove TODAS as políticas existentes
-- =====================================================

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_staff_admin ON public.profiles;

-- events
DROP POLICY IF EXISTS events_select_published ON public.events;
DROP POLICY IF EXISTS events_select_public ON public.events;
DROP POLICY IF EXISTS events_admin_all ON public.events;

-- ticket_batches
DROP POLICY IF EXISTS ticket_batches_select_active ON public.ticket_batches;
DROP POLICY IF EXISTS ticket_batches_select_public ON public.ticket_batches;
DROP POLICY IF EXISTS ticket_batches_admin_all ON public.ticket_batches;

-- orders
DROP POLICY IF EXISTS orders_select_own ON public.orders;
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS orders_update_own ON public.orders;

-- tickets
DROP POLICY IF EXISTS tickets_select_own ON public.tickets;
DROP POLICY IF EXISTS tickets_insert_own ON public.tickets;
DROP POLICY IF EXISTS tickets_staff_admin_update ON public.tickets;
DROP POLICY IF EXISTS staff_read_assigned_event_tickets ON public.tickets;
DROP POLICY IF EXISTS staff_update_assigned_event_tickets ON public.tickets;

-- staff_assignments
DROP POLICY IF EXISTS staff_read_own_assignments ON public.staff_assignments;
DROP POLICY IF EXISTS admin_read_all_assignments ON public.staff_assignments;
DROP POLICY IF EXISTS admin_insert_assignments ON public.staff_assignments;
DROP POLICY IF EXISTS admin_delete_assignments ON public.staff_assignments;

-- =====================================================
-- PASSO 2: Garante RLS habilitado
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASSO 3: Recria políticas PROFILES
-- =====================================================
-- Regra: Usuário pode ver/editar APENAS seu próprio perfil
-- Admin/Staff acessam outros perfis via service_role no backend

-- SELECT: Próprio perfil
CREATE POLICY profiles_select_own
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- INSERT: Próprio perfil (para trigger de criação)
CREATE POLICY profiles_insert_own
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: Próprio perfil
CREATE POLICY profiles_update_own
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- =====================================================
-- PASSO 4: Recria políticas EVENTS
-- =====================================================
-- Regra: Qualquer um (mesmo anônimo) pode ver eventos publicados
-- Admin pode fazer tudo

-- SELECT: Eventos publicados (público)
CREATE POLICY events_select_published
ON public.events FOR SELECT
USING (status = 'published');

-- ALL: Admin pode tudo (usa função helper para evitar recursão)
CREATE POLICY events_admin_all
ON public.events FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- =====================================================
-- PASSO 5: Recria políticas TICKET_BATCHES
-- =====================================================
-- Regra: Qualquer um pode ver batches ativos de eventos publicados
-- Admin pode fazer tudo

-- SELECT: Batches ativos (público)
CREATE POLICY ticket_batches_select_active
ON public.ticket_batches FOR SELECT
USING (is_active = true);

-- ALL: Admin pode tudo (usa função helper para evitar recursão)
CREATE POLICY ticket_batches_admin_all
ON public.ticket_batches FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- =====================================================
-- PASSO 6: Recria políticas ORDERS
-- =====================================================
-- Regra: 
-- - Qualquer usuário autenticado pode criar orders (próprio user_id)
-- - Usuário pode ver suas próprias orders
-- - Webhook atualiza via service_role

-- SELECT: Próprias orders
CREATE POLICY orders_select_own
ON public.orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Qualquer autenticado pode criar order para si mesmo
CREATE POLICY orders_insert_own
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Próprias orders (para cancelamento, etc)
CREATE POLICY orders_update_own
ON public.orders FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PASSO 7: Recria políticas TICKETS
-- =====================================================
-- Regra:
-- - Usuário pode ver seus próprios tickets
-- - Tickets são inseridos pelo webhook (service_role)
-- - Staff pode ver/atualizar tickets de eventos atribuídos

-- SELECT: Próprios tickets
CREATE POLICY tickets_select_own
ON public.tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- SELECT: Staff vê tickets de eventos atribuídos
CREATE POLICY tickets_staff_select
ON public.tickets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.staff_id = auth.uid()
      AND sa.event_id = tickets.event_id
  )
);

-- UPDATE: Staff pode validar tickets de eventos atribuídos
CREATE POLICY tickets_staff_update
ON public.tickets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.staff_id = auth.uid()
      AND sa.event_id = tickets.event_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_assignments sa
    WHERE sa.staff_id = auth.uid()
      AND sa.event_id = tickets.event_id
  )
);

-- =====================================================
-- PASSO 8: Recria políticas STAFF_ASSIGNMENTS
-- =====================================================

-- SELECT: Staff vê próprias atribuições
CREATE POLICY staff_select_own_assignments
ON public.staff_assignments FOR SELECT
TO authenticated
USING (staff_id = auth.uid());

-- SELECT: Admin vê todas atribuições
CREATE POLICY staff_admin_select_all
ON public.staff_assignments FOR SELECT
TO authenticated
USING (public.get_my_role() = 'admin');

-- INSERT: Admin pode criar atribuições
CREATE POLICY staff_admin_insert
ON public.staff_assignments FOR INSERT
TO authenticated
WITH CHECK (public.get_my_role() = 'admin');

-- DELETE: Admin pode remover atribuições
CREATE POLICY staff_admin_delete
ON public.staff_assignments FOR DELETE
TO authenticated
USING (public.get_my_role() = 'admin');

-- =====================================================
-- PASSO 9: Força reload do schema cache
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- VERIFICAÇÃO: Comentário sobre como funciona
-- =====================================================
-- 
-- FLUXO DE COMPRA (estudante):
-- 1. Estudante vê eventos publicados (events_select_published) ✓
-- 2. Estudante vê batches ativos (ticket_batches_select_active) ✓
-- 3. Estudante cria order (orders_insert_own) ✓
-- 4. Webhook do Mercado Pago cria tickets (via service_role) ✓
-- 5. Webhook atualiza status da order (via service_role) ✓
-- 6. Estudante vê seus tickets (tickets_select_own) ✓
--
-- NOTA: Tickets são inseridos pelo webhook usando service_role,
-- que ignora RLS. Não é necessário política de INSERT para tickets
-- pois usuários nunca inserem tickets diretamente.
-- =====================================================
