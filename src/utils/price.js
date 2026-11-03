export const formatCurrency = (cents) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

// CONFIGURAÇÃO DE TAXAS DO MERCADO PAGO
// Verifique no seu painel do MP em "Custos".
// Markup do checkout: 4,9% (sem taxa fixa). O método só é conhecido depois do
// redirecionamento ao MP, então o preço não varia com ele.
const MP_RATE_PERCENT = 4.9;
const MP_FIXED_CENTS = 0;

// Taxa efetivamente descontada pelo MP, por método de pagamento.
// Métodos sem taxa definida (e vendas sem método salvo) usam MP_RATE_PERCENT.
const MP_RATE_BY_METHOD = {
  pix: 0.99,
  credit_card: 3.99,
  debit_card: 3.99,
  prepaid_card: 3.99,
};

/**
 * Separa as taxas de um ingresso vendido (usado no painel admin).
 * A taxa do MP incide sobre o total cobrado; o restante é taxa de serviço.
 */
export const calculateFeeSplit = (paidPriceCents, paidFeeCents, paymentMethod) => {
  const basePrice = Number(paidPriceCents) || 0;
  const totalFee = Number(paidFeeCents) || 0;
  const totalCharged = basePrice + totalFee;

  const ratePercent = MP_RATE_BY_METHOD[paymentMethod] ?? MP_RATE_PERCENT;
  const mpFee = Math.round((totalCharged * ratePercent) / 100);
  const serviceFee = Math.max(0, totalFee - mpFee);

  return { serviceFee, mpFee };
};

/**
 * Calcula o preço final para garantir "Custo Zero" real.
 * O Aluno paga todas as taxas (Escola + Mercado Pago).
 */
export const calculateFinalPrice = (batch) => {
  const basePrice = batch.price_cents; // Quanto a escola quer pelo ingresso (Ex: R$ 100,00)
  
  // 1. Taxa da Escola (Definida no Admin)
  // Ex: A escola quer ganhar +10% sobre o ingresso para pagar staff
  const schoolFeePercent = batch.service_fee_percent || 0;
  const schoolMinFee = batch.min_service_fee_cents || 0;

  let schoolFee = Math.round((basePrice * schoolFeePercent) / 100);
  if (schoolFee < schoolMinFee) {
    schoolFee = schoolMinFee;
  }

  // VALOR LÍQUIDO QUE PRECISA CAIR NA CONTA (Base + Taxa Escola)
  // Ex: 100 + 10 = R$ 110,00
  const netDesiredAmount = basePrice + schoolFee;

  // 2. Aplica o Markup do Mercado Pago (Cálculo Reverso)
  // Fórmula: (ValorDesejado + CustoFixo) / (1 - Taxa%)
  
  const mpRateDecimal = MP_RATE_PERCENT / 100;
  
  // O divisor nunca pode ser 0 ou negativo
  const divisor = 1 - mpRateDecimal; 
  
  // Cálculo do preço final bruto que será cobrado no cartão do aluno
  const finalPriceTotal = Math.round((netDesiredAmount + MP_FIXED_CENTS) / divisor);

  // Derivações para exibição
  const totalFee = finalPriceTotal - basePrice; // Tudo que não é ingresso base (Taxa Escola + Taxa MP)

  return {
    base: basePrice,          // R$ 100,00
    schoolFee: schoolFee,     // R$ 10,00 (Parte da escola)
    mpFee: totalFee - schoolFee, // O que vai pro MP
    totalFee: totalFee,       // R$ 16,30 (Total de taxas que o aluno vê)
    total: finalPriceTotal    // R$ 116,30 (O que passa no cartão)
  };
};