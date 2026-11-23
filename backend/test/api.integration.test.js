process.env.NODE_ENV = 'test';
process.env.MAIL_TEST_MODE = 'true';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const { closePool, getPool, sql } = require('../src/config/db');
const repository = require('../src/repositories/sqlRepository');
const authService = require('../src/services/authService');
const mailService = require('../src/services/mailService');
const petPhotoService = require('../src/services/petPhotoService');
const { PDFDocument } = require('pdf-lib');
const { createTicketPdf, PAGE_WIDTH } = require('../src/services/ticketPdfService');
const { createAuditPdf, formatAuditDateTime, auditActor } = require('../src/services/auditPdfService');
const env = require('../src/config/env');

const credentials = {
  admin: { usuario: 'admin', password: process.env.QA_ADMIN_PASSWORD },
  employee: { usuario: 'empleado', password: process.env.QA_EMPLOYEE_PASSWORD },
  client: { usuario: 'cliente', password: process.env.QA_CLIENT_PASSWORD },
};

const login = async (portal, payload) => {
  const response = await request(app).post(`/api/auth/login/${portal}`).send(payload);
  assert.equal(response.status, 200, response.text);
  const sessionCookie = response.headers['set-cookie']?.join('; ') || '';
  assert.match(sessionCookie, /vet_session=/);
  assert.match(sessionCookie, /HttpOnly/);
  assert.match(sessionCookie, /SameSite=Strict/);
  return response.body.data.token;
};

test.after(async () => {
  await closePool();
});

test('health confirma SQL Server y la base VeterinariaDB', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.data.dbMode, 'sql-server');
  assert.equal(response.body.data.database, 'VeterinariaDB');
});

test('el inicio obtiene datos publicos de la configuracion de empresa sin iniciar sesion', async () => {
  const response = await request(app).get('/api/public/clinic');
  assert.equal(response.status, 200, response.text);
  const current = await repository.getConfig();
  for (const key of ['nombreClinica', 'direccion', 'telefono', 'telefonoPetShop', 'correoContacto', 'facebookUrl', 'horario']) {
    assert.equal(response.body.data[key], current[key]);
  }
  assert.equal(response.body.data.nit, undefined);
  assert.equal(response.body.data.recordatoriosActivos, undefined);
});

test('guardar la empresa mantiene sincronizada la informacion publica del inicio', async () => {
  const token = await login('staff', credentials.admin);
  const current = await repository.getConfig();
  const payload = {
    nombreClinica: current.nombreClinica,
    direccion: current.direccion,
    telefono: current.telefono,
    telefonoPetShop: current.telefonoPetShop,
    correoContacto: current.correoContacto,
    facebookUrl: current.facebookUrl,
    nit: current.nit,
    logoUrl: current.logoUrl,
    horario: current.horario,
    recordatoriosActivos: current.recordatoriosActivos,
  };
  const saved = await request(app).put('/api/config/company')
    .set('Authorization', `Bearer ${token}`).send(payload);
  assert.equal(saved.status, 200, saved.text);
  const publicResponse = await request(app).get('/api/public/clinic');
  assert.equal(publicResponse.status, 200, publicResponse.text);
  for (const key of ['nombreClinica', 'direccion', 'telefono', 'telefonoPetShop', 'correoContacto', 'facebookUrl', 'horario']) {
    assert.equal(publicResponse.body.data[key], payload[key]);
  }
});

test('cada portal acepta solamente su tipo de cuenta', async () => {
  const adminToken = await login('staff', credentials.admin);
  const employeeToken = await login('staff', credentials.employee);
  const clientToken = await login('client', credentials.client);
  assert.ok(adminToken);
  assert.ok(employeeToken);
  assert.ok(clientToken);

  const wrongPortal = await request(app).post('/api/auth/login/staff').send(credentials.client);
  assert.equal(wrongPortal.status, 403);

  const genericLogin = await request(app).post('/api/auth/login').send(credentials.admin);
  assert.equal(genericLogin.status, 401);
});

