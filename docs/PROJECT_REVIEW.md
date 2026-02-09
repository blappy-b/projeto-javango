# Revisão do Projeto — Escola de Música (Ingressos + Validação)

## Resumo executivo
O projeto já possui os três pilares solicitados:
- **Login/cadastro** com Supabase Auth.
- **Venda de ingressos** com checkout via Mercado Pago.
- **Perfil de staff/admin para validação por QR code**, incluindo bloqueio de reuso de ingresso.

Também já existe lógica para repassar taxa da escola + taxa do Mercado Pago no cálculo do preço final, alinhando com o requisito de custo zero operacional (além de mão de obra).

## Evidências encontradas no código
- Login e cadastro: `src/components/auth/LoginForm.jsx` e `src/components/auth/RegisterForm.jsx`.
- RBAC (admin/staff/customer): `src/proxy.js`.
- Criação de eventos e lotes com taxa percentual por lote: `src/actions/events.js`.
- Compra com integração Mercado Pago: `src/actions/tickets.js` e `src/lib/mercadopago.js`.
- Cálculo de preço final com taxa escola + MP: `src/utils/price.js`.
- Scanner e validação de ticket: `src/components/staff/QRScanner.jsx` e `src/app/api/tickets/validate/route.js`.

## Ajustes feitos nesta revisão
1. **Correção de segurança/execução no validador de QR**
   - Reintroduzido módulo `src/lib/security.js` com `verifyTicketHash` e fallback compatível com QR atual (UUID).
2. **Padronização da API de validação**
   - Criada rota protegida `POST /api/tickets/validate`.
   - Agora a rota valida sessão do usuário e papel (`staff`/`admin`) antes de registrar uso do ingresso.
3. **Scanner atualizado para fluxo autenticado**
   - `QRScanner` passou a usar usuário real do Supabase e chamar a rota correta.

## Riscos e próximos passos
- Recomenda-se gerar QR assinado (`createTicketHash`) na emissão do ingresso para evitar exposição direta do ID.
- Adicionar testes de integração para:
  - login + role;
  - compra e webhook;
  - validação de QR já usado.
- Fix opcional de lint no `Navbar` (dependência de `useEffect`).
