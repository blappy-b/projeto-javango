# Migrations do Banco (Supabase)

## Decisão técnica
Para este projeto, adotamos **SQL migrations nativas do Supabase/Postgres**.

### Por que essa escolha faz sentido aqui
- O app já usa `@supabase/supabase-js` diretamente em toda a camada de dados.
- As regras mais importantes do domínio (ex.: `increment_ticket_sold`, `delete_event_if_no_sales`) dependem de **funções SQL/RPC**, que ficam mais claras e auditáveis em migrations SQL versionadas.
- Mantemos compatibilidade total com o fluxo recomendado do Supabase (`supabase db push`, histórico em `supabase/migrations`).

> Embora ORMs sejam úteis em muitos cenários, nesta stack o ganho principal está em manter o schema e as regras de banco no próprio Postgres, de forma explícita e versionada.

## Estrutura criada
- Migration inicial: `supabase/migrations/20260209144000_initial_schema.sql`
  - Criação de enums (`user_role`, `event_status`, `order_status`, `ticket_status`)
  - Tabelas: `profiles`, `events`, `ticket_batches`, `orders`, `tickets`
  - Índices, constraints e triggers de `updated_at`
  - RPCs: `increment_ticket_sold` e `delete_event_if_no_sales`

## Como aplicar
Pré-requisito: Supabase CLI instalada e projeto linkado.

```bash
supabase db push
```

## Fluxo para novas migrations
1. Criar novo arquivo em `supabase/migrations` com timestamp no nome.
2. Escrever as alterações de schema de forma incremental.
3. Aplicar local/remoto com:

```bash
supabase db push
```

4. Versionar no Git junto com a mudança de código que depende da migration.


## Troubleshooting
### Erro no `supabase db push`: `type "user_role" already exists`
Esse erro acontece quando o banco remoto já possui objetos do schema inicial (tipos, tabelas, índices etc.), mas **a versão da migration não está registrada** em `supabase_migrations.schema_migrations`.

O arquivo `20260209144000_initial_schema.sql` foi ajustado para ser **idempotente**:
- enums protegidos com checagem de existência em `pg_type`
- `create table if not exists`
- `create index if not exists`
- `drop trigger if exists` antes de recriar trigger

- índices da tabela `tickets` agora só são criados quando as colunas alvo existem (protege cenários de drift como `column "user_id" does not exist`)

Assim, ao reaplicar a migration, o push não quebra por objetos já existentes.

Se seu ambiente remoto já está com schema criado manualmente, rode novamente:

```bash
supabase db push
```

Se ainda houver divergência de histórico, valide as versões em `supabase_migrations.schema_migrations` e ajuste o estado antes de novas migrations.



### Erro no `supabase db push`: `cannot remove parameter defaults from existing function (SQLSTATE 42P13)`
Esse erro ocorre quando uma migration usa `create or replace function` para uma função já existente, mas com assinatura incompatível em relação a parâmetros com `default`.

Boas práticas para evitar:
- Se a função já existe com `default` em algum parâmetro, **preserve o `default`** na nova definição.
- Se você realmente precisa remover/adicionar defaults incompatíveis, prefira:
  1. `drop function ...` com assinatura exata, e depois
  2. recriar a função com a nova assinatura (avaliando impacto em chamadas RPC e dependências).

Neste projeto, `public.increment_ticket_sold` deve manter `quantity_input ... default 1` em todas as migrations onde for redefinida.

## Migração de alinhamento do schema atual
- Arquivo: `supabase/migrations/20260210203000_align_schema_to_current_db_spec.sql`
- Objetivo: alinhar o banco ao modelo atual do projeto (RBAC com `student/staff/admin`, status em `text`, FKs para `auth.users`, trigger `handle_new_user`, RPC de estoque e RLS).
- Observação: a migration usa abordagens defensivas (`if exists` / `if not exists`) para reduzir falhas em ambientes com drift de schema.

## Migração de CPF e vinculação de staff
- Arquivo: `supabase/migrations/20260228000000_add_cpf_and_staff_assignments.sql`
- Objetivo: adicionar campo `cpf` aos tickets para busca manual na portaria e criar tabela `staff_assignments` para vincular staff a eventos específicos.
- Alterações:
  - Coluna `cpf text` em `tickets` (com índices para busca).
  - Tabela `staff_assignments` com UNIQUE constraint em `(staff_id, event_id)`.
  - Políticas RLS para staff acessar apenas tickets de eventos atribuídos.
