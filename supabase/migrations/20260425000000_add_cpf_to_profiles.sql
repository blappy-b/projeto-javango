-- =====================================================
-- Migration: Add CPF to profiles and update user trigger
-- =====================================================
-- 
-- 1. Adds CPF column to profiles table
-- 2. Updates the trigger to capture full_name and cpf from auth metadata
-- =====================================================

-- ============================================
-- PART 1: Add CPF column to profiles
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Index for efficient CPF lookups (unique per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf 
  ON public.profiles(cpf) 
  WHERE cpf IS NOT NULL;

-- ============================================
-- PART 2: Update trigger to capture metadata
-- ============================================

-- Função atualizada que cria o perfil capturando cpf
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, cpf, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'cpf',
    'student' -- role padrão (constraint permite: admin, staff, student)
  )
  ON CONFLICT (id) DO UPDATE SET
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf);
  
  RETURN NEW;
END;
$$;

-- O trigger já existe, basta recriar a função
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_new_user();
