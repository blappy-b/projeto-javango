-- =====================================================
-- Migration: Função para verificar unicidade de CPF
-- =====================================================
-- 
-- Garante que um CPF não seja vinculado a duas contas.
-- Usa SECURITY DEFINER para ignorar RLS e verificar sem autenticação.
-- =====================================================

-- Função pública que pode ser chamada antes do registro
CREATE OR REPLACE FUNCTION public.check_cpf_available(cpf_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf_clean TEXT;
  cpf_exists BOOLEAN;
BEGIN
  -- Remove caracteres não numéricos
  cpf_clean := regexp_replace(cpf_input, '\D', '', 'g');
  
  -- Verifica se CPF já está cadastrado
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE cpf = cpf_clean
  ) INTO cpf_exists;
  
  -- Retorna TRUE se disponível, FALSE se já existe
  RETURN NOT cpf_exists;
END;
$$;

-- Permite que usuários anônimos chamem essa função (para registro)
GRANT EXECUTE ON FUNCTION public.check_cpf_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_cpf_available(TEXT) TO authenticated;
