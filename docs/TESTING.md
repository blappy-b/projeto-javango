# Estratégia de Testes

Este projeto possui testes automatizados com o runner nativo do Node (`node:test`) em dois níveis:

- **Unitários**: validam regras isoladas (ex.: cálculo de preço e assinatura/validação de QR).
- **Integração**: validam o uso combinado de módulos (`price` + `security`) em um fluxo único.

## Como rodar

```bash
npm test
```

Ou por suíte:

```bash
npm run test:unit
npm run test:integration
```

## Peculiaridades e pré-requisitos

1. Os testes atuais **não acessam banco real** e não dependem de Supabase/Mercado Pago ativos.
2. Os testes de `security` dependem da variável `TICKET_QR_SECRET`, mas o próprio teste configura esse valor automaticamente.
3. Nenhum teste atual depende de internet ou conexão externa.
4. Ao adicionar testes de integração reais com banco, documente aqui:
   - quais tabelas precisam existir;
   - dados mínimos necessários;
   - variáveis de ambiente obrigatórias;
   - se o teste exige conexão externa.
