# Como Executar as Migrations via Terminal

## Método 1: Via Supabase CLI (RECOMENDADO para produção)

### Passo 1: Configure a senha do banco
```powershell
# Crie um arquivo .env.local na raiz do projeto com:
SUPABASE_DB_PASSWORD=sua-senha-do-postgres-aqui
```

Ou defina diretamente no PowerShell:
```powershell
$env:SUPABASE_DB_PASSWORD="sua-senha-aqui"
```

### Passo 2: Execute o push das migrations
```powershell
supabase db push
```

**Se der erro de conexão**, você pode executar cada migration manualmente:

```powershell
# Migration 1: Order ID
supabase db execute --file supabase/migrations/20260223000000_add_order_id_to_tickets.sql

# Migration 2: Fix RLS
supabase db execute --file supabase/migrations/20260223000100_fix_profiles_rls_recursion.sql

# Migration 3: Image URL
supabase db execute --file supabase/migrations/20260223000200_add_image_url_to_events.sql
```

---

## Método 2: Via SQL Editor do Supabase (MAIS SIMPLES)

1. Acesse: https://app.supabase.com/project/vegnjnuqbglbvgawazmb/sql/new

2. Cole o conteúdo do arquivo `APPLY_ALL_MIGRATIONS.sql`

3. Clique em "Run"

---

## Método 3: Via Script Node.js

```powershell
node apply-migration.js
```

**Nota**: Este método pode não funcionar para DDL (Data Definition Language), então use preferencialmente os métodos 1 ou 2.

---

## Verificar se as migrations foram aplicadas

Execute no SQL Editor do Supabase:

```sql
-- Verificar coluna order_id em tickets
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'order_id';

-- Verificar coluna mp_payment_id em orders
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'mp_payment_id';

-- Verificar coluna image_url em events
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'image_url';

-- Verificar policies de profiles
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'profiles';
```

Deve retornar:
- `order_id` para tickets ✓
- `mp_payment_id` para orders ✓
- `image_url` para events ✓
- `profiles_select_own`, `profiles_insert_own`, `profiles_update_own` ✓

---

## Troubleshooting

### Erro: "Connection timeout"
- Use o Método 2 (SQL Editor) - é mais confiável

### Erro: "policy already exists"
- As migrations foram ajustadas com `DROP POLICY IF EXISTS`
- Execute novamente ou use `APPLY_ALL_MIGRATIONS.sql`

### Erro: "column already exists"
- Tudo bem! A migration usa `IF NOT EXISTS`
- A coluna já foi criada anteriormente

---

## Após aplicar as migrations

1. Reinicie o servidor Next.js:
   ```powershell
   npm run dev
   ```

2. Teste criar um evento com imagem

3. Teste fazer uma compra e verificar se os tickets aparecem
