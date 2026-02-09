# ADR 0001 — Stack com foco em custo zero

- **Status**: Aceito
- **Data**: 2026-02-09

## Contexto
O projeto precisa operar sem custo além de mão de obra, mantendo autenticação, banco, checkout e app web moderno.

## Decisão
Adotar:
- Next.js (App Router) para frontend e backend leve (Server Actions/Route Handlers).
- Supabase (Auth + Postgres) no plano free.
- Mercado Pago para checkout e webhooks.

## Consequências
### Positivas
- Menor overhead operacional.
- Desenvolvimento rápido.
- Escala inicial adequada para eventos escolares.

### Negativas
- Dependência de limites do plano gratuito.
- Necessidade de cuidado com segurança de webhooks e service role.
