export const formatCurrency = (cents) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

// CONFIGURAÇÃO DE TAXAS DO MERCADO PAGO (Exemplo: Checkout Pro)
// Verifique no seu painel do MP em "Custos". 
// Exemplo comum: 4.99% + R$ 0,49 por transação.
const MP_RATE_PERCENT = 4.99; 
const MP_FIXED_CENTS = 49; 

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