test('el administrador accede a usuarios y reportes, pero no existe evaluacion pre/post', async () => {
  const token = await login('staff', credentials.admin);
  const users = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
  const reports = await request(app).get('/api/reports').set('Authorization', `Bearer ${token}`);
  const evaluation = await request(app).get('/api/evaluation/summary').set('Authorization', `Bearer ${token}`);
  assert.equal(users.status, 200, users.text);
  assert.equal(reports.status, 200, reports.text);
  assert.equal(evaluation.status, 404, evaluation.text);
  assert.ok(Array.isArray(users.body.data));
});

test('reportes genera un PDF A4 imprimible y protegido por permisos', async () => {
  const adminToken = await login('staff', credentials.admin);
  const clientToken = await login('client', credentials.client);
  const url = '/api/reports/pdf';
  const response = await request(app).get(url).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(response.status, 200, response.text);
  assert.match(response.headers['content-type'], /^application\/pdf/);
  assert.match(response.headers['content-disposition'], /^inline;/);
  const document = await PDFDocument.load(response.body);
  assert.ok(document.getPageCount() >= 1);
  assert.ok(Math.abs(document.getPage(0).getWidth() - 595.28) < 0.01);
  assert.ok(Math.abs(document.getPage(0).getHeight() - 841.89) < 0.01);
  assert.equal((await request(app).get(url).set('Authorization', `Bearer ${clientToken}`)).status, 403);
  assert.equal((await request(app).get(url)).status, 401);
});

test('auditoria muestra responsable y hora de Guatemala, y exporta PDF solo para administrador', async () => {
  const testToken = async (username) => {
    const user = await repository.findUserByIdentifier(username);
    return jwt.sign({ sub: user.id, ver: user.tokenVersion }, env.jwtSecret, { expiresIn: '5m' });
  };
  const adminToken = await testToken(credentials.admin.usuario);
  const employeeToken = await testToken(credentials.employee.usuario);
  const auditResponse = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(auditResponse.status, 200, auditResponse.text);
  assert.ok(auditResponse.body.data.some((row) => row.usuario && row.rol));
  assert.equal(formatAuditDateTime('2026-10-14T21:46:18.710Z'), '14/10/2026 15:46:18');
  assert.equal(auditActor({ usuario: 'Marvin Lopez', rol: 'Empleado' }), 'Marvin Lopez (Empleado)');
  assert.equal(auditActor({ usuario: null }), 'No identificado');

  const url = '/api/audit/pdf';
  const response = await request(app).get(url).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(response.status, 200, response.text);
  assert.match(response.headers['content-type'], /^application\/pdf/);
  assert.match(response.headers['content-disposition'], /reporte-auditoria\.pdf/);
  const document = await PDFDocument.load(response.body);
  assert.ok(document.getPageCount() >= 1);
  assert.ok(Math.abs(document.getPage(0).getWidth() - 595.28) < 0.01);
  assert.ok(Math.abs(document.getPage(0).getHeight() - 841.89) < 0.01);
  assert.equal((await request(app).get(url).set('Authorization', `Bearer ${employeeToken}`)).status, 403);
  assert.equal((await request(app).get(url)).status, 401);

  const sample = await createAuditPdf([
    { usuario: 'Marvin Lopez', rol: 'Empleado', accion: 'mascota.crear', detalle: 'Registro de mascota', creadoEn: '2026-10-14T21:46:18.710Z' },
    { usuario: null, accion: 'auth.login_fallido', detalle: 'Identificador no encontrado '.repeat(700), creadoEn: '2026-10-14T21:46:18.710Z' },
  ], { nombreClinica: 'Clinica Veterinaria El Ganadero' });
  assert.ok((await PDFDocument.load(sample)).getPageCount() > 1);
});

test('el empleado no puede administrar usuarios', async () => {
  const token = await login('staff', credentials.employee);
  const response = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 403);
});

