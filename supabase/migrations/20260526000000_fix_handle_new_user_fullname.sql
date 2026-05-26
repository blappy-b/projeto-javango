-- =====================================================
-- Migration: Add full_name column and fix handle_new_user
-- =====================================================
-- 
-- 1. Adiciona coluna full_name à tabela profiles (foi removida por engano)
-- 2. Corrige o trigger para capturar full_name do metadata
-- =====================================================

-- Adiciona coluna full_name se não existir
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Corrige função para capturar full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, cpf, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'cpf',
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf);
  
  RETURN NEW;
END;
$$;
