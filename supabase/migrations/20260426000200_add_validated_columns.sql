-- Adiciona colunas validated_at e validated_by à tabela tickets
-- Estas colunas foram removidas anteriormente mas são necessárias para o fluxo de validação

-- Adiciona validated_at (quando o ingresso foi validado/usado)
alter table public.tickets 
  add column if not exists validated_at timestamptz;

-- Adiciona validated_by (quem validou o ingresso)
alter table public.tickets 
  add column if not exists validated_by uuid references public.profiles(id) on delete set null;

-- Migra dados de used_at para validated_at se existirem
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tickets' and column_name = 'used_at'
  ) then
    update public.tickets
       set validated_at = coalesce(validated_at, used_at)
     where used_at is not null and validated_at is null;
  end if;
end
$$;

-- Cria índice para consultas por validated_by
create index if not exists idx_tickets_validated_by on public.tickets(validated_by);

comment on column public.tickets.validated_at is 'Momento em que o ingresso foi validado na entrada';
comment on column public.tickets.validated_by is 'ID do staff/admin que validou o ingresso';
