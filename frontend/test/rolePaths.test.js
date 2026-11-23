import test from 'node:test';
import assert from 'node:assert/strict';
import { accessForUser, homeForUser, portalAllowsRole } from '../src/routes/rolePaths.js';
import { clinicToday } from '../src/utils/format.js';

test('administrador y empleado usan el mismo acceso, con destinos por rol', () => {
  assert.equal(accessForUser({ rol: 'Administrador' }), '/empleado/acceso');
  assert.equal(accessForUser({ rol: 'Empleado' }), '/empleado/acceso');
  assert.equal(homeForUser({ rol: 'Administrador' }), '/admin');
  assert.equal(homeForUser({ rol: 'Empleado' }), '/empleado');
});

test('el cliente conserva su acceso y area separados', () => {
  assert.equal(accessForUser({ rol: 'Cliente' }), '/cliente/acceso');
  assert.equal(homeForUser({ rol: 'Cliente' }), '/cliente/portal');
  assert.equal(portalAllowsRole('admin', 'Empleado'), false);
  assert.equal(portalAllowsRole('cliente', 'Administrador'), false);
});

test('fecha del formulario sigue el dia de la clinica', () => {
  assert.match(clinicToday(), /^\d{4}-\d{2}-\d{2}$/);
});
