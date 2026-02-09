# ADR 0003 — Migrations SQL nativas no Supabase

- **Status:** Aceita
- **Data:** 2026-02-09

## Contexto
A aplicação usa Next.js + Supabase (`@supabase/supabase-js`) e já depende de funções RPC no Postgres para regras críticas de negócio (estoque e exclusão segura de evento).

## Decisão
Versionar o banco por **migrations SQL nativas** em `supabase/migrations`.

## Consequências
### Positivas
- Alinhamento direto com o ecossistema Supabase/Postgres.
- Regras de banco (constraints, triggers, RPCs) ficam explícitas e auditáveis.
- Menos camadas de abstração para uma equipe que já opera via Supabase.

### Negativas
- Menos ergonomia de modelagem tipada via ORM.
- Evolução de schema exige mais cuidado manual na escrita SQL.

## Observação
Se o projeto evoluir para uma camada de repositórios mais complexa, podemos reavaliar ORMs como Drizzle/Prisma sem invalidar as migrations SQL já existentes.
