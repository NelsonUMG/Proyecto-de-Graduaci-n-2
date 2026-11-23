const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const toBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173',
  jwtSecret: process.env.JWT_SECRET || 'cambiar-este-secreto-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'vet_session',
  passwordResetMinutes: toNumber(process.env.PASSWORD_RESET_MINUTES, 30),
  bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 10),
  dbEnabled: toBool(process.env.DB_ENABLED, true),
  dbAuth: process.env.DB_AUTH || 'windows',
  dbDriver: process.env.DB_DRIVER || 'ODBC Driver 18 for SQL Server',
  appUrls: {
    cliente: process.env.CLIENT_APP_URL || 'http://localhost:4000',
    empleado: process.env.EMPLOYEE_APP_URL || 'http://localhost:4000',
  },
  mail: {
    testMode: toBool(process.env.MAIL_TEST_MODE, false),
    host: process.env.SMTP_HOST || '',
    port: toNumber(process.env.SMTP_PORT, 587),
    secure: toBool(process.env.SMTP_SECURE, false),
    requireTls: toBool(process.env.SMTP_REQUIRE_TLS, true),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.MAIL_FROM || '',
  },
  sql: {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'VeterinariaDB',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: toNumber(process.env.DB_PORT, 1433),
    options: {
      encrypt: toBool(process.env.DB_ENCRYPT, false),
      trustServerCertificate: toBool(process.env.DB_TRUST_CERT, true),
    },
  },
};

if (!env.dbEnabled) {
  throw new Error('DB_ENABLED=false ya no esta permitido. La aplicacion requiere SQL Server.');
}

if (env.nodeEnv === 'production' && env.jwtSecret === 'cambiar-este-secreto-en-produccion') {
  throw new Error('JWT_SECRET es obligatorio en produccion.');
}

module.exports = env;
