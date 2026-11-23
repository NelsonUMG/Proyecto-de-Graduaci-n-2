const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;
const testMessages = [];

const isConfigured = () => env.mail.testMode || Boolean(
  env.mail.host
  && env.mail.port
  && env.mail.user
  && env.mail.password
  && env.mail.from,
);

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      requireTLS: env.mail.requireTls,
      auth: {
        user: env.mail.user,
        pass: env.mail.password,
      },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return transporter;
};

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const sendPasswordReset = async ({ to, name, resetUrl, expiresInMinutes }) => {
  const message = {
    from: env.mail.from,
    to,
    subject: 'Restablecer clave - Veterinaria El Ganadero',
    text: [
      `Hola ${name},`,
      '',
      'Se solicito restablecer la clave de su cuenta.',
      `Abra este enlace dentro de los proximos ${expiresInMinutes} minutos:`,
      resetUrl,
      '',
      'El enlace funciona una sola vez. Si no solicito el cambio, ignore este correo.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1f2937">
        <h2 style="color:#176d40">Veterinaria El Ganadero</h2>
        <p>Hola ${escapeHtml(name)},</p>
        <p>Se solicitó restablecer la clave de su cuenta.</p>
        <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 18px;background:#176d40;color:#fff;text-decoration:none;border-radius:6px">Restablecer clave</a></p>
        <p>Este enlace vence en ${expiresInMinutes} minutos y funciona una sola vez.</p>
        <p>Si no solicitó este cambio, ignore el correo.</p>
      </div>`,
  };

  if (env.mail.testMode) {
    testMessages.push({ ...message, resetUrl });
    return { accepted: [to], testMode: true };
  }

  if (!isConfigured()) {
    const error = new Error('El servicio de correo no esta configurado.');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  return getTransporter().sendMail(message);
};

const verify = async () => {
  if (!isConfigured()) return false;
  if (env.mail.testMode) return true;
  return getTransporter().verify();
};

module.exports = {
  isConfigured,
  sendPasswordReset,
  verify,
  getLastTestMessage: () => testMessages.at(-1) || null,
  clearTestMessages: () => { testMessages.length = 0; },
};