test('la fotografia de mascota se sube como archivo y solo la consultan usuarios autorizados', async () => {
  const employeeToken = await login('staff', credentials.employee);
  const clientToken = await login('client', credentials.client);
  const clientUser = await repository.findUserByIdentifier(credentials.client.usuario);
  const client = await repository.getClientForUser(clientUser.id);
  const [species] = await repository.list('species');
  const pet = await repository.insert('pets', {
    clienteId: client.id, especieId: species.id, razaId: null,
    nombre: `Foto QA ${Date.now()}`, sexo: 'Macho',
  });
  let filename = null;
  try {
    const rejected = await request(app).post(`/api/pets/${pet.id}/photo`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .attach('photo', Buffer.from('no es una imagen'), 'foto.png');
    assert.equal(rejected.status, 400, rejected.text);

    const tooLarge = await request(app).post(`/api/pets/${pet.id}/photo`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), 'foto.jpg');
    assert.equal(tooLarge.status, 413, tooLarge.text);

    const forbidden = await request(app).post(`/api/pets/${pet.id}/photo`)
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('photo', Buffer.from('no es una imagen'), 'foto.png');
    assert.equal(forbidden.status, 403, forbidden.text);

    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
    const uploaded = await request(app).post(`/api/pets/${pet.id}/photo`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .attach('photo', image, 'foto.png');
    assert.equal(uploaded.status, 200, uploaded.text);
    const url = uploaded.body.data.fotoUrl;
    assert.match(url, /^\/api\/pet-photos\/[0-9a-f-]+\.png$/);
    filename = petPhotoService.storedName(url);

    const visibleToStaff = await request(app).get(url).set('Authorization', `Bearer ${employeeToken}`);
    assert.equal(visibleToStaff.status, 200, visibleToStaff.text);
    assert.equal(visibleToStaff.headers['content-type'], 'image/png');
    assert.deepEqual(visibleToStaff.body, image);

    const visibleToOwner = await request(app).get(url).set('Authorization', `Bearer ${clientToken}`);
    assert.equal(visibleToOwner.status, 200, visibleToOwner.text);
    const withoutSession = await request(app).get(url);
    assert.equal(withoutSession.status, 401, withoutSession.text);
  } finally {
    const pool = await getPool();
    const cleanup = pool.request();
    cleanup.input('petId', sql.Int, pet.id);
    await cleanup.query('DELETE FROM dbo.Mascotas WHERE MascotaId=@petId');
    if (filename) await petPhotoService.remove(filename);
  }
});

test('el ticket PDF usa papel de recibo y conserva permisos de venta', async () => {
  const example = {
    empresa: { nombreClinica: 'Clinica Veterinaria El Ganadero', nit: 'CF' },
    cliente: { nombre: 'Cliente de prueba' },
    vendedor: { nombre: 'Empleado de prueba' },
    venta: {
      id: 999, metodoPago: 'Efectivo', subtotal: 80, iva: 9.6, total: 89.6,
      detalles: [{ cantidad: 1, descripcion: 'Shampoo dermatologico', total: 80 }],
    },
  };
  const bytes = await createTicketPdf(example);
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 1);
  assert.ok(Math.abs(document.getPage(0).getWidth() - PAGE_WIDTH) < 0.01);
  assert.ok(document.getPage(0).getHeight() < 250, 'El ticket no debe ocupar una hoja carta o A4');

  const [sale] = await repository.list('sales');
  if (!sale) return;
  const employeeToken = await login('staff', credentials.employee);
  const clientToken = await login('client', credentials.client);
  const url = `/api/sales/${sale.id}/ticket.pdf`;
  const response = await request(app).get(url).set('Authorization', `Bearer ${employeeToken}`);
  assert.equal(response.status, 200, response.text);
  assert.match(response.headers['content-type'], /^application\/pdf/);
  assert.match(response.headers['content-disposition'], /^inline;/);
  const served = await PDFDocument.load(response.body);
  assert.equal(served.getPageCount(), 1);
  assert.ok(Math.abs(served.getPage(0).getWidth() - PAGE_WIDTH) < 0.01);
  assert.equal((await request(app).get(url).set('Authorization', `Bearer ${clientToken}`)).status, 403);
  assert.equal((await request(app).get(url)).status, 401);
});

