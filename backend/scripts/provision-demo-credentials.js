const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const repository = require('../src/repositories/sqlRepository');
const { closePool, getPool, sql } = require('../src/config/db');

const accounts = [
  { usuario: 'admin', rol: 'Administrador' },
  { usuario: 'empleado', rol: 'Empleado' },
  { usuario: 'cliente', rol: 'Cliente' },
];

const main = async () => {
  const users = [];
  for (const account of accounts) {
    const user = await repository.findUserByIdentifier(account.usuario);
    if (!user || user.rol !== account.rol || !user.activo) {
      throw new Error(`La cuenta ${account.usuario} no coincide con la cuenta de demostracion esperada.`);
    }
    users.push(user);
  }

  const credentials = await Promise.all(users.map(async (user) => {
    const password = `A!9a${crypto.randomBytes(24).toString('base64url')}`;
    return { id: user.id, usuario: user.usuario, password, hash: await bcrypt.hash(password, 12) };
  }));

  const transaction = new sql.Transaction(await getPool());
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    for (const account of credentials) {
      const request = transaction.request();
      request.input('id', sql.Int, account.id);
      request.input('hash', sql.NVarChar(255), account.hash);
      const result = await request.query(`
        UPDATE dbo.Usuarios SET PasswordHash=@hash, Clave=@hash,
          VersionToken=VersionToken+1, IntentosFallidos=0, BloqueadoHasta=NULL,
          BloqueosAcumulados=0, ActualizadoEn=SYSUTCDATETIME()
        WHERE UsuarioId=@id AND Activo=1`);
      if (result.rowsAffected[0] !== 1) throw new Error(`No se pudo actualizar ${account.usuario}.`);
    }
    await transaction.commit();
  } catch (error) {
    try { await transaction.rollback(); } catch (_rollbackError) { /* Ya cerrado. */ }
    throw error;
  }

  process.stdout.write('Guarde estas claves una sola vez en un lugar seguro:\n');
  credentials.forEach(({ usuario, password }) => process.stdout.write(`${usuario}: ${password}\n`));
};

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(closePool);
