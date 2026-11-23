const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
require('../src/config/env');

const target = (process.env.DEPLOY_URL || 'http://localhost:4000').replace(/\/$/, '');
const evidenceDirectory = path.resolve(__dirname, '../docs/evidencias');
const credentials = {
  admin: { usuario: process.env.TEST_ADMIN_USER || 'admin', password: process.env.TEST_ADMIN_PASSWORD || process.env.QA_ADMIN_PASSWORD },
  employee: { usuario: process.env.TEST_EMPLOYEE_USER || 'empleado', password: process.env.TEST_EMPLOYEE_PASSWORD || process.env.QA_EMPLOYEE_PASSWORD },
  client: { usuario: process.env.TEST_CLIENT_USER || 'cliente', password: process.env.TEST_CLIENT_PASSWORD || process.env.QA_CLIENT_PASSWORD },
};

const missingCredentials = Object.entries(credentials)
  .filter(([, value]) => !value.usuario || !value.password)
  .map(([role]) => role);

if (missingCredentials.length) {
  throw new Error(`Faltan credenciales de postprueba para: ${missingCredentials.join(', ')}.`);
}

const checks = [];

const request = async (route, options = {}) => {
  const startedAt = performance.now();
  const response = await fetch(`${target}${route}`, options);
  const elapsedMs = Number((performance.now() - startedAt).toFixed(2));
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body, elapsedMs };
};

const addCheck = (name, result, condition, detail) => {
  const check = {
    name,
    passed: Boolean(condition),
    status: result.response.status,
    elapsedMs: result.elapsedMs,
    detail,
  };
  checks.push(check);
  return check;
};

const login = async (portal, account) => {
  const result = await request(`/api/auth/login/${portal}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(account),
  });
  return { ...result, token: result.body?.data?.token, role: result.body?.data?.user?.rol };
};

const authorization = (token) => ({ Authorization: `Bearer ${token}` });

const run = async () => {
  const healthSamples = [];
  let healthBody;
  for (let index = 0; index < 20; index += 1) {
    const result = await request('/api/health');
    healthSamples.push(result.elapsedMs);
    healthBody = result.body;
    if (result.response.status !== 200 || result.body?.data?.dbMode !== 'sql-server') {
      throw new Error('La comprobacion de salud no confirmo SQL Server.');
    }
  }
  checks.push({
    name: 'SQL Server disponible',
    passed: true,
    status: 200,
    elapsedMs: Number((healthSamples.reduce((sum, value) => sum + value, 0) / healthSamples.length).toFixed(2)),
    detail: `${healthBody.data.database} mediante ${healthBody.data.databaseUser}`,
  });

  for (const route of ['/', '/cliente/acceso', '/empleado/acceso', '/admin/acceso']) {
    const result = await request(route);
    addCheck(`Carga directa ${route}`, result, result.response.status === 200 && String(result.body).includes('<div id="root">'), 'SPA disponible por URL directa');
  }

  const admin = await login('staff', credentials.admin);
  addCheck('Administrador en acceso del personal', admin, admin.response.status === 200 && admin.role === 'Administrador' && admin.token, `Rol obtenido: ${admin.role || 'ninguno'}`);
  const employee = await login('staff', credentials.employee);
  addCheck('Empleado en acceso del personal', employee, employee.response.status === 200 && employee.role === 'Empleado' && employee.token, `Rol obtenido: ${employee.role || 'ninguno'}`);
  const client = await login('client', credentials.client);
  addCheck('Login en portal de clientes', client, client.response.status === 200 && client.role === 'Cliente' && client.token, `Rol obtenido: ${client.role || 'ninguno'}`);

  const wrongPortal = await login('staff', credentials.client);
  addCheck('Bloqueo de cliente en acceso del personal', wrongPortal, wrongPortal.response.status === 403, 'Debe responder 403');

  const adminUsers = await request('/api/users', { headers: authorization(admin.token) });
  addCheck('Administrador consulta usuarios', adminUsers, adminUsers.response.status === 200 && Array.isArray(adminUsers.body?.data), 'Permiso usuarios.gestionar');
  const adminEvaluation = await request('/api/evaluation/summary', { headers: authorization(admin.token) });
  addCheck('Administrador consulta evaluacion', adminEvaluation, adminEvaluation.response.status === 200, 'Permiso evaluacion.gestionar');

  const employeeUsers = await request('/api/users', { headers: authorization(employee.token) });
  addCheck('Empleado bloqueado en usuarios', employeeUsers, employeeUsers.response.status === 403, 'Debe responder 403');

  const clientPortal = await request('/api/portal/summary', { headers: authorization(client.token) });
  addCheck('Cliente consulta su portal', clientPortal, clientPortal.response.status === 200 && clientPortal.body?.data?.client, 'Datos limitados al cliente autenticado');
  const clientDirectory = await request('/api/clients', { headers: authorization(client.token) });
  addCheck('Cliente bloqueado en directorio', clientDirectory, clientDirectory.response.status === 403, 'Debe responder 403');

  const sorted = [...healthSamples].sort((a, b) => a - b);
  const passed = checks.filter((check) => check.passed).length;
  const evidence = {
    generatedAt: new Date().toISOString(),
    target,
    environment: healthBody.data.environment,
    database: healthBody.data.database,
    dbMode: healthBody.data.dbMode,
    summary: {
      checks: checks.length,
      passed,
      failed: checks.length - passed,
      healthSamples: healthSamples.length,
      healthAverageMs: Number((healthSamples.reduce((sum, value) => sum + value, 0) / healthSamples.length).toFixed(2)),
      healthP95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
      healthMinMs: sorted[0],
      healthMaxMs: sorted[sorted.length - 1],
    },
    checks,
  };

  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const stamp = evidence.generatedAt.replace(/[:.]/g, '-');
  const evidencePath = path.join(evidenceDirectory, `postdeployment-${stamp}.json`);
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(evidenceDirectory, 'postdeployment-latest.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ evidencePath, ...evidence.summary }, null, 2));
  if (evidence.summary.failed) process.exitCode = 1;
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
