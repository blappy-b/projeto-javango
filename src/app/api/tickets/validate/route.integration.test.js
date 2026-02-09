import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinalPrice, formatCurrency } from '../../../../utils/price.js';
import { createTicketHash, verifyTicketHash } from '../../../../lib/security.js';

const ORIGINAL_SECRET = process.env.TICKET_QR_SECRET;
process.env.TICKET_QR_SECRET = 'segredo-integracao';

test('integra cálculo de preço e formatação final para exibição', () => {
  const pricing = calculateFinalPrice({
    price_cents: 2590,
    service_fee_percent: 12,
    min_service_fee_cents: 300,
  });

  const label = formatCurrency(pricing.total);

  assert.equal(typeof label, 'string');
  assert.ok(label.startsWith('R$'));
  assert.ok(pricing.total > pricing.base);
});

test('integra emissão e leitura de token de ticket', () => {
  const token = createTicketHash('ticket-int-1');
  const payload = verifyTicketHash(token);

  assert.equal(payload?.tid, 'ticket-int-1');
});

test.after(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.TICKET_QR_SECRET;
  else process.env.TICKET_QR_SECRET = ORIGINAL_SECRET;
});
