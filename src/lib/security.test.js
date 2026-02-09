import test from 'node:test';
import assert from 'node:assert/strict';
import { createTicketHash, verifyTicketHash } from './security.js';

const ORIGINAL_SECRET = process.env.TICKET_QR_SECRET;
process.env.TICKET_QR_SECRET = 'segredo-teste';

test('cria e valida token assinado', () => {
  const token = createTicketHash('ticket-123');
  const payload = verifyTicketHash(token);
  assert.equal(payload?.tid, 'ticket-123');
});

test('rejeita token adulterado', () => {
  const token = createTicketHash('ticket-123');
  assert.equal(verifyTicketHash(`${token}abc`), null);
});

test('aceita UUID puro para compatibilidade retroativa', () => {
  const uuid = '123e4567-e89b-12d3-a456-426614174000';
  assert.deepEqual(verifyTicketHash(uuid), { tid: uuid });
});

test.after(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.TICKET_QR_SECRET;
  else process.env.TICKET_QR_SECRET = ORIGINAL_SECRET;
});
