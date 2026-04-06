# Escola Música App

Plataforma para gestão de eventos da escola de música, venda de ingressos e validação de entrada via QR code.

## Funcionalidades principais
- Autenticação (login/cadastro) com perfis (`customer`, `staff`, `admin`).
- Gestão de eventos e lotes de ingressos.
- Checkout com Mercado Pago.
- Emissão e validação de ingresso (com bloqueio de reuso).
- Webhook de pagamento idempotente (ordem só vira `approved` após emissão de ingressos) e expiração automática de pedidos `pending` antigos.
- Cálculo de preço com repasse de taxa da escola + taxa Mercado Pago.

## Regras de acesso
- A listagem de eventos (`/`) e a página de detalhes do evento (`/events/:id`) são públicas.
- Login/cadastro é exigido apenas quando o aluno tenta finalizar a compra ou acessar `Meus Ingressos` (`/my-tickets`).
- Ao clicar em `Finalizar Compra` sem sessão ativa, o aluno é redirecionado para `/login?next=/events/:id`.

## Stack
- Next.js (App Router)
- Supabase (Auth + Postgres)
- Mercado Pago SDK

## Rodando localmente
```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.


## Imagens de eventos
- O formulário do admin aceita:
  - URL externa em `image_url`;
  - upload de arquivo local (imagem).
- Para upload local, configure um bucket público no Supabase Storage (default: `event-images`) e, se quiser outro nome, use `SUPABASE_EVENT_IMAGES_BUCKET`.
- O caminho público retornado é salvo em `events.image_url`.

## Qualidade
```bash
npm run lint
npm run build
```

> O build pode falhar em ambiente sem internet por depender de Google Fonts.

## Documentação
- Revisão funcional: `docs/PROJECT_REVIEW.md`
- PDR: `docs/PDR.md`
- ADRs: `docs/adr/0001-stack-custo-zero.md`, `docs/adr/0002-precificacao-com-repasse.md`, `docs/adr/0003-migrations-sql-supabase.md`
- Banco de dados (estado atual): `docs/DATABASE.md`
- Guia de migrations: `docs/MIGRATIONS.md`
- **Keep Alive (manter Supabase ativo):** `docs/KEEP_ALIVE.md`
