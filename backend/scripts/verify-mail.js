const mailService = require('../src/services/mailService');

const run = async () => {
  if (!mailService.isConfigured()) {
    throw new Error('SMTP incompleto. Revise SMTP_HOST, SMTP_USER, SMTP_PASSWORD y MAIL_FROM.');
  }
  await mailService.verify();
  console.log('Conexion y autenticacion SMTP verificadas correctamente.');
};

run().catch((error) => {
  console.error(`No se pudo verificar SMTP: ${error.message}`);
  process.exitCode = 1;
});