test('las reglas de negocio invalidas producen errores 4xx claros', async () => {
  const token = await login('staff', credentials.admin);

  const triage = await request(app)
    .post('/api/triage/classify')
    .set('Authorization', `Bearer ${token}`)
    .send({ nivelRiesgoId: 999999, motivo: 'prueba' });
  assert.equal(triage.status, 400, triage.text);
  assert.match(triage.body.message, /nivel de riesgo/i);

  const invalidPet = await request(app)
    .post('/api/pets')
    .set('Authorization', `Bearer ${token}`)
    .send({ clienteId: 999999, especieId: 999999, razaId: null, nombre: 'No crear', sexo: 'Macho' });
  assert.equal(invalidPet.status, 400, invalidPet.text);

  const invalidRole = await request(app)
    .put('/api/users/1')
    .set('Authorization', `Bearer ${token}`)
    .send({ roleId: 999999 });
  assert.equal(invalidRole.status, 400, invalidRole.text);

  const referencedSpecies = await request(app)
    .delete('/api/species/1')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(referencedSpecies.status, 409, referencedSpecies.text);

  const malformed = await request(app)
    .post('/api/triage/classify')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .send('{"motivo":');
  assert.equal(malformed.status, 400, malformed.text);
  assert.equal(malformed.body.message, 'El cuerpo JSON de la solicitud no es valido.');
});

test('citas, vacunas y ventas rechazan fechas y relaciones invalidas', async () => {
  const token = await login('staff', credentials.admin);
  const headers = { Authorization: `Bearer ${token}` };

  const pastAppointment = await request(app).post('/api/appointments').set(headers).send({
    clienteId: 1, mascotaId: 1, fecha: '2020-01-01', hora: '09:00', motivo: 'Control', sintomas: [],
  });
  assert.equal(pastAppointment.status, 400, pastAppointment.text);

  const invalidVaccine = await request(app).post('/api/vaccines').set(headers).send({
    mascotaId: 1, nombreVacuna: 'Prueba', fechaAplicacion: '2026-10-14', proximaDosis: '2026-10-13',
  });
  assert.equal(invalidVaccine.status, 400, invalidVaccine.text);

  const invalidRules = await request(app).put('/api/triage/rules').set(headers).send({
    riskLevels: [{ id: 999999, nombre: 'Prueba', prioridad: 99, tiempoAtencion: '1 min', keywords: ['prueba'], color: '#000000' }],
  });
  assert.equal(invalidRules.status, 400, invalidRules.text);

  const pool = await getPool();
  const expired = await pool.request().query('SELECT TOP 1 ProductoId FROM dbo.Productos WHERE Activo=1 AND FechaVencimiento<CONVERT(date,GETDATE()) AND Stock>0');
  if (expired.recordset[0]) {
    const sale = await request(app).post('/api/sales').set(headers).send({
      clienteId: 1, metodoPago: 'Efectivo', detalles: [{ tipo: 'Producto', referenciaId: expired.recordset[0].ProductoId, cantidad: 1, precioUnitario: 0 }],
    });
    assert.equal(sale.status, 409, sale.text);
    assert.match(sale.body.message, /vencido/i);
  }
});

test('el cliente solo consulta su propio portal', async () => {
  const token = await login('client', credentials.client);
  const portal = await request(app).get('/api/portal/summary').set('Authorization', `Bearer ${token}`);
  const clients = await request(app).get('/api/clients').set('Authorization', `Bearer ${token}`);
  assert.equal(portal.status, 200, portal.text);
  assert.equal(portal.body.data.client.id, 1);
  assert.equal(clients.status, 403);
});

