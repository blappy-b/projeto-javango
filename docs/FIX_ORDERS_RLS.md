# Fix: Políticas RLS da Tabela Orders

## Problema

Erro ao fazer checkout:
```
Erro checkout: {
  status: 403,
  code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES',
  message: 'At least one policy returned UNAUTHORIZED.',
  blocked_by: 'PolicyAgent'
}
```

---

## Estrutura das Tabelas (Referência)

### `profiles`
| Coluna | Tipo | Exemplo |
|--------|------|---------|
| id | uuid (PK, FK → auth.users) | `65163e42-c73b-4dba-a839-dacd3231a06f` |
| email | text | `staff@b.com` |
| role | text | `student`, `staff`, `admin` |
| cpf | text | `null` |
| created_at | timestamptz | `2026-04-06 23:43:08.697107+00` |

### `events`
| Coluna | Tipo | Exemplo |
|--------|------|---------|
| id | uuid (PK) | `aad77cc9-9a35-4fac-8fdf-b2895eec9954` |
| title | text | `panda pandinha` |
| description | text | `P a N d A` |
| location | text | `av engenheiro 123` |
| start_date | timestamptz | `2026-04-23 23:34:00+00` |
| end_date | timestamptz | `2026-04-23 03:34:00+00` |
| status | text | `draft`, `published`, `cancelled` |
| organizer_id | uuid (FK → auth.users) | `d1eaf43a-b876-478f-925c-c7251720a79c` |
| image_url | text | URL da imagem |
| created_at | timestamptz | `2026-02-24 02:34:43.465655+00` |
| updated_at | timestamptz | `2026-03-18 16:45:11.91121+00` |

### `ticket_batches`
| Coluna | Tipo | Exemplo |
|--------|------|---------|
| id | uuid (PK) | `ae6bd620-16a4-44bd-83f9-0348856a8dea` |
| event_id | uuid (FK → events) | `f7949ca1-9186-4e7e-994c-3e3bd017db31` |
| name | text | `ingressos crianças` |
| price_cents | integer | `0` (gratuito) |
| service_fee_percent | numeric(5,2) | `10.00` |
| min_service_fee_cents | integer | `200` |
| total_quantity | integer | `1` |
| sold_quantity | integer | `0` |
| is_active | boolean | `true` |
| created_at | timestamptz | `2026-04-25 20:20:10.848257+00` |

### `orders`
| Coluna | Tipo | Exemplo |
|--------|------|---------|
| id | uuid (PK) | `195413e2-b90b-4ec8-87cd-18689727cca8` |
| user_id | uuid (FK → auth.users) | `706e0e84-49c9-46ef-8af6-7131212ae53e` |
| event_id | uuid (FK → events) | `f7949ca1-9186-4e7e-994c-3e3bd017db31` |
| total_amount_cents | integer | `262` |
| status | text | `pending`, `approved`, `rejected` |
| items_snapshot | jsonb | `[{"name": "...", "batch_id": "...", ...}]` |
| external_reference | text | Ref externa (MP) |
| mp_payment_id | text | ID do pagamento MP |
| created_at | timestamptz | `2026-04-25 20:35:20.223452+00` |
| updated_at | timestamptz | `2026-04-25 20:35:20.223452+00` |

### `tickets`
| Coluna | Tipo | Exemplo |
|--------|------|---------|
| id | uuid (PK) | `055519c2-a206-4a2a-a6fc-82248fe3651f` |
| order_id | uuid (FK → orders) | `cad1f381-23c4-453b-912e-9d5791824c20` |
| batch_id | uuid (FK → ticket_batches) | `1fd2fe83-b7c7-4b19-bb4a-32731108da93` |
| event_id | uuid (FK → events) | `5579ce0d-a8ec-4bf3-b6c8-da7416cbf242` |
| user_id | uuid (FK → auth.users) | `8ea1b797-e564-4796-986b-2bfd38696b72` |
| guest_name | text | `test_user_886957724902307554@testuser.com` |
| status | text | `valid`, `used`, `refunded` |
| paid_price_cents | integer | `200` |
| paid_fee_cents | integer | `273` |
| purchased_at | timestamptz | `2026-02-24 02:01:27.919626+00` |
| used_at | timestamptz | `null` |

