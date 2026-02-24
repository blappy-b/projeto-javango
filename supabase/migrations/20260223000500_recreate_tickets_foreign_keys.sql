-- Recria as foreign keys da tabela tickets para corrigir o schema cache do PostgREST
-- Isso permite que o Supabase faça JOINs automáticos

-- Remove constraints antigas (pode já existir ou não)
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_event_id_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_batch_id_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_order_id_fkey;

-- Adiciona as foreign keys corretamente
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_event_id_fkey 
  FOREIGN KEY (event_id) 
  REFERENCES public.events(id) 
  ON DELETE CASCADE;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_batch_id_fkey 
  FOREIGN KEY (batch_id) 
  REFERENCES public.ticket_batches(id) 
  ON DELETE CASCADE;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_order_id_fkey 
  FOREIGN KEY (order_id) 
  REFERENCES public.orders(id) 
  ON DELETE SET NULL;

-- Força o PostgREST (API do Supabase) a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
