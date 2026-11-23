const test = require('node:test');
const assert = require('node:assert/strict');
const riskService = require('../src/services/riskService');
const authService = require('../src/services/authService');

const levels = [
  { id: 1, nombre: 'Roja', prioridad: 1, keywords: ['dificultad respiratoria', 'hemorragia'], activo: true },
  { id: 3, nombre: 'Amarilla', prioridad: 3, keywords: ['vomito', 'fiebre'], activo: true },
  { id: 5, nombre: 'Azul', prioridad: 5, keywords: ['vacuna', 'consulta general'], activo: true },
];

test('clasifica una emergencia respiratoria como roja', () => {
  const result = riskService.classifyTriage({ levels, reason: 'Tiene dificultad respiratoria' });
  assert.equal(result.nivelRiesgoId, 1);
  assert.equal(result.matchType, 'exacta');
});

test('tolera un error ortografico moderado', () => {
  const result = riskService.classifyTriage({ levels, symptoms: ['vomto'] });
  assert.equal(result.nivelRiesgoId, 3);
  assert.equal(result.matchType, 'aproximada');
});

test('usa el nivel no urgente cuando no hay coincidencias', () => {
  const result = riskService.classifyTriage({ levels, reason: 'Revision de rutina' });
  assert.equal(result.nivelRiesgoId, 5);
  assert.equal(result.matchType, 'predeterminada');
});

test('respeta la seleccion manual del profesional', () => {
  const result = riskService.classifyTriage({ levels, nivelRiesgoId: 3, reason: 'hemorragia' });
  assert.equal(result.nivelRiesgoId, 3);
  assert.equal(result.matchType, 'manual');
});

test('rechaza un nivel manual inexistente', () => {
  assert.throws(
    () => riskService.classifyTriage({ levels, nivelRiesgoId: 999999 }),
    (error) => error.code === 'INVALID_RISK_LEVEL',
  );
});

test('normaliza acentos y signos', () => {
  assert.equal(riskService.normalize('  Dificultad RESPIRATÓRIA!!! '), 'dificultad respiratoria');
});

test('escala los bloqueos hasta un maximo de 120 minutos', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 6].map(authService.lockMinutesForCount),
    [10, 30, 60, 90, 120, 120],
  );
});