### `staff_assignments`
| Coluna | Tipo | Exemplo |
|--------|------|---------|
| id | uuid (PK) | `5aedf26a-068f-43d6-adc3-6c67f33f14e1` |
| staff_id | uuid (FK → profiles) | `65163e42-c73b-4dba-a839-dacd3231a06f` |
| event_id | uuid (FK → events) | `5579ce0d-a8ec-4bf3-b6c8-da7416cbf242` |
| created_at | timestamptz | `2026-04-07 00:00:53.974468+00` |

---

## Diagnóstico do Erro RLS

### Passo 1: Verificar se políticas existem

```sql
-- Lista todas as políticas da tabela orders
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'orders';
```

**Resultado esperado:**
| policyname | cmd | roles |
|------------|-----|-------|
| orders_select_own | SELECT | {authenticated} |
| orders_insert_own | INSERT | {authenticated} |
| orders_update_own | UPDATE | {authenticated} |

Se estiver vazio ou diferente, as políticas não foram aplicadas.

### Passo 2: Verificar se RLS está ativado

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orders';
```

**Resultado esperado:** `rowsecurity = true`

### Passo 3: Verificar se o usuário tem perfil

```sql
-- Substitua pelo ID do usuário logado
SELECT * FROM profiles WHERE id = 'SEU_USER_ID_AQUI';
```

Se não retornar nada, o trigger de criação de perfil pode ter falhado.

### Passo 4: Testar a política manualmente

```sql
-- Teste como o usuário autenticado
SELECT auth.uid();  -- Deve retornar o ID do usuário logado

-- Teste de insert
INSERT INTO orders (user_id, event_id, status, total_amount_cents, items_snapshot)
VALUES (auth.uid(), 'EVENT_ID_AQUI', 'pending', 100, '[]');
```

---

## Solução: Aplicar Políticas RLS

Execute o seguinte SQL no **Supabase SQL Editor**:

```sql
-- Remove políticas antigas (se existirem)
DROP POLICY IF EXISTS orders_select_own ON public.orders;
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS orders_update_own ON public.orders;

-- Garante que RLS está ativado
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- SELECT: Usuário pode ver suas próprias orders
CREATE POLICY orders_select_own
ON public.orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Usuário autenticado pode criar order para si mesmo
CREATE POLICY orders_insert_own
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Usuário pode atualizar suas próprias orders
CREATE POLICY orders_update_own
ON public.orders FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## Se o Problema Persistir

### Causa Provável: Usuário sem perfil

O erro pode ocorrer se existe uma trigger ou constraint que verifica a tabela `profiles`. Verifique:

```sql
-- Verifica se o usuário existe em profiles
SELECT id, email, role FROM profiles WHERE id = 'USER_ID_DO_ERRO';
```

Se não existir, crie manualmente:

```sql
INSERT INTO profiles (id, email, role)
SELECT id, email, 'student'
FROM auth.users
WHERE id = 'USER_ID_DO_ERRO';
```

### Causa Provável: Função get_my_role() falhando

A função `get_my_role()` é usada em algumas políticas. Se o usuário não tem perfil, ela retorna NULL e pode causar problemas:

```sql
-- Testa a função
SELECT public.get_my_role();
```

---

## Explicação das Políticas

| Política | Operação | Regra |
|----------|----------|-------|
| `orders_select_own` | SELECT | Usuário só vê pedidos onde `user_id` = seu ID |
| `orders_insert_own` | INSERT | Usuário só cria pedidos com seu próprio `user_id` |
| `orders_update_own` | UPDATE | Usuário só atualiza seus próprios pedidos |

### Como funciona `auth.uid()`

- `auth.uid()` retorna o ID do usuário autenticado na sessão atual
- A cláusula `USING` filtra quais linhas o usuário pode **ler**
- A cláusula `WITH CHECK` valida quais dados o usuário pode **inserir/atualizar**

---

## Alternativa: Migration Completa

Aplicar a migration que corrige **todas** as políticas RLS:

```bash
# Copie o conteúdo de:
supabase/migrations/20260426000000_fix_all_rls_policies.sql

# E execute no SQL Editor do Supabase
```