test('el cliente edita solo sus datos y sincroniza nombre y correo de acceso', async () => {
  const user = await repository.findUserByIdentifier(credentials.client.usuario);
  const admin = await repository.findUserByIdentifier(credentials.admin.usuario);
  const original = await repository.getClientForUser(user.id);
  const otherClient = (await repository.list('clients')).find((client) => client.id !== original.id);
  const clientToken = jwt.sign({ sub: user.id, ver: user.tokenVersion }, env.jwtSecret, { expiresIn: '5m' });
  const adminToken = jwt.sign({ sub: admin.id, ver: admin.tokenVersion }, env.jwtSecret, { expiresIn: '5m' });
  const url = '/api/portal/profile';
  const updatedEmail = `perfil-qa-${Date.now()}@example.com`;
  try {
    const invalid = await request(app).put(url).set('Authorization', `Bearer ${clientToken}`)
      .send({ nombre: '', telefono: '', correo: 'incorrecto' });
    assert.equal(invalid.status, 400, invalid.text);
    const forbidden = await request(app).put(url).set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Otro', telefono: '5555-0000', correo: updatedEmail });
    assert.equal(forbidden.status, 403, forbidden.text);
    await assert.rejects(
      repository.updateClientPortalProfile(user.id, {
        nombre: original.nombre, telefono: original.telefono,
        correo: admin.email, direccion: original.direccion,
      }),
      (error) => error.code === 'DUPLICATE_ACCOUNT',
    );

    const saved = await request(app).put(url).set('Authorization', `Bearer ${clientToken}`).send({
      clienteId: otherClient?.id || 99999,
      nombre: 'Cliente Perfil QA', telefono: '5555-0202', correo: updatedEmail,
      direccion: 'Direccion actualizada QA',
    });
    assert.equal(saved.status, 200, saved.text);
    assert.equal(saved.body.data.id, original.id);
    assert.equal(saved.body.data.nombre, 'Cliente Perfil QA');
    assert.equal(saved.body.data.correo, updatedEmail);
    const summary = await request(app).get('/api/portal/summary').set('Authorization', `Bearer ${clientToken}`);
    assert.equal(summary.body.data.client.nombre, 'Cliente Perfil QA');
    const account = await repository.getUser(user.id);
    assert.equal(account.nombre, 'Cliente Perfil QA');
    assert.equal(account.email, updatedEmail);
    assert.equal((await repository.findUserByIdentifier(updatedEmail)).id, user.id);
    if (otherClient) assert.deepEqual(await repository.findById('clients', otherClient.id), otherClient);
  } finally {
    await repository.updateClientPortalProfile(user.id, {
      nombre: original.nombre, telefono: original.telefono,
      correo: user.email, direccion: original.direccion,
    });
  }
});

test('registro detecta por separado usuario y correo duplicados', async () => {
  const common = {
    nombre: 'Cuenta de prueba',
    telefono: '5555-0000',
    direccion: 'Zona 18',
    password: 'PruebaSegura123!',
  };
  const duplicateUsername = await request(app).post('/api/auth/register-client').send({
    ...common,
    usuario: 'CLIENTE',
    email: `unico-${Date.now()}@example.com`,
  });
  assert.equal(duplicateUsername.status, 409, duplicateUsername.text);
  assert.match(duplicateUsername.body.message, /usuario/i);

  const duplicateEmail = await request(app).post('/api/auth/register-client').send({
    ...common,
    usuario: `unico-${Date.now()}`,
    email: 'MARVIN.LOPEZ@EXAMPLE.COM',
  });
  assert.equal(duplicateEmail.status, 409, duplicateEmail.text);
  assert.match(duplicateEmail.body.message, /correo/i);
});

