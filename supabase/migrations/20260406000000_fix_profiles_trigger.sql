-- =====================================================
-- FIX: Remove trigger órfão de updated_at em profiles
-- =====================================================
-- 
-- Problema: A coluna updated_at foi removida da tabela profiles
-- mas o trigger trg_profiles_set_updated_at ainda existe,
-- causando erro ao tentar atualizar a tabela.
--
-- Solução: Remover o trigger órfão.
-- =====================================================

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
