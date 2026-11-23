import test from 'node:test';
import assert from 'node:assert/strict';
import { clinicDateTime } from '../src/utils/format.js';

test('la auditoria presenta fecha y hora de Guatemala en vez de ISO UTC', () => {
  assert.equal(clinicDateTime('2026-10-14T21:46:18.710Z'), '14/10/2026 15:46:18');
  assert.equal(clinicDateTime(null), 'Sin fecha');
  assert.equal(clinicDateTime('invalida'), 'Sin fecha');
});