test('cinco fallos bloquean 10 minutos y el siguiente ciclo escala a 30', async () => {
  const employee = await repository.findUserByIdentifier(credentials.employee.usuario);
  const pool = await getPool();
  try {
    await repository.setUserSecurity(employee.id, { failedAttempts: 0, lockedUntil: null, lockCount: 0 });
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await assert.rejects(
        authService.login({ ...credentials.employee, password: 'Incorrecta123!', portal: 'employee', ip: 'formal-lock-test' }),
        (error) => error.statusCode === 401,
      );
    }
    await assert.rejects(
      authService.login({ ...credentials.employee, password: 'Incorrecta123!', portal: 'employee', ip: 'formal-lock-test' }),
      (error) => error.statusCode === 423 && /10 minutos/.test(error.message),
    );

    await repository.setUserSecurity(employee.id, { failedAttempts: 0, lockedUntil: new Date(Date.now() - 60000).toISOString(), lockCount: 1 });
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await assert.rejects(
        authService.login({ ...credentials.employee, password: 'Incorrecta123!', portal: 'employee', ip: 'formal-lock-test' }),
        (error) => error.statusCode === 401,
      );
    }
    await assert.rejects(
      authService.login({ ...credentials.employee, password: 'Incorrecta123!', portal: 'employee', ip: 'formal-lock-test' }),
      (error) => error.statusCode === 423 && /30 minutos/.test(error.message),
    );
  } finally {
    await repository.setUserSecurity(employee.id, { failedAttempts: 0, lockedUntil: null, lockCount: 0 });
    await pool.request().query("DELETE FROM dbo.Auditoria WHERE Ip = 'formal-lock-test'");
  }
});

test('recuperacion no enumera cuentas, usa token una vez e invalida sesiones', async () => {
  const client = await repository.findUserByIdentifier(credentials.client.usuario);
  const pool = await getPool();
  await pool.request().query(`DELETE FROM dbo.PasswordResetTokens WHERE UsuarioId = ${Number(client.id)}`);
  mailService.clearTestMessages();

  const unknown = await request(app).post('/api/auth/password/forgot').send({
    identifier: 'no-existe@example.com',
    portal: 'cliente',
  });
  assert.equal(unknown.status, 200, unknown.text);
  assert.equal(mailService.getLastTestMessage(), null);

  const oldToken = await login('client', credentials.client);
  const forgot = await request(app).post('/api/auth/password/forgot').send({
    identifier: client.email,
    portal: 'cliente',
  });
  assert.equal(forgot.status, 200, forgot.text);
  const resetMessage = mailService.getLastTestMessage();
  assert.ok(resetMessage?.resetUrl);
  const resetToken = new URL(resetMessage.resetUrl).searchParams.get('token');
  assert.ok(resetToken);

  const temporaryPassword = 'ClienteNueva123!';
  try {
    const reset = await request(app).post('/api/auth/password/reset').send({
      token: resetToken,
      password: temporaryPassword,
      confirmPassword: temporaryPassword,
    });
    assert.equal(reset.status, 200, reset.text);

    const oldSession = await request(app).get('/api/portal/summary').set('Authorization', `Bearer ${oldToken}`);
    assert.equal(oldSession.status, 401, oldSession.text);

    const reused = await request(app).post('/api/auth/password/reset').send({
      token: resetToken,
      password: 'OtraSegura123!',
      confirmPassword: 'OtraSegura123!',
    });
    assert.equal(reused.status, 400, reused.text);

    const newLogin = await request(app).post('/api/auth/login/client').send({
      usuario: credentials.client.usuario,
      password: temporaryPassword,
    });
    assert.equal(newLogin.status, 200, newLogin.text);
  } finally {
    await repository.updateUser(client.id, { password: credentials.client.password });
    await pool.request().query(`DELETE FROM dbo.PasswordResetTokens WHERE UsuarioId = ${Number(client.id)}`);
  }
});

test('administrador recupera su clave desde el acceso unificado del personal', async () => {
  const admin = await repository.findUserByIdentifier(credentials.admin.usuario);
  const pool = await getPool();
  mailService.clearTestMessages();
  let resetToken = null;
  try {
    const response = await request(app).post('/api/auth/password/forgot').send({
      identifier: admin.email,
      portal: 'empleado',
    });
    assert.equal(response.status, 200, response.text);
    const resetUrl = mailService.getLastTestMessage()?.resetUrl || '';
    assert.match(resetUrl, /\/empleado\/restablecer\?token=/);
    resetToken = new URL(resetUrl).searchParams.get('token');
  } finally {
    if (resetToken) {
      const cleanup = pool.request();
      cleanup.input('tokenHash', sql.Char(64), crypto.createHash('sha256').update(resetToken).digest('hex'));
      await cleanup.query('DELETE FROM dbo.PasswordResetTokens WHERE TokenHash=@tokenHash');
    }
  }
});
