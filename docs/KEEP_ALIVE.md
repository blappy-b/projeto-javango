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

### Configuração atual: Vercel Cron

**Arquivo:** `vercel.json`  
**Agendamento:** `0 12 * * *` (uma vez por dia, entre 12:00 e 12:59 UTC)

O Vercel faz um `GET` em `/api/health` no deployment de produção. O recurso está incluído no plano Hobby (gratuito), que permite no máximo uma execução por dia, com precisão de ±59 minutos. Isso é suficiente para evitar a pausa de 7 dias do Supabase.

**Onde acompanhar:** no painel do projeto na Vercel, em **Settings → Cron Jobs**. O botão **Run** permite executar manualmente e **View Logs** mostra as execuções.

**Atenção:** o cron só roda em produção e não restaura um projeto já pausado. Se isso acontecer, clique em "Resume" no dashboard do Supabase.

---

## Alternativas

### Opção 1: UptimeRobot

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
- Em repositórios públicos, o GitHub desativa o agendamento após 60 dias sem atividade no repositório (`disabled_inactivity`). Foi o que aconteceu neste projeto em 27/08/2026, por isso o agendamento foi movido para o Vercel Cron. O workflow continua no repositório apenas para execução manual.

---

## Recomendação

**Use o Vercel Cron**, já configurado neste projeto:
- ✅ Gratuito no plano Hobby
- ✅ Não depende de atividade no repositório
- ✅ Não exige conta em outro serviço

**Frequência recomendada:** Uma vez por dia é suficiente para manter o Supabase ativo.

Se precisar de alertas por email quando a aplicação cair, considere também o UptimeRobot.

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

O Vercel Cron passa a valer automaticamente no deploy de produção. Serviços externos devem ser configurados com essa URL.

---

## Monitoramento

O endpoint `/api/health` retorna:
- **Status 200** quando tudo está OK
- **Status 503** quando há problema com o banco
- **Status 500** para erros inesperados

O Vercel Cron não tenta novamente quando a execução falha. Verifique os logs em **Settings → Cron Jobs**.

---

## Importante

⚠️ **Este endpoint usa a chave ANÔNIMA do Supabase**, não a service role key. Ele faz apenas uma query simples de contagem e respeita as regras RLS (Row Level Security).

⚠️ **Não há impacto na performance** - a query é extremamente leve (apenas contagem, sem buscar dados).

⚠️ **Não há custo adicional** - todos os serviços de cron mencionados têm planos gratuitos adequados para esta solução.
