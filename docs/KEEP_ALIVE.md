# Keep Alive - Manter Supabase Ativo

## Problema

No plano gratuito do Supabase, o banco de dados entra em modo "pause" após **7 dias de inatividade**. Quando isso acontece, é necessário entrar no dashboard e clicar em "Resume" manualmente.

## Solução

Foi criado um endpoint de health check (`/api/health`) que faz uma query simples no banco de dados. Ao receber requisições regulares, o Supabase permanece ativo e não entra em modo pause.

## Endpoint

**URL:** `https://[SEU-DOMINIO]/api/health`

**Método:** `GET`

**Resposta de sucesso:**
```json
{
  "status": "ok",
  "database": "connected",
  "eventsCount": 5,
  "timestamp": "2026-04-06T10:00:00.000Z",
  "message": "Supabase está ativo e respondendo"
}
```

## Configuração do Cron

### Opção 1: UptimeRobot (Recomendado)

**Serviço:** [https://uptimerobot.com](https://uptimerobot.com) - Gratuito  
**Limite:** 50 monitores, check a cada 5 minutos

**Configuração:**
1. Crie uma conta gratuita
2. Adicione um novo monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Javango Keep Alive
   - **URL:** `https://[SEU-DOMINIO]/api/health`
   - **Monitoring Interval:** 5 minutes (suficiente para manter ativo)
3. Salve e pronto!

**Vantagens:**
- Interface simples
- Email de alerta se a aplicação cair
- Histórico de uptime
- Não precisa de repositório GitHub

---

### Opção 2: Cron-job.org

**Serviço:** [https://cron-job.org](https://cron-job.org) - Gratuito  
**Limite:** Ilimitado, mínimo de 1 minuto de intervalo

**Configuração:**
1. Crie uma conta gratuita
2. Crie um novo cronjob:
   - **Title:** Javango Keep Alive
   - **Address:** `https://[SEU-DOMINIO]/api/health`
   - **Schedule:** Every 30 minutes (ou conforme preferir)
3. Salve e ative

**Vantagens:**
- Intervalos mais flexíveis
- Muito confiável
- Logs das execuções

---

### Opção 3: GitHub Actions (Se o projeto estiver no GitHub)

**Arquivo:** `.github/workflows/keep-alive.yml`

```yaml
name: Keep Alive - Ping Supabase

on:
  schedule:
    # Executa a cada 6 horas (às 00:00, 06:00, 12:00, 18:00 UTC)
    - cron: '0 */6 * * *'
  workflow_dispatch: # Permite execução manual

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Health Check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://[SEU-DOMINIO]/api/health)
          if [ $response -eq 200 ]; then
            echo "✅ Health check passou (HTTP $response)"
          else
            echo "❌ Health check falhou (HTTP $response)"
            exit 1
          fi
```

**Vantagens:**
- Integrado ao repositório
- Histórico no GitHub Actions
- Gratuito para repositórios públicos e privados (limites generosos)

**Desvantagens:**
- Requer repositório no GitHub
- Menos frequente (máximo recomendado: a cada 5-6 horas)

---

## Recomendação

**Para a maioria dos casos:** Use **UptimeRobot** ou **Cron-job.org**
- ✅ Fácil de configurar
- ✅ Não depende do código estar no GitHub
- ✅ Pings mais frequentes
- ✅ Alertas por email

**Frequência recomendada:** Entre 5 a 30 minutos é suficiente para manter o Supabase ativo.

---

## Testando localmente

```bash
# Com a aplicação rodando localmente
curl http://localhost:3000/api/health

# Ou abra no navegador
# http://localhost:3000/api/health
```

---

## Em produção

Após fazer deploy (Vercel, por exemplo):

```bash
curl https://seu-app.vercel.app/api/health
```

Configure o serviço de cron com essa URL de produção.

---

## Monitoramento

O endpoint `/api/health` retorna:
- **Status 200** quando tudo está OK
- **Status 503** quando há problema com o banco
- **Status 500** para erros inesperados

O serviço de cron deve alertar você caso receba status diferente de 200.

---

## Importante

⚠️ **Este endpoint usa a chave ANÔNIMA do Supabase**, não a service role key. Ele faz apenas uma query simples de contagem e respeita as regras RLS (Row Level Security).

⚠️ **Não há impacto na performance** - a query é extremamente leve (apenas contagem, sem buscar dados).

⚠️ **Não há custo adicional** - todos os serviços de cron mencionados têm planos gratuitos adequados para esta solução.
