-- Corrige recursão infinita na política de RLS da tabela profiles

-- Remove todas as políticas antigas
drop policy if exists profiles_select_own_or_staff_admin on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

-- Política simples: cada usuário pode ver seu próprio perfil
create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());

-- Política para permitir insert do próprio perfil (necessário para o trigger de criação)
create policy profiles_insert_own
on public.profiles
for insert
with check (id = auth.uid());

-- Política para permitir update do próprio perfil
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- NOTA: Se admins/staff precisarem ver outros perfis, isso deve ser feito
-- via Service Role Key no backend, não via RLS que causa recursão
