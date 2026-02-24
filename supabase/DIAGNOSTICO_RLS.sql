-- Script de diagnóstico para verificar políticas RLS e dados
-- Execute no SQL Editor do Supabase

-- 1. Verifica se RLS está ativado nas tabelas
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tickets', 'events', 'ticket_batches', 'orders')
ORDER BY tablename;

-- 2. Lista todas as políticas da tabela tickets
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'tickets';

-- 3. Lista todas as políticas da tabela events
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'events';

-- 4. Lista todas as políticas da tabela ticket_batches
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'ticket_batches';

-- 5. Conta tickets por usuário (use seu user_id)
SELECT user_id, COUNT(*) as total_tickets
FROM tickets
GROUP BY user_id;

-- 6. Verifica tickets com detalhes
SELECT 
  t.id,
  t.user_id,
  t.event_id,
  t.batch_id,
  t.status,
  t.purchased_at,
  e.title as event_title,
  tb.name as batch_name
FROM tickets t
LEFT JOIN events e ON e.id = t.event_id
LEFT JOIN ticket_batches tb ON tb.id = t.batch_id
ORDER BY t.purchased_at DESC
LIMIT 10;

-- 7. Verifica orders
SELECT 
  id,
  user_id,
  event_id,
  status,
  total_amount_cents,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;
