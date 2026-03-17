# PDR — Product Definition & Requirements

## 1. Objetivo do produto
Sistema para escola de música vender ingressos de apresentações de alunos, controlar acesso via QR code e operar com custo de infraestrutura gratuito (pagando apenas mão de obra), usando serviços com plano gratuito.

## 2. Escopo funcional
### 2.1 Autenticação e perfis
- Login e cadastro de usuários.
- Perfis:
  - `student` (aluno/família): compra e visualiza ingressos.
  - `staff`: valida ingresso no evento (vinculado a eventos específicos).
  - `admin`: cria/edita evento, lotes, atribui staff e acompanha operação.

### 2.2 Eventos e ingressos
- Criação de evento com data, local, descrição.
- Configuração de lotes com:
  - preço base;
  - quantidade;
  - taxa percentual da escola.
- Publicação e edição de evento.

### 2.3 Checkout e pagamento
- Carrinho com múltiplos lotes.
- Criação de pedido interno.
- Redirecionamento para Mercado Pago.
- Webhook de confirmação para emissão de ingressos.

### 2.4 Validação em portaria
- Leitura de QR code.
- Validação de autenticidade do token.
- Bloqueio de reentrada (ticket já usado).
- Registro de quem validou e quando.
- **Busca manual (fallback)**: busca por nome ou CPF quando QR code não funciona.
- Staff é vinculado a eventos específicos (só valida tickets dos eventos atribuídos).

## 3. Regras de negócio
- O valor final pago pelo comprador deve considerar:
  1) preço base;
  2) taxa da escola (% definida no lote);
  3) taxa do Mercado Pago (percentual + fixa).
- Ticket cancelado não entra.
- Ticket usado não pode ser reutilizado.

## 4. Requisitos não funcionais
- Custo zero de licenciamento (open-source + planos free).
- Segurança mínima:
  - autenticação obrigatória em áreas privadas;
  - RBAC por perfil;
  - validação server-side de pagamento e ticket.
- Observabilidade básica via logs de erro.

## 5. Indicadores sugeridos
- Taxa de conversão compra iniciada → aprovada.
- Tempo médio de validação na portaria.
- Taxa de tentativas de reuso de ticket.
- Receita líquida por evento.
