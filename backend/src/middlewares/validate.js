const ApiError = require('../utils/ApiError');

const validate = (schema, property = 'body') => (req, _res, next) => {
  const { value, error } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((detail) => detail.message);
    return next(new ApiError(400, 'Datos de entrada invalidos.', details));
  }

  req[property] = value;
  next();
};

module.exports = validate;
