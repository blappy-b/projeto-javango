# Solução do Problema de Webhook do Mercado Pago

## Problema Identificado

O webhook do Mercado Pago não estava atualizando o status das orders devido a **ausência da coluna `order_id` na tabela `tickets`**.

### Sintomas
- Order criado com status `pending` ✅
- Pagamento aprovado no Mercado Pago ✅
- Status da order não atualiza ❌
- Ingressos não aparecem em "Meus Ingressos" ❌

### Causa Raiz
O webhook em [route.js](src/app/api/webhooks/mercadopago/route.js) tentava inserir tickets com a coluna `order_id`, mas essa coluna não existia no banco de dados, causando falha silenciosa no `INSERT`.

---

## Solução

### 1️⃣ Aplicar a Migration

A migration `20260223000000_add_order_id_to_tickets.sql` foi criada para adicionar:
- Coluna `order_id` na tabela `tickets`
- Coluna `mp_payment_id` na tabela `orders`
- Índices para melhorar performance

#### Opção A: Via Supabase Dashboard (RECOMENDADO)

1. Acesse o [SQL Editor](https://app.supabase.com/project/_/sql/new) do Supabase
2. Cole o conteúdo do arquivo `supabase/migrations/20260223000000_add_order_id_to_tickets.sql`
3. Execute (clique em "Run")

#### Opção B: Via Supabase CLI (com senha)

```bash
# Configure a senha do banco
$env:SUPABASE_DB_PASSWORD="sua-senha-aqui"

# Aplique as migrations
supabase db push
```

#### Opção C: Via Script Node.js

```bash
node apply-migration.js
```

---

## 2️⃣ Verificar se o Webhook está Acessível

Se você está testando **localmente** (`localhost`), o Mercado Pago **NÃO** consegue enviar notificações ao seu webhook.

### Soluções para Ambiente Local

#### Usar ngrok (Recomendado)

1. Instale o ngrok:
   ```bash
   winget install ngrok
   ```

2. Execute o ngrok apontando para sua aplicação:
   ```bash
   ngrok http 3000
   ```

3. Copie a URL pública gerada (ex: `https://abc123.ngrok.io`)

4. Atualize o `.env.local`:
   ```env
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   ```

5. Reinicie o servidor Next.js:
   ```bash
   npm run dev
   ```

⚠️ **IMPORTANTE**: Toda vez que reiniciar o ngrok, a URL muda e você precisa atualizar o `.env.local`)

#### Alternativa: Usar localtunnel

```bash
npx localtunnel --port 3000
```

---

## 3️⃣ Testar o Fluxo Completo

### Passo a Passo

1. **Limpe ordens antigas**:
   - Acesse o Supabase Dashboard
   - Execute no SQL Editor:
     ```sql
     DELETE FROM orders WHERE status = 'pending';
     ```

2. **Faça uma compra de teste**:
   - Acesse a página do evento
   - Selecione ingressos
   - Finalize a compra com conta de teste do MP

3. **Verifique os logs do webhook**:
   - Abra o terminal onde o Next.js está rodando
   - Procure por logs do tipo:
     ```
     POST /api/webhooks/mercadopago
     ```

4. **Confirme que os tickets foram criados**:
   ```sql
   SELECT * FROM tickets WHERE user_id = 'seu-user-id' ORDER BY purchased_at DESC;
   ```

5. **Acesse "Meus Ingressos"**:
   - Deve aparecer os ingressos comprados

---

## 4️⃣ Debug Adicional

### Ver logs do Mercado Pago

1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/notifications/webhooks)
2. Vá em "Webhooks" > "Notificações"
3. Veja os logs de tentativas de envio

### Testar webhook manualmente

Crie um arquivo `test-webhook.js`:

```javascript
const response = await fetch('http://localhost:3000/api/webhooks/mercadopago?type=payment&id=123456', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'payment.updated',
    data: { id: '123456' }
  })
});

console.log(await response.json());
```

---

## Checklist de Verificação

- [ ] Migration aplicada no banco de dados
- [ ] Coluna `order_id` existe na tabela `tickets`
- [ ] Coluna `mp_payment_id` existe na tabela `orders`
- [ ] Webhook acessível publicamente (ngrok ou produção)
- [ ] Variável `NEXT_PUBLIC_BASE_URL` configurada corretamente
- [ ] Servidor reiniciado após mudanças no `.env`
- [ ] Conta de teste do Mercado Pago configurada
- [ ] Credenciais do MP configuradas (Access Token)

---

## Próximos Passos

Após aplicar a migration:

1. Reinicie o servidor
2. Faça uma nova compra de teste
3. Os ingressos devem aparecer automaticamente em "Meus Ingressos"

Se ainda não funcionar, verifique os logs do terminal para ver se há erros no webhook.
