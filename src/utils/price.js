export const formatCurrency = (cents) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

// CONFIGURAÇÃO DE TAXAS DO MERCADO PAGO
// Verifique no seu painel do MP em "Custos".
// Markup do checkout: 4,99% (sem taxa fixa). O método só é conhecido depois do
// redirecionamento ao MP, então o preço não varia com ele.
const MP_RATE_PERCENT = 4.99;
const MP_FIXED_CENTS = 0;

// Taxa efetivamente descontada pelo MP, por método de pagamento, com
// recebimento "na hora" (tabela do Checkout do MP: Pix 0,99%, cartão 4,98%).
// Métodos sem taxa definida (e vendas sem método salvo) usam MP_RATE_PERCENT.
const MP_CARD_RATE_PERCENT = 4.98;
const MP_RATE_BY_METHOD = {
  pix: 0.99,
  credit_card: MP_CARD_RATE_PERCENT,
  debit_card: MP_CARD_RATE_PERCENT,
  prepaid_card: MP_CARD_RATE_PERCENT,
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

// Taxa do MP sobre um valor cobrado, no pior caso (arredondada para cima).
// O "- 1e-9" evita que erros de ponto flutuante (ex.: 99.00000000001) virem 1 centavo a mais.
const worstCaseMpFee = (totalCents) =>
  Math.ceil((totalCents * MP_RATE_PERCENT) / 100 - 1e-9) + MP_FIXED_CENTS;

// Menor total que garante que `netCents` caia na conta depois da taxa do MP.
const grossUpForMpFee = (netCents) => {
  let total = Math.ceil((netCents + MP_FIXED_CENTS) / (1 - MP_RATE_PERCENT / 100) - 1e-9);
  while (total - worstCaseMpFee(total) < netCents) total += 1;
  return total;
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
  // Fórmula: (ValorDesejado + CustoFixo) / (1 - Taxa%), sempre arredondando
  // a favor da escola: o total é o MENOR valor em centavos em que, mesmo que o
  // MP arredonde a taxa dele para cima, o líquido não fica abaixo do desejado.
  const finalPriceTotal = grossUpForMpFee(netDesiredAmount);

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