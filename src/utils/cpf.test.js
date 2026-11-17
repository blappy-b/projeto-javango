import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCpf, formatCpf, isValidCpf, maskEmail } from './cpf.js';

test('cleanCpf remove pontuação', () => {
  assert.equal(cleanCpf('529.982.247-25'), '52998224725');
});

test('formatCpf aplica a máscara', () => {
  assert.equal(formatCpf('52998224725'), '529.982.247-25');
  assert.equal(formatCpf('5299822'), '529.982.2');
  assert.equal(formatCpf('529982247251234'), '529.982.247-25');
});

test('isValidCpf valida dígitos verificadores', () => {
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('529.982.247-24'), false);
  assert.equal(isValidCpf('111.111.111-11'), false);
  assert.equal(isValidCpf('123'), false);
});

test('maskEmail esconde parte do usuário', () => {
  assert.equal(maskEmail('maria.silva@gmail.com'), 'ma*********@gmail.com');
  assert.equal(maskEmail('ab@x.com'), 'a***@x.com');
  assert.equal(maskEmail('invalido'), '');
});
