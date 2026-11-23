const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const repository = require('../repositories/sqlRepository');
const mailService = require('./mailService');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = [10, 30, 60, 90, 120];
const DUMMY_PASSWORD_HASH = '$2b$12$MKjkq2ne4PIX4A9bwDvI3.1och7TkG2ppyeaZwCMiOtL4v3Zf23bC';

const isLocked = (user) => user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now();

const issueToken = (safeUser) => jwt.sign(
  {
    sub: safeUser.id,
    roleId: safeUser.roleId,
    rol: safeUser.rol,
    permisos: safeUser.permisos,
    clienteId: safeUser.clienteId || null,
    ver: safeUser.tokenVersion || 0,
  },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn },
);

const portalRoles = {
  client: ['Cliente'],
  staff: ['Administrador', 'Empleado', 'Veterinario', 'Recepcion'],
};

const recoveryPortalRoles = {
  cliente: portalRoles.client,
  empleado: portalRoles.staff,
};

const lockMinutesForCount = (count) => LOCK_MINUTES[Math.min(Math.max(count - 1, 0), LOCK_MINUTES.length - 1)];
const remainingLockMinutes = (lockedUntil) => Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000));
const lockedMessage = (minutes) => `Cuenta bloqueada. Intente de nuevo en ${minutes} minuto${minutes === 1 ? '' : 's'} o restablezca su clave.`;

const login = async ({ usuario, password, ip, portal = null }) => {
  const user = await repository.findUserByIdentifier(usuario);

  if (!user) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    await repository.addAudit(null, 'auth.login_fallido', 'Identificador no encontrado', ip);
    throw new ApiError(401, 'Usuario o contrasena incorrectos.');
  }

  if (isLocked(user)) {
    throw new ApiError(423, lockedMessage(remainingLockMinutes(user.lockedUntil)));
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    const failedAttempts = (user.failedAttempts || 0) + 1;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockCount = (user.lockCount || 0) + 1;
      const lockMinutes = lockMinutesForCount(lockCount);
      await repository.setUserSecurity(user.id, {
        failedAttempts: 0,
        lockCount,
        lockedUntil: new Date(Date.now() + lockMinutes * 60 * 1000).toISOString(),
      });
      await repository.addAudit(user.id, 'auth.usuario_bloqueado', `Bloqueo ${lockCount}: ${lockMinutes} minutos`, ip);
      throw new ApiError(423, lockedMessage(lockMinutes));
    }

    await repository.setUserSecurity(user.id, { failedAttempts });
    await repository.addAudit(user.id, 'auth.login_fallido', 'Contrasena incorrecta', ip);
    throw new ApiError(401, 'Usuario o contrasena incorrectos.');
  }

  if (portal && !portalRoles[portal]?.includes(user.rol)) {
    await repository.addAudit(user.id, 'auth.portal_incorrecto', `Intento de acceso al portal ${portal}`, ip);
    throw new ApiError(403, 'Esta cuenta no tiene acceso a este portal.');
  }

  await repository.setUserSecurity(user.id, {
    failedAttempts: 0,
    lockedUntil: null,
    lockCount: 0,
    ultimoAcceso: true,
  });
  const safeUser = await repository.getUser(user.id);
  const token = issueToken(safeUser);

  await repository.addAudit(user.id, 'auth.login_exitoso', `Inicio de sesion correcto en portal ${portal || 'general'}`, ip);

  return {
    token,
    expiresIn: env.jwtExpiresIn,
    user: safeUser,
  };
};

const registerClient = async ({ ip, ...payload }) => {
  try {
    const { user, client } = await repository.createClientPortal(payload);
    const token = issueToken(user);
    await repository.addAudit(user.id, 'auth.registro_cliente', `Cliente portal registrado: ${client.id}`, ip);

    return {
      token,
      expiresIn: env.jwtExpiresIn,
      user,
      client,
    };
  } catch (error) {
    if (error.code === 'DUPLICATE_ACCOUNT') {
      throw new ApiError(409, error.message, error.conflict);
    }
    throw error;
  }
};

const requestPasswordReset = async ({ identifier, portal, ip }) => {
  if (!mailService.isConfigured()) {
    throw new ApiError(503, 'La recuperacion por correo aun no esta configurada.');
  }

  const genericResult = {
    message: 'Si los datos corresponden a una cuenta, recibira un enlace de recuperacion.',
  };
  const user = await repository.findUserByIdentifier(identifier);
  if (!user || !recoveryPortalRoles[portal]?.includes(user.rol)) {
    await repository.addAudit(null, 'auth.reset_solicitado', 'Solicitud sin cuenta coincidente', ip);
    return genericResult;
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + env.passwordResetMinutes * 60 * 1000).toISOString();
  const stored = await repository.createPasswordResetToken({
    userId: user.id,
    tokenHash,
    portal,
    expiresAt,
    ip,
  });
  if (!stored.created) return genericResult;

  const baseUrl = env.appUrls[portal].replace(/\/$/, '');
  const resetUrl = `${baseUrl}/${portal}/restablecer?token=${encodeURIComponent(rawToken)}`;
  try {
    await mailService.sendPasswordReset({
      to: user.email,
      name: user.nombre,
      resetUrl,
      expiresInMinutes: env.passwordResetMinutes,
    });
    await repository.addAudit(user.id, 'auth.reset_enviado', `Enlace enviado para portal ${portal}`, ip);
  } catch (error) {
    await repository.addAudit(user.id, 'auth.reset_error_correo', error.code || 'SMTP_ERROR', ip);
  }

  return genericResult;
};

const resetPassword = async ({ token, password, ip }) => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await repository.consumePasswordResetToken({ tokenHash, password });
  if (!result) {
    throw new ApiError(400, 'El enlace es invalido, ya fue utilizado o ha vencido.');
  }

  await repository.addAudit(result.user.id, 'auth.password_restablecida', 'Clave restablecida mediante token', ip);
  return { portal: result.portal };
};

module.exports = {
  login,
  registerClient,
  requestPasswordReset,
  resetPassword,
  lockMinutesForCount,
};
