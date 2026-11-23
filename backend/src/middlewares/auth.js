const jwt = require('jsonwebtoken');
const env = require('../config/env');
const repository = require('../repositories/sqlRepository');
const ApiError = require('../utils/ApiError');

const authenticate = async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = req.cookies?.[env.sessionCookieName] || bearerToken;

  if (!token) {
    return next(new ApiError(401, 'Token de autenticacion requerido.'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await repository.getUser(payload.sub);

    if (!user || !user.activo || Number(payload.ver || 0) !== Number(user.tokenVersion || 0)) {
      return next(new ApiError(401, 'Usuario no autorizado.'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, 'Token invalido o expirado.'));
  }
};

const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!roles.length || roles.includes(req.user.rol)) {
    return next();
  }

  return next(new ApiError(403, 'No tiene permisos para realizar esta accion.'));
};

const authorizePermission = (permission) => (req, _res, next) => {
  if (req.user.permisos.includes('*') || req.user.permisos.includes(permission)) {
    return next();
  }

  return next(new ApiError(403, 'No tiene permisos para realizar esta accion.'));
};

module.exports = {
  authenticate,
  authorizeRoles,
  authorizePermission,
};
