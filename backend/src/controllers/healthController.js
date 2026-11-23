const env = require('../config/env');
const repository = require('../repositories/sqlRepository');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/http');

const health = asyncHandler(async (_req, res) => {
  const database = await repository.ping();
  ok(res, {
    service: 'Veterinaria El Ganadero API',
    status: 'up',
    environment: env.nodeEnv,
    dbMode: 'sql-server',
    database: database.databaseName,
    databaseUser: database.databaseUser,
    timestamp: new Date().toISOString(),
  });
});

module.exports = {
  health,
};
