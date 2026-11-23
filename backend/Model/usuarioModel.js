const sql = require('mssql');
const config = require('../config/db'); // lo crearemos después

const loginUsuario = async (usuario) => {
    const pool = await sql.connect(config);

    const result = await pool.request()
        .input('Usuario', sql.NVarChar, usuario)
        .execute('sp_Login');

    return result.recordset[0];
};

module.exports = {
    loginUsuario
};