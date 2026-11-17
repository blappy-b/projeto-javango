import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFeeSplit, calculateFinalPrice, formatCurrency } from './price.js';

test('formatCurrency formata centavos em BRL', () => {
  assert.equal(formatCurrency(12345), 'R$ 123,45');
});

test('calculateFinalPrice respeita taxa percentual da escola', () => {
  const result = calculateFinalPrice({
    price_cents: 10000,
    service_fee_percent: 10,
    min_service_fee_cents: 0,
  });

  assert.equal(result.base, 10000);
  assert.equal(result.schoolFee, 1000);
  assert.equal(result.totalFee, result.total - result.base);
  assert.ok(result.total > 11000);
});

test('calculateFinalPrice aplica taxa mínima quando percentual é baixo', () => {
  const result = calculateFinalPrice({
    price_cents: 1000,
    service_fee_percent: 1,
    min_service_fee_cents: 500,
  });

  assert.equal(result.schoolFee, 500);
  assert.ok(result.total > 1500);
});

test('calculateFeeSplit aplica 0,99% no pix', () => {
  assert.deepEqual(calculateFeeSplit(10000, 1567, 'pix'), { mpFee: 115, serviceFee: 1452 });
});

test('calculateFeeSplit aplica 4,98% em cartão', () => {
  const expected = { mpFee: 576, serviceFee: 991 };

  assert.deepEqual(calculateFeeSplit(10000, 1567, 'credit_card'), expected);
  assert.deepEqual(calculateFeeSplit(10000, 1567, 'debit_card'), expected);
  assert.deepEqual(calculateFeeSplit(10000, 1567, 'prepaid_card'), expected);
});

test('calculateFeeSplit usa 4,99% sem método salvo ou com método sem taxa definida', () => {
  const expected = { mpFee: 577, serviceFee: 990 };

  assert.deepEqual(calculateFeeSplit(10000, 1567, null), expected);
  assert.deepEqual(calculateFeeSplit(10000, 1567, undefined), expected);
  assert.deepEqual(calculateFeeSplit(10000, 1567, 'account_money'), expected);
});


test('calculateFinalPrice: ingresso de R$ 25 sem taxa garante R$ 25 líquidos com 4,99% do MP', () => {
  const result = calculateFinalPrice({ price_cents: 2500, service_fee_percent: 0, min_service_fee_cents: 0 });

  assert.equal(result.total, 2632);
  // Mesmo com a taxa do MP arredondada para cima (R$ 1,32), caem R$ 25,00.
  assert.equal(result.total - Math.ceil((result.total * 4.99) / 100), 2500);
});

test('calculateFinalPrice nunca deixa o líquido abaixo do valor do ingresso', () => {
  for (let price = 100; price <= 50000; price += 37) {
    const { total } = calculateFinalPrice({ price_cents: price });
    const mpFee = Math.ceil((total * 4.99) / 100 - 1e-9);
    assert.ok(total - mpFee >= price, `preço ${price}: total ${total}, líquido ${total - mpFee}`);
    // E não cobra 1 centavo a mais do que o necessário.
    const prev = total - 1;
    assert.ok(prev - Math.ceil((prev * 4.99) / 100 - 1e-9) < price, `preço ${price}: total ${total} poderia ser menor`);
  }
});
