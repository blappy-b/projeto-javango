-- Adiciona coluna end_date na tabela ticket_batches se não existir
-- Esta coluna é usada para definir a data de expiração do lote de ingressos

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ticket_batches'
      AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.ticket_batches
    ADD COLUMN end_date timestamptz;
    
    COMMENT ON COLUMN public.ticket_batches.end_date IS 'Data de expiração do lote. Após essa data, o lote não estará mais disponível para compra.';
  END IF;
END
$$;

-- Cria índice para consultas por data de expiração
CREATE INDEX IF NOT EXISTS idx_ticket_batches_end_date ON public.ticket_batches (end_date)
WHERE end_date IS NOT NULL;
