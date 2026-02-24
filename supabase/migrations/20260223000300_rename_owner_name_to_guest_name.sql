-- Corrige inconsistência de nomenclatura na tabela tickets
-- O banco tinha owner_name (NOT NULL) e guest_name
-- Vamos migrar dados e remover owner_name

-- Copia dados de owner_name para guest_name (se necessário)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' 
      and table_name = 'tickets' 
      and column_name = 'owner_name'
  ) then
    -- Copia dados apenas se guest_name estiver NULL
    update public.tickets 
    set guest_name = coalesce(guest_name, owner_name)
    where owner_name is not null;
    
    -- Remove a constraint NOT NULL se existir
    alter table public.tickets alter column owner_name drop not null;
    
    -- Remove a coluna owner_name
    alter table public.tickets drop column owner_name;
  end if;
end
$$;

-- Garante que guest_name permita NULL (não é obrigatório)
alter table public.tickets
  alter column guest_name drop not null;
