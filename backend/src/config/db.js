const env = require('./env');

const sql = env.dbAuth === 'windows' ? require('mssql/msnodesqlv8') : require('mssql');

let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    const config = env.dbAuth === 'windows'
      ? {
          connectionString: `Driver={${env.dbDriver}};Server=${env.sql.server};Database=${env.sql.database};Trusted_Connection=yes;Encrypt=${env.sql.options.encrypt ? 'yes' : 'no'};TrustServerCertificate=${env.sql.options.trustServerCertificate ? 'yes' : 'no'};`,
          pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
        }
      : {
          ...env.sql,
          pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
        };

    poolPromise = new sql.ConnectionPool(config).connect();
  }

  return poolPromise;
};

const closePool = async () => {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = undefined;
  await pool.close();
};

const executeProcedure = async (procedureName, inputs = {}) => {
  const pool = await getPool();
  const request = pool.request();

  Object.entries(inputs).forEach(([name, definition]) => {
    if (definition && definition.type) {
      request.input(name, definition.type, definition.value);
      return;
    }

    request.input(name, definition);
  });

  return request.execute(procedureName);
};

module.exports = {
  sql,
  getPool,
  closePool,
  executeProcedure,
};
