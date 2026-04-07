-- =====================================================
-- Cria trigger para sincronizar auth.users -> profiles
-- =====================================================
-- 
-- Garante que sempre que um usuário for criado no Supabase Auth,
-- automaticamente um perfil correspondente seja criado na tabela profiles.
-- =====================================================

-- Função que cria o perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'student' -- role padrão
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Cria o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Sincroniza usuários existentes
INSERT INTO public.profiles (id, email, role)
SELECT 
  u.id, 
  u.email,
  'student'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
