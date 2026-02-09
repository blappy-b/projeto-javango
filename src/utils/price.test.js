import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinalPrice, formatCurrency } from './price.js';

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
