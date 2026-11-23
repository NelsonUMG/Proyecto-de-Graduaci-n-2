const authService = require('../services/authService');
const repository = require('../repositories/sqlRepository');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/http');
const env = require('../config/env');

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.nodeEnv === 'production',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

const startSession = (res, result) => {
  res.cookie(env.sessionCookieName, result.token, sessionCookieOptions);
};

const loginPortal = (portal) => asyncHandler(async (req, res) => {
  const result = await authService.login({ ...req.body, portal, ip: req.ip });
  startSession(res, result);
  ok(res, result, 'Inicio de sesion correcto.');
});

const registerClient = asyncHandler(async (req, res) => {
  const result = await authService.registerClient({
    ...req.body,
    ip: req.ip,
  });

  startSession(res, result);
  ok(res, result, 'Cuenta de cliente creada correctamente.');
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset({ ...req.body, ip: req.ip });
  ok(res, result, result.message);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({ ...req.body, ip: req.ip });
  ok(res, result, 'Clave restablecida correctamente. Ya puede iniciar sesion.');
});

const me = asyncHandler(async (req, res) => {
  ok(res, req.user);
});

const logout = asyncHandler(async (req, res) => {
  await repository.addAudit(req.user.id, 'auth.logout', 'Cierre de sesion', req.ip);
  const { maxAge: _maxAge, ...clearCookieOptions } = sessionCookieOptions;
  res.clearCookie(env.sessionCookieName, clearCookieOptions);
  ok(res, null, 'Sesion cerrada correctamente.');
});

module.exports = {
  loginClient: loginPortal('client'),
  loginStaff: loginPortal('staff'),
  registerClient,
  requestPasswordReset,
  resetPassword,
  me,
  logout,
};
