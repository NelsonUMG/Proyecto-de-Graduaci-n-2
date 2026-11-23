const env = require('../config/env');

const businessStatuses = {
  INVALID_ROLE: 400,
  INVALID_RISK_LEVEL: 400,
  INVALID_CLIENT: 400,
  INVALID_USER: 400,
  INVALID_PET: 400,
  INVALID_SPECIES: 400,
  INVALID_BREED: 400,
  INVALID_SPECIES_BREED: 400,
  INVALID_CLIENT_PET: 400,
  INVALID_APPOINTMENT_RELATION: 400,
  INVALID_CLINICAL_DATE: 400,
  APPOINTMENT_OUTSIDE_SCHEDULE: 409,
  APPOINTMENT_IN_PAST: 409,
  APPOINTMENT_CONFLICT: 409,
  PRODUCT_NOT_FOUND: 409,
  INVALID_SALE_ITEM: 409,
  EXPIRED_SALE_ITEM: 409,
  INSUFFICIENT_STOCK: 409,
  RECORD_IN_USE: 409,
};

const errorHandler = (error, _req, res, _next) => {
  const isMalformedJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const isTooLarge = error.type === 'entity.too.large';
  const isPhotoTooLarge = error.code === 'LIMIT_FILE_SIZE';
  const isUploadError = typeof error.code === 'string' && error.code.startsWith('LIMIT_');
  const sqlNumber = error.number || error.originalError?.info?.number;
  const isSqlConstraint = [547, 2601, 2627].includes(Number(sqlNumber));
  const statusCode = isMalformedJson ? 400 : isTooLarge || isPhotoTooLarge ? 413 : isUploadError ? 400 : error.statusCode || businessStatuses[error.code] || (isSqlConstraint ? 409 : 500);
  const safeMessage = isMalformedJson
    ? 'El cuerpo JSON de la solicitud no es valido.'
    : isTooLarge || isPhotoTooLarge
      ? 'La fotografia excede el limite de 5 MB.'
      : isUploadError
        ? 'La solicitud de fotografia no es valida.'
      : isSqlConstraint
        ? 'El registro entra en conflicto con datos existentes o relaciones protegidas.'
        : error.message;
  const payload = {
    ok: false,
    message: statusCode === 500 ? 'Error interno del servidor.' : safeMessage,
  };

  if (error.details || error.conflict) {
    payload.details = error.details || error.conflict;
  }

  if (env.nodeEnv !== 'production' && statusCode === 500) {
    payload.debug = error.message;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
