-- =====================================================
-- FIX: Corrige função handle_new_user
-- =====================================================
-- 
-- A versão anterior referenciava colunas que não existem:
-- - full_name (removida em 20260210203000)
-- - updated_at (removida em 20260210203000)
-- - role 'customer' (constraint só permite admin/staff/student)
-- =====================================================

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
