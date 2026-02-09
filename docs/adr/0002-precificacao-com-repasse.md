# ADR 0002 — Precificação com repasse total de taxas

- **Status**: Aceito
- **Data**: 2026-02-09

## Contexto
A escola quer evitar absorver custos de transação e manter previsibilidade de receita por ingresso.

## Decisão
Calcular preço final com:
1. preço base;
2. taxa da escola (% configurável com mínimo);
3. markup reverso para cobrir taxa percentual + fixa do Mercado Pago.

## Consequências
### Positivas
- Receita líquida previsível por ingresso.
- Transparência de composição de preço.

### Negativas
- Valor final pode ficar mais alto para comprador.
- Mudanças de tarifa do gateway exigem atualização da configuração.
