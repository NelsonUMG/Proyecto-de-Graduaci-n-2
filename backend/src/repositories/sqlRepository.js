const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');
const clinicClock = require('../utils/clinicClock');

const type = {
  int: () => sql.Int,
  bigint: () => sql.BigInt,
  bit: () => sql.Bit,
  date: () => sql.Date,
  datetime: () => sql.DateTime2,
  decimal: () => sql.Decimal(18, 2),
  text: (length = 1000) => () => sql.NVarChar(length),
  time: () => sql.VarChar(5),
};

const dateOnly = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const timeOnly = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 5);
  return new Date(value).toISOString().slice(11, 16);
};

const numberOrNull = (value) => (value === null || value === undefined ? null : Number(value));
const parseSymptoms = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch (_error) {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
};

const serializeSymptoms = (value) => JSON.stringify(Array.isArray(value) ? value : []);

const common = {
  activo: { db: 'Activo', type: type.bit },
  creadoEn: { db: 'CreadoEn', type: type.datetime, write: false },
  actualizadoEn: { db: 'ActualizadoEn', type: type.datetime, write: false },
};

const collections = {
  clients: {
    table: 'Clientes', id: 'ClienteId',
    fields: {
      nombre: { db: 'Nombre', type: type.text(140) },
      telefono: { db: 'Telefono', type: type.text(30) },
      dpi: { db: 'DPI', type: type.text(20) },
      correo: { db: 'Correo', type: type.text(160) },
      direccion: { db: 'Direccion', type: type.text(300) },
      fechaRegistro: { db: 'FechaRegistro', type: type.date, fromDb: dateOnly },
      ...common,
    },
  },
  pets: {
    table: 'Mascotas', id: 'MascotaId',
    fields: {
      clienteId: { db: 'ClienteId', type: type.int, fromDb: Number },
      especieId: { db: 'EspecieId', type: type.int, fromDb: Number },
      razaId: { db: 'RazaId', type: type.int, fromDb: numberOrNull },
      nombre: { db: 'Nombre', type: type.text(100) },
      sexo: { db: 'Sexo', type: type.text(30) },
      peso: { db: 'Peso', type: type.decimal, fromDb: numberOrNull },
      color: { db: 'Color', type: type.text(80) },
      fechaNacimiento: { db: 'FechaNacimiento', type: type.date, fromDb: dateOnly },
      fotoUrl: { db: 'FotoUrl', type: type.text(500) },
      observaciones: { db: 'Observaciones', type: type.text(1000) },
      ...common,
    },
  },
  species: {
    table: 'Especies', id: 'EspecieId',
    fields: { nombre: { db: 'Nombre', type: type.text(80) }, ...common },
  },
  breeds: {
    table: 'Razas', id: 'RazaId',
    fields: {
      especieId: { db: 'EspecieId', type: type.int, fromDb: Number },
      nombre: { db: 'Nombre', type: type.text(100) },
      ...common,
    },
  },
  appointments: {
    table: 'Citas', id: 'CitaId',
    fields: {
      clienteId: { db: 'ClienteId', type: type.int, fromDb: Number },
      mascotaId: { db: 'MascotaId', type: type.int, fromDb: Number },
      nivelRiesgoId: { db: 'NivelRiesgoId', type: type.int, fromDb: Number },
      usuarioRegistroId: { db: 'UsuarioRegistroId', type: type.int, fromDb: Number },
      fecha: { db: 'Fecha', type: type.date, fromDb: dateOnly },
      hora: { db: 'Hora', type: type.time, fromDb: timeOnly },
      motivo: { db: 'Motivo', type: type.text(300) },
      sintomas: { db: 'Sintomas', type: type.text(1000), fromDb: parseSymptoms, toDb: serializeSymptoms },
      estado: { db: 'Estado', type: type.text(40) },
      riesgoModificadoPorId: { db: 'RiesgoModificadoPorId', type: type.int, fromDb: numberOrNull },
      riesgoModificadoEn: { db: 'RiesgoModificadoEn', type: type.datetime },
      ...common,
    },
  },
  clinicalRecords: {
    table: 'HistorialClinico', id: 'HistorialClinicoId',
    fields: {
      mascotaId: { db: 'MascotaId', type: type.int, fromDb: Number },
      clienteId: { db: 'ClienteId', type: type.int, fromDb: Number },
      citaId: { db: 'CitaId', type: type.int, fromDb: numberOrNull },
      veterinarioId: { db: 'VeterinarioId', type: type.int, fromDb: numberOrNull },
      motivoConsulta: { db: 'MotivoConsulta', type: type.text(300) },
      sintomas: { db: 'Sintomas', type: type.text(1000) },
      diagnostico: { db: 'Diagnostico', type: type.text(1000) },
      tratamiento: { db: 'Tratamiento', type: type.text(1000) },
      medicamentos: { db: 'Medicamentos', type: type.text(1000) },
      observaciones: { db: 'Observaciones', type: type.text(1000) },
      proximaCita: { db: 'ProximaCita', type: type.date, fromDb: dateOnly },
      ...common,
    },
  },
  treatments: {
    table: 'Tratamientos', id: 'TratamientoId',
    fields: {
      mascotaId: { db: 'MascotaId', type: type.int, fromDb: Number },
      veterinarioId: { db: 'VeterinarioId', type: type.int, fromDb: numberOrNull },
      estado: { db: 'Estado', type: type.text(40) },
      fechaInicio: { db: 'FechaInicio', type: type.date, fromDb: dateOnly },
      fechaFin: { db: 'FechaFin', type: type.date, fromDb: dateOnly },
      medicamentoServicio: { db: 'MedicamentoServicio', type: type.text(200) },
      dosisIndicaciones: { db: 'DosisIndicaciones', type: type.text(500) },
      observaciones: { db: 'Observaciones', type: type.text(500) },
      seguimiento: { db: 'Seguimiento', type: type.text(500) },
      ...common,
    },
  },
  vaccines: {
    table: 'Vacunas', id: 'VacunaId',
    fields: {
      mascotaId: { db: 'MascotaId', type: type.int, fromDb: Number },
      veterinarioId: { db: 'VeterinarioId', type: type.int, fromDb: numberOrNull },
      nombreVacuna: { db: 'NombreVacuna', type: type.text(160) },
      fechaAplicacion: { db: 'FechaAplicacion', type: type.date, fromDb: dateOnly },
      proximaDosis: { db: 'ProximaDosis', type: type.date, fromDb: dateOnly },
      lote: { db: 'Lote', type: type.text(80) },
      fechaVencimientoProducto: { db: 'FechaVencimientoProducto', type: type.date, fromDb: dateOnly },
      observaciones: { db: 'Observaciones', type: type.text(500) },
      ...common,
    },
  },
  products: {
    table: 'Productos', id: 'ProductoId',
    fields: {
      nombre: { db: 'Nombre', type: type.text(160) },
      categoria: { db: 'Categoria', type: type.text(100) },
      stock: { db: 'Stock', type: type.decimal, fromDb: Number },
      stockMinimo: { db: 'StockMinimo', type: type.decimal, fromDb: Number },
      precio: { db: 'Precio', type: type.decimal, fromDb: Number },
      fechaVencimiento: { db: 'FechaVencimiento', type: type.date, fromDb: dateOnly },
      lote: { db: 'Lote', type: type.text(80) },
      ...common,
    },
  },
  services: {
    table: 'Servicios', id: 'ServicioId',
    fields: {
      nombre: { db: 'Nombre', type: type.text(160) },
      categoria: { db: 'Categoria', type: type.text(100) },
      precio: { db: 'Precio', type: type.decimal, fromDb: Number },
      ...common,
    },
  },
  inventoryMovements: {
    table: 'InventarioMovimientos', id: 'InventarioMovimientoId', active: false,
    fields: {
      productoId: { db: 'ProductoId', type: type.int, fromDb: Number },
      usuarioId: { db: 'UsuarioId', type: type.int, fromDb: numberOrNull },
      tipo: { db: 'Tipo', type: type.text(30) },
      cantidad: { db: 'Cantidad', type: type.decimal, fromDb: Number },
      motivo: { db: 'Motivo', type: type.text(250) },
      creadoEn: { db: 'CreadoEn', type: type.datetime, write: false },
    },
  },
};

const definitionFor = (collection) => {
  const definition = collections[collection];
  if (!definition) throw new Error(`Coleccion SQL no soportada: ${collection}`);
  return definition;
};

const mapRow = (definition, row) => {
  if (!row) return null;
  const result = { id: Number(row[definition.id]) };
  Object.entries(definition.fields).forEach(([field, descriptor]) => {
    if (!Object.prototype.hasOwnProperty.call(row, descriptor.db)) return;
    const value = row[descriptor.db];
    result[field] = descriptor.fromDb ? descriptor.fromDb(value) : value;
  });
  return result;
};

const addInput = (request, name, descriptor, value) => {
  const dbValue = descriptor.toDb ? descriptor.toDb(value) : value;
  request.input(name, descriptor.type(), dbValue === undefined ? null : dbValue);
};

const findByIdWith = async (executor, collection, id, { includeInactive = false } = {}) => {
  if (collection === 'sales') return getSaleWith(executor, id);
  const definition = definitionFor(collection);
  const request = executor.request();
  request.input('id', sql.Int, Number(id));
  const activeClause = includeInactive || definition.active === false || !definition.fields.activo ? '' : ' AND [Activo] = 1';
  const result = await request.query(`SELECT TOP 1 * FROM dbo.[${definition.table}] WHERE [${definition.id}] = @id${activeClause}`);
  return mapRow(definition, result.recordset[0]);
};

const listWith = async (executor, collection, filters = {}) => {
  if (collection === 'sales') return listSalesWith(executor);
  const definition = definitionFor(collection);
  const request = executor.request();
  const conditions = [];
  if (definition.active !== false && definition.fields.activo) conditions.push('[Activo] = 1');

  if (filters.search) {
    const searchFields = (filters.searchFields || ['nombre']).filter((field) => definition.fields[field]);
    if (searchFields.length) {
      request.input('search', sql.NVarChar(300), `%${filters.search}%`);
      conditions.push(`(${searchFields.map((field) => `CONVERT(NVARCHAR(300), [${definition.fields[field].db}]) LIKE @search`).join(' OR ')})`);
    }
  }

  Object.entries(filters.equals || {}).forEach(([field, value]) => {
    const descriptor = definition.fields[field];
    if (!descriptor || value === undefined || value === null || value === '' || field === 'search') return;
    const parameter = `eq_${field}`;
    addInput(request, parameter, descriptor, value);
    conditions.push(`[${descriptor.db}] = @${parameter}`);
  });

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
  const result = await request.query(`SELECT * FROM dbo.[${definition.table}]${where} ORDER BY [${definition.id}] DESC`);
  return result.recordset.map((row) => mapRow(definition, row));
};

const insertWith = async (executor, collection, payload) => {
  const definition = definitionFor(collection);
  const writable = Object.entries(definition.fields).filter(
    ([field, descriptor]) => descriptor.write !== false && Object.prototype.hasOwnProperty.call(payload, field),
  );
  if (!writable.length) throw new Error(`No hay campos validos para insertar en ${collection}.`);
  const request = executor.request();
  writable.forEach(([field, descriptor]) => addInput(request, field, descriptor, payload[field]));
  const columns = writable.map(([, descriptor]) => `[${descriptor.db}]`).join(', ');
  const values = writable.map(([field]) => `@${field}`).join(', ');
  const result = await request.query(
    `INSERT INTO dbo.[${definition.table}] (${columns}) VALUES (${values}); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
  );
  return findByIdWith(executor, collection, result.recordset[0].id, { includeInactive: true });
};

const updateWith = async (executor, collection, id, payload) => {
  const definition = definitionFor(collection);
  const writable = Object.entries(definition.fields).filter(
    ([field, descriptor]) => descriptor.write !== false && Object.prototype.hasOwnProperty.call(payload, field),
  );
  if (!writable.length) return findByIdWith(executor, collection, id);
  const request = executor.request();
  request.input('id', sql.Int, Number(id));
  writable.forEach(([field, descriptor]) => addInput(request, field, descriptor, payload[field]));
  const updates = writable.map(([field, descriptor]) => `[${descriptor.db}] = @${field}`);
  if (definition.fields.actualizadoEn) updates.push('[ActualizadoEn] = SYSUTCDATETIME()');
  await request.query(`UPDATE dbo.[${definition.table}] SET ${updates.join(', ')} WHERE [${definition.id}] = @id`);
  return findByIdWith(executor, collection, id);
};

const mapRiskLevel = (row) => row ? ({
  id: Number(row.NivelRiesgoId),
  nombre: row.Nombre,
  prioridad: Number(row.Prioridad),
  descripcion: row.Descripcion || '',
  tiempoAtencion: row.TiempoAtencion || '',
  keywords: String(row.PalabrasClave || '').split(',').map((item) => item.trim()).filter(Boolean),
  color: row.ColorHex,
  activo: Boolean(row.Activo),
}) : null;

const getRiskLevelsWith = async (executor) => {
  const result = await executor.request().query('SELECT * FROM dbo.NivelesRiesgo WHERE Activo = 1 ORDER BY Prioridad');
  return result.recordset.map(mapRiskLevel);
};

const getConfigWith = async (executor) => {
  const result = await executor.request().query('SELECT TOP 1 * FROM dbo.ConfiguracionEmpresa ORDER BY ConfiguracionEmpresaId');
  const row = result.recordset[0];
  return row ? {
    id: Number(row.ConfiguracionEmpresaId),
    nombreClinica: row.NombreClinica,
    direccion: row.Direccion,
    telefono: row.Telefono,
    telefonoPetShop: row.TelefonoPetShop || '',
    correoContacto: row.CorreoContacto || '',
    facebookUrl: row.FacebookUrl || '',
    nit: row.NIT,
    logoUrl: row.LogoUrl || '',
    horario: row.Horario || '',
    recordatoriosActivos: Boolean(row.RecordatoriosActivos),
    actualizadoEn: row.ActualizadoEn,
  } : null;
};

const userSelect = `
  SELECT u.UsuarioId, u.RolId, u.ClienteId, u.Nombre, u.Usuario, u.Email,
    u.PasswordHash, u.IntentosFallidos, u.BloqueadoHasta, u.BloqueosAcumulados,
    u.VersionToken, u.UltimoAcceso, u.Activo,
    r.Nombre AS Rol,
    permisos.Permisos
  FROM dbo.Usuarios u
  INNER JOIN dbo.Roles r ON r.RolId = u.RolId
  OUTER APPLY (
    SELECT STRING_AGG(p.Nombre, ',') AS Permisos
    FROM dbo.RolPermiso rp
    INNER JOIN dbo.Permisos p ON p.PermisoId = rp.PermisoId AND p.Activo = 1
    WHERE rp.RolId = u.RolId
  ) permisos`;

const mapUser = (row, includePassword = false) => {
  if (!row) return null;
  const user = {
    id: Number(row.UsuarioId),
    roleId: Number(row.RolId),
    clienteId: numberOrNull(row.ClienteId),
    nombre: row.Nombre,
    usuario: row.Usuario,
    email: row.Email,
    rol: row.Rol,
    permisos: String(row.Permisos || '').split(',').filter(Boolean),
    failedAttempts: Number(row.IntentosFallidos || 0),
    lockedUntil: row.BloqueadoHasta || null,
    lockCount: Number(row.BloqueosAcumulados || 0),
    tokenVersion: Number(row.VersionToken || 0),
    ultimoAcceso: row.UltimoAcceso || null,
    activo: Boolean(row.Activo),
  };
  if (includePassword) user.passwordHash = row.PasswordHash;
  return user;
};

const getUserWith = async (executor, id, includePassword = false) => {
  const request = executor.request();
  request.input('id', sql.Int, Number(id));
  const result = await request.query(`${userSelect} WHERE u.UsuarioId = @id`);
  return mapUser(result.recordset[0], includePassword);
};

const listUsersWith = async (executor) => {
  const result = await executor.request().query(`${userSelect} ORDER BY u.Nombre`);
  return result.recordset.map((row) => mapUser(row));
};

const findUserByIdentifierWith = async (executor, identifier) => {
  const request = executor.request();
  request.input('identifier', sql.NVarChar(160), String(identifier).trim());
  const result = await request.query(`${userSelect} WHERE u.Activo = 1 AND (u.Usuario = @identifier OR u.Email = @identifier)`);
  return mapUser(result.recordset[0], true);
};

const accountDuplicatesWith = async (executor, { usuario, email, excludeUserId = null }) => {
  const request = executor.request();
  request.input('usuario', sql.NVarChar(80), String(usuario || '').trim());
  request.input('email', sql.NVarChar(160), String(email || '').trim().toLowerCase());
  request.input('excludeUserId', sql.Int, excludeUserId ? Number(excludeUserId) : null);
  const result = await request.query(`
    SELECT
      CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Usuarios WITH (UPDLOCK, HOLDLOCK)
        WHERE Usuario = @usuario AND (@excludeUserId IS NULL OR UsuarioId <> @excludeUserId)
      ) THEN 1 ELSE 0 END AS UsuarioExiste,
      CASE WHEN EXISTS (
        SELECT 1 FROM dbo.Usuarios WITH (UPDLOCK, HOLDLOCK)
        WHERE Email = @email AND (@excludeUserId IS NULL OR UsuarioId <> @excludeUserId)
      ) THEN 1 ELSE 0 END AS EmailExiste`);
  return {
    usuario: Boolean(result.recordset[0].UsuarioExiste),
    email: Boolean(result.recordset[0].EmailExiste),
  };
};

const duplicateAccountError = (duplicates = {}) => {
  const messages = [];
  if (duplicates.usuario) messages.push('El nombre de usuario ya esta registrado.');
  if (duplicates.email) messages.push('El correo electronico ya esta registrado.');
  return makeBusinessError(
    'DUPLICATE_ACCOUNT',
    messages.join(' ') || 'El usuario o correo ya esta registrado.',
    messages,
  );
};

const mapPetDetailed = (row) => ({
  ...mapRow(collections.pets, row),
  cliente: row.Cliente || null,
  especie: row.Especie || null,
  raza: row.Raza || null,
});

const mapAppointmentDetailed = (row) => ({
  ...mapRow(collections.appointments, row),
  cliente: row.Cliente || null,
  mascota: row.Mascota || null,
  registradoPor: row.RegistradoPor || null,
  riesgo: row.RiesgoNombre ? {
    id: Number(row.NivelRiesgoId),
    nombre: row.RiesgoNombre,
    prioridad: Number(row.RiesgoPrioridad),
    descripcion: row.RiesgoDescripcion || '',
    tiempoAtencion: row.RiesgoTiempoAtencion || '',
    color: row.RiesgoColor,
  } : null,
});

const listPetsDetailedWith = async (executor, filters = {}) => {
  const request = executor.request();
  const conditions = ['m.Activo = 1'];
  if (filters.search) {
    request.input('search', sql.NVarChar(300), `%${filters.search}%`);
    conditions.push('(m.Nombre LIKE @search OR m.Sexo LIKE @search OR m.Color LIKE @search OR c.Nombre LIKE @search)');
  }
  if (filters.clienteId) {
    request.input('clienteId', sql.Int, Number(filters.clienteId));
    conditions.push('m.ClienteId = @clienteId');
  }
  const result = await request.query(`
    SELECT m.*, c.Nombre AS Cliente, e.Nombre AS Especie, r.Nombre AS Raza
    FROM dbo.Mascotas m
    INNER JOIN dbo.Clientes c ON c.ClienteId = m.ClienteId
    INNER JOIN dbo.Especies e ON e.EspecieId = m.EspecieId
    LEFT JOIN dbo.Razas r ON r.RazaId = m.RazaId
    WHERE ${conditions.join(' AND ')}
    ORDER BY m.Nombre`);
  return result.recordset.map(mapPetDetailed);
};

const listAppointmentsDetailedWith = async (executor, filters = {}) => {
  const request = executor.request();
  const conditions = ['a.Activo = 1'];
  const filterMap = { fecha: ['a.Fecha', sql.Date], estado: ['a.Estado', sql.NVarChar(40)], clienteId: ['a.ClienteId', sql.Int], mascotaId: ['a.MascotaId', sql.Int], nivelRiesgoId: ['a.NivelRiesgoId', sql.Int] };
  Object.entries(filters).forEach(([field, value]) => {
    if (!filterMap[field] || value === undefined || value === null || value === '') return;
    const [column, sqlType] = filterMap[field];
    request.input(field, sqlType, field.endsWith('Id') ? Number(value) : value);
    conditions.push(`${column} = @${field}`);
  });
  if (filters.search) {
    request.input('search', sql.NVarChar(300), `%${filters.search}%`);
    conditions.push('(a.Motivo LIKE @search OR a.Estado LIKE @search OR c.Nombre LIKE @search OR m.Nombre LIKE @search)');
  }
  const result = await request.query(`
    SELECT a.*, c.Nombre AS Cliente, m.Nombre AS Mascota, u.Nombre AS RegistradoPor,
      n.Nombre AS RiesgoNombre, n.Prioridad AS RiesgoPrioridad, n.Descripcion AS RiesgoDescripcion,
      n.TiempoAtencion AS RiesgoTiempoAtencion, n.ColorHex AS RiesgoColor
    FROM dbo.Citas a
    INNER JOIN dbo.Clientes c ON c.ClienteId = a.ClienteId
    INNER JOIN dbo.Mascotas m ON m.MascotaId = a.MascotaId
    INNER JOIN dbo.NivelesRiesgo n ON n.NivelRiesgoId = a.NivelRiesgoId
    LEFT JOIN dbo.Usuarios u ON u.UsuarioId = a.UsuarioRegistroId
    WHERE ${conditions.join(' AND ')}
    ORDER BY a.Fecha, a.Hora`);
  return result.recordset.map(mapAppointmentDetailed);
};

const getAppointmentDetailedWith = async (executor, id) => {
  const request = executor.request();
  request.input('id', sql.Int, Number(id));
  const result = await request.query(`
    SELECT a.*, c.Nombre AS Cliente, m.Nombre AS Mascota, u.Nombre AS RegistradoPor,
      n.Nombre AS RiesgoNombre, n.Prioridad AS RiesgoPrioridad, n.Descripcion AS RiesgoDescripcion,
      n.TiempoAtencion AS RiesgoTiempoAtencion, n.ColorHex AS RiesgoColor
    FROM dbo.Citas a
    INNER JOIN dbo.Clientes c ON c.ClienteId = a.ClienteId
    INNER JOIN dbo.Mascotas m ON m.MascotaId = a.MascotaId
    INNER JOIN dbo.NivelesRiesgo n ON n.NivelRiesgoId = a.NivelRiesgoId
    LEFT JOIN dbo.Usuarios u ON u.UsuarioId = a.UsuarioRegistroId
    WHERE a.CitaId = @id AND a.Activo = 1`);
  return result.recordset[0] ? mapAppointmentDetailed(result.recordset[0]) : null;
};

const mapSale = (row) => ({
  id: Number(row.VentaId),
  clienteId: numberOrNull(row.ClienteId),
  usuarioId: Number(row.UsuarioId),
  metodoPago: row.MetodoPago,
  subtotal: Number(row.Subtotal),
  iva: Number(row.IVA),
  total: Number(row.Total),
  estado: row.Estado,
  creadoEn: row.CreadoEn,
  detalles: [],
});

const mapSaleDetail = (row) => ({
  id: Number(row.VentaDetalleId),
  tipo: row.TipoItem,
  referenciaId: Number(row.ProductoId || row.ServicioId),
  descripcion: row.Descripcion,
  cantidad: Number(row.Cantidad),
  precioUnitario: Number(row.PrecioUnitario),
  total: Number(row.Total),
});

async function listSalesWith(executor) {
  const result = await executor.request().query(`
    SELECT * FROM dbo.Ventas ORDER BY VentaId DESC;
    SELECT * FROM dbo.VentaDetalle ORDER BY VentaDetalleId;`);
  const sales = result.recordsets[0].map(mapSale);
  const byId = new Map(sales.map((sale) => [sale.id, sale]));
  result.recordsets[1].forEach((row) => byId.get(Number(row.VentaId))?.detalles.push(mapSaleDetail(row)));
  return sales;
}

async function getSaleWith(executor, id) {
  const request = executor.request();
  request.input('id', sql.Int, Number(id));
  const result = await request.query('SELECT * FROM dbo.Ventas WHERE VentaId = @id; SELECT * FROM dbo.VentaDetalle WHERE VentaId = @id ORDER BY VentaDetalleId;');
  if (!result.recordsets[0][0]) return null;
  const sale = mapSale(result.recordsets[0][0]);
  sale.detalles = result.recordsets[1].map(mapSaleDetail);
  return sale;
}

const withTransaction = async (work) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const result = await work(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    try { await transaction.rollback(); } catch (_rollbackError) { /* transaction already closed */ }
    throw error;
  }
};

const makeBusinessError = (code, message, details = null) => {
  const error = new Error(message);
  error.code = code;
  error.conflict = details;
  return error;
};

const validatePetRelationsWith = async (executor, payload) => {
  const request = executor.request();
  request.input('clientId', sql.Int, Number(payload.clienteId));
  request.input('speciesId', sql.Int, Number(payload.especieId));
  request.input('breedId', sql.Int, payload.razaId ? Number(payload.razaId) : null);
  const result = await request.query(`
    SELECT TOP 1 ClienteId FROM dbo.Clientes WHERE ClienteId=@clientId AND Activo=1;
    SELECT TOP 1 EspecieId FROM dbo.Especies WHERE EspecieId=@speciesId AND Activo=1;
    SELECT TOP 1 RazaId, EspecieId FROM dbo.Razas WHERE RazaId=@breedId AND Activo=1;`);
  if (!result.recordsets[0][0]) throw makeBusinessError('INVALID_CLIENT', 'El cliente seleccionado no existe o esta inactivo.');
  if (!result.recordsets[1][0]) throw makeBusinessError('INVALID_SPECIES', 'La especie seleccionada no existe o esta inactiva.');
  const breed = result.recordsets[2][0];
  if (payload.razaId && !breed) throw makeBusinessError('INVALID_BREED', 'La raza seleccionada no existe o esta inactiva.');
  if (breed && Number(breed.EspecieId) !== Number(payload.especieId)) {
    throw makeBusinessError('INVALID_SPECIES_BREED', 'La raza seleccionada no pertenece a la especie indicada.');
  }
};

const validateAppointmentRelationsWith = async (executor, payload) => {
  const request = executor.request();
  request.input('clientId', sql.Int, Number(payload.clienteId));
  request.input('petId', sql.Int, Number(payload.mascotaId));
  request.input('riskId', sql.Int, Number(payload.nivelRiesgoId));
  const result = await request.query(`
    SELECT TOP 1 MascotaId FROM dbo.Mascotas
      WHERE MascotaId=@petId AND ClienteId=@clientId AND Activo=1;
    SELECT TOP 1 NivelRiesgoId FROM dbo.NivelesRiesgo
      WHERE NivelRiesgoId=@riskId AND Activo=1;`);
  if (!result.recordsets[0][0]) throw makeBusinessError('INVALID_CLIENT_PET', 'La mascota seleccionada no pertenece al cliente indicado.');
  if (!result.recordsets[1][0]) throw makeBusinessError('INVALID_RISK_LEVEL', 'El nivel de riesgo seleccionado no existe o esta inactivo.');
};

const validateAppointmentScheduleWith = async (executor, { fecha, hora }) => {
  const isoDate = dateOnly(fecha);
  const now = clinicClock();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const parsedDate = new Date(`${isoDate}T12:00:00Z`);
  const dayName = dayNames[parsedDate.getUTCDay()];
  const request = executor.request();
  request.input('date', sql.Date, isoDate);
  request.input('time', sql.VarChar(5), hora);
  request.input('today', sql.Date, now.date);
  request.input('currentTime', sql.VarChar(5), now.time);
  request.input('dayName', sql.NVarChar(20), dayName);
  const result = await request.query(`
    SELECT CASE
      WHEN @date < @today THEN 1
      WHEN @date = @today AND CONVERT(time(0), @time) <= CONVERT(time(0), @currentTime) THEN 1
      ELSE 0 END AS EsPasada;
    SELECT TOP 1 HorarioClinicaId FROM dbo.HorariosClinica
      WHERE DiaSemana=@dayName AND Activo=1
        AND CONVERT(time(0), @time) >= HoraInicio
        AND CONVERT(time(0), @time) < HoraFin;`);
  if (Boolean(result.recordsets[0][0].EsPasada)) {
    throw makeBusinessError('APPOINTMENT_IN_PAST', 'La cita debe programarse en una fecha y hora futuras.');
  }
  if (!result.recordsets[1][0]) {
    throw makeBusinessError('APPOINTMENT_OUTSIDE_SCHEDULE', 'La fecha y hora estan fuera del horario activo de la clinica.');
  }
};

const validateClinicalRelationsWith = async (executor, payload) => {
  const request = executor.request();
  request.input('petId', sql.Int, Number(payload.mascotaId));
  request.input('clientId', sql.Int, Number(payload.clienteId));
  request.input('appointmentId', sql.Int, payload.citaId ? Number(payload.citaId) : null);
  const result = await request.query(`
    SELECT TOP 1 MascotaId FROM dbo.Mascotas
      WHERE MascotaId=@petId AND ClienteId=@clientId AND Activo=1;
    SELECT TOP 1 CitaId FROM dbo.Citas
      WHERE CitaId=@appointmentId AND MascotaId=@petId AND ClienteId=@clientId AND Activo=1;`);
  if (!result.recordsets[0][0]) throw makeBusinessError('INVALID_CLIENT_PET', 'La mascota no pertenece al cliente indicado.');
  if (payload.citaId && !result.recordsets[1][0]) {
    throw makeBusinessError('INVALID_APPOINTMENT_RELATION', 'La cita no corresponde al cliente y mascota del historial.');
  }
};

const validatePetExistsWith = async (executor, petId) => {
  const request = executor.request();
  request.input('petId', sql.Int, Number(petId));
  const result = await request.query('SELECT TOP 1 MascotaId FROM dbo.Mascotas WHERE MascotaId=@petId AND Activo=1');
  if (!result.recordset[0]) throw makeBusinessError('INVALID_PET', 'La mascota seleccionada no existe o esta inactiva.');
};

const validateDomainPayloadWith = async (executor, collection, payload) => {
  if (collection === 'pets') return validatePetRelationsWith(executor, payload);
  if (collection === 'clinicalRecords') return validateClinicalRelationsWith(executor, payload);
  if (collection === 'treatments' || collection === 'vaccines') return validatePetExistsWith(executor, payload.mascotaId);
  if (collection === 'breeds') {
    const request = executor.request();
    request.input('speciesId', sql.Int, Number(payload.especieId));
    const result = await request.query('SELECT TOP 1 EspecieId FROM dbo.Especies WHERE EspecieId=@speciesId AND Activo=1');
    if (!result.recordset[0]) throw makeBusinessError('INVALID_SPECIES', 'La especie seleccionada no existe o esta inactiva.');
  }
  return null;
};

const repository = {
  async ping() {
    const pool = await getPool();
    const result = await pool.request().query('SELECT DB_NAME() AS databaseName, SUSER_SNAME() AS databaseUser');
    return result.recordset[0];
  },

  async list(collection, filters = {}) {
    const pool = await getPool();
    if (collection === 'pets') return listPetsDetailedWith(pool, { ...filters.equals, search: filters.search });
    if (collection === 'appointments') return listAppointmentsDetailedWith(pool, { ...filters.equals, search: filters.search });
    return listWith(pool, collection, filters);
  },

  async findById(collection, id) {
    const pool = await getPool();
    if (collection === 'appointments') return getAppointmentDetailedWith(pool, id);
    if (collection === 'pets') {
      const records = await listPetsDetailedWith(pool);
      return records.find((record) => record.id === Number(id)) || null;
    }
    return findByIdWith(pool, collection, id);
  },

  async insert(collection, payload) {
    return withTransaction(async (transaction) => {
      await validateDomainPayloadWith(transaction, collection, payload);
      return insertWith(transaction, collection, payload);
    });
  },

  async update(collection, id, payload) {
    return withTransaction(async (transaction) => {
      const current = await findByIdWith(transaction, collection, id);
      if (!current) return null;
      const next = { ...current, ...payload };
      await validateDomainPayloadWith(transaction, collection, next);
      await updateWith(transaction, collection, id, payload);
      return findByIdWith(transaction, collection, id, { includeInactive: true });
    });
  },

  async findPetByPhotoUrl(photoUrl) {
    const request = (await getPool()).request();
    request.input('photoUrl', sql.NVarChar(500), photoUrl);
    const result = await request.query('SELECT TOP 1 MascotaId, ClienteId FROM dbo.Mascotas WHERE FotoUrl=@photoUrl AND Activo=1');
    return result.recordset[0] || null;
  },

  async softDelete(collection, id) {
    const current = await this.findById(collection, id);
    if (!current) return null;
    const dependencies = {
      clients: { table: 'Mascotas', column: 'ClienteId', message: 'El cliente tiene mascotas activas. Desactive o reasigne sus mascotas primero.' },
      species: { table: 'Razas', column: 'EspecieId', message: 'La especie tiene razas activas. Desactive sus razas primero.' },
      breeds: { table: 'Mascotas', column: 'RazaId', message: 'La raza esta asignada a mascotas activas.' },
    };
    await withTransaction(async (transaction) => {
      const dependency = dependencies[collection];
      if (dependency) {
        const request = transaction.request();
        request.input('id', sql.Int, Number(id));
        const result = await request.query(`SELECT TOP 1 1 AS EnUso FROM dbo.[${dependency.table}] WHERE [${dependency.column}]=@id AND Activo=1`);
        if (result.recordset[0]) throw makeBusinessError('RECORD_IN_USE', dependency.message);
      }
      if (collection === 'species') {
        const request = transaction.request();
        request.input('id', sql.Int, Number(id));
        const result = await request.query('SELECT TOP 1 1 AS EnUso FROM dbo.Mascotas WHERE EspecieId=@id AND Activo=1');
        if (result.recordset[0]) throw makeBusinessError('RECORD_IN_USE', 'La especie esta asignada a mascotas activas.');
      }
      if (collection === 'pets') {
        const request = transaction.request();
        request.input('id', sql.Int, Number(id));
        const result = await request.query(`SELECT TOP 1 1 AS EnUso FROM dbo.Citas WHERE MascotaId=@id AND Activo=1
          AND Estado NOT IN ('Cancelada','No asistio','Atendida','Finalizada')`);
        if (result.recordset[0]) throw makeBusinessError('RECORD_IN_USE', 'La mascota tiene citas pendientes o en curso.');
      }
      await updateWith(transaction, collection, id, { activo: false });
    });
    return { ...current, activo: false };
  },

  async findUserByIdentifier(identifier) {
    return findUserByIdentifierWith(await getPool(), identifier);
  },

  async getUser(id) {
    const user = await getUserWith(await getPool(), id);
    return user?.activo ? user : null;
  },

  async listUsers() {
    return listUsersWith(await getPool());
  },

  async createUser(payload) {
    const usuario = payload.usuario.trim();
    const email = payload.email.trim().toLowerCase();
    const initialDuplicates = await accountDuplicatesWith(await getPool(), { usuario, email });
    if (initialDuplicates.usuario || initialDuplicates.email) throw duplicateAccountError(initialDuplicates);
    const passwordHash = await bcrypt.hash(payload.password, 12);
    try {
      return await withTransaction(async (transaction) => {
        const duplicates = await accountDuplicatesWith(transaction, { usuario, email });
        if (duplicates.usuario || duplicates.email) throw duplicateAccountError(duplicates);

        const roleRequest = transaction.request();
        roleRequest.input('roleId', sql.Int, Number(payload.roleId));
        const roleResult = await roleRequest.query('SELECT Nombre FROM dbo.Roles WHERE RolId = @roleId AND Activo = 1');
        if (!roleResult.recordset[0]) throw makeBusinessError('INVALID_ROLE', 'El rol seleccionado no existe.');

        const request = transaction.request();
        request.input('roleId', sql.Int, Number(payload.roleId));
        request.input('nombre', sql.NVarChar(140), payload.nombre);
        request.input('usuario', sql.NVarChar(80), usuario);
        request.input('email', sql.NVarChar(160), email);
        request.input('passwordHash', sql.NVarChar(255), passwordHash);
        request.input('rol', sql.NVarChar(80), roleResult.recordset[0].Nombre);
        request.input('activo', sql.Bit, payload.activo ?? true);
        const result = await request.query(`
          INSERT INTO dbo.Usuarios (RolId, Nombre, Usuario, Email, PasswordHash, Clave, Rol, Activo, Estado)
          VALUES (@roleId, @nombre, @usuario, @email, @passwordHash, @passwordHash, @rol, @activo, @activo);
          SELECT UsuarioId FROM dbo.Usuarios WHERE IdUsuario = SCOPE_IDENTITY();`);
        return getUserWith(transaction, result.recordset[0].UsuarioId);
      });
    } catch (error) {
      if ([2601, 2627].includes(error.number)) throw duplicateAccountError();
      throw error;
    }
  },

  async createClientPortal(payload) {
    const usuario = payload.usuario.trim();
    const email = payload.email.trim().toLowerCase();
    const initialDuplicates = await accountDuplicatesWith(await getPool(), { usuario, email });
    if (initialDuplicates.usuario || initialDuplicates.email) throw duplicateAccountError(initialDuplicates);
    const passwordHash = await bcrypt.hash(payload.password, 12);
    try {
      return await withTransaction(async (transaction) => {
        const duplicates = await accountDuplicatesWith(transaction, { usuario, email });
        if (duplicates.usuario || duplicates.email) throw duplicateAccountError(duplicates);

        const roleResult = await transaction.request().query("SELECT TOP 1 RolId, Nombre FROM dbo.Roles WHERE Nombre = 'Cliente' AND Activo = 1");
        if (!roleResult.recordset[0]) throw makeBusinessError('INVALID_ROLE', 'No existe el rol Cliente en SQL Server.');

        const client = await insertWith(transaction, 'clients', {
          nombre: payload.nombre, telefono: payload.telefono, dpi: payload.dpi || null,
          correo: email, direccion: payload.direccion || null,
        });
        const request = transaction.request();
        request.input('roleId', sql.Int, Number(roleResult.recordset[0].RolId));
        request.input('clientId', sql.Int, client.id);
        request.input('nombre', sql.NVarChar(140), payload.nombre);
        request.input('usuario', sql.NVarChar(80), usuario);
        request.input('email', sql.NVarChar(160), email);
        request.input('passwordHash', sql.NVarChar(255), passwordHash);
        const result = await request.query(`
          INSERT INTO dbo.Usuarios (RolId, ClienteId, Nombre, Usuario, Email, PasswordHash, Clave, Rol)
          VALUES (@roleId, @clientId, @nombre, @usuario, @email, @passwordHash, @passwordHash, 'Cliente');
          SELECT UsuarioId FROM dbo.Usuarios WHERE IdUsuario = SCOPE_IDENTITY();`);
        return { user: await getUserWith(transaction, result.recordset[0].UsuarioId), client };
      });
    } catch (error) {
      if ([2601, 2627].includes(error.number)) throw duplicateAccountError();
      throw error;
    }
  },

  async updateUser(id, payload) {
    const normalized = {
      ...payload,
      usuario: payload.usuario?.trim(),
      email: payload.email?.trim().toLowerCase(),
    };
    const passwordHash = payload.password ? await bcrypt.hash(payload.password, 12) : null;
    try {
      return await withTransaction(async (transaction) => {
        const current = await getUserWith(transaction, id);
        if (!current) return null;
        if (normalized.usuario || normalized.email) {
          const duplicates = await accountDuplicatesWith(transaction, {
            usuario: normalized.usuario || current.usuario,
            email: normalized.email || current.email,
            excludeUserId: id,
          });
          if (duplicates.usuario || duplicates.email) throw duplicateAccountError(duplicates);
        }

        const updates = [];
        const request = transaction.request();
        request.input('id', sql.Int, Number(id));
        const fields = { nombre: ['Nombre', sql.NVarChar(140)], usuario: ['Usuario', sql.NVarChar(80)], email: ['Email', sql.NVarChar(160)], activo: ['Activo', sql.Bit] };
        Object.entries(fields).forEach(([field, [column, sqlType]]) => {
          if (!Object.prototype.hasOwnProperty.call(payload, field)) return;
          request.input(field, sqlType, normalized[field]);
          updates.push(`[${column}] = @${field}`);
          if (field === 'activo') updates.push('[Estado] = @activo');
        });
        if (payload.roleId) {
          const roleRequest = transaction.request();
          roleRequest.input('roleId', sql.Int, Number(payload.roleId));
          const roleResult = await roleRequest.query('SELECT TOP 1 Nombre FROM dbo.Roles WHERE RolId=@roleId AND Activo=1');
          if (!roleResult.recordset[0]) throw makeBusinessError('INVALID_ROLE', 'El rol seleccionado no existe o esta inactivo.');
          request.input('roleId', sql.Int, Number(payload.roleId));
          request.input('roleName', sql.NVarChar(80), roleResult.recordset[0].Nombre);
          updates.push('[RolId] = @roleId', '[Rol] = @roleName');
        }
        if (passwordHash) {
          request.input('passwordHash', sql.NVarChar(255), passwordHash);
          updates.push(
            '[PasswordHash] = @passwordHash', '[Clave] = @passwordHash',
            '[VersionToken] = [VersionToken] + 1', '[IntentosFallidos] = 0',
            '[BloqueadoHasta] = NULL', '[BloqueosAcumulados] = 0',
          );
        }
        if (!updates.length) return current;
        updates.push('[ActualizadoEn] = SYSUTCDATETIME()');
        await request.query(`UPDATE dbo.Usuarios SET ${updates.join(', ')} WHERE UsuarioId = @id`);
        return getUserWith(transaction, id);
      });
    } catch (error) {
      if ([2601, 2627].includes(error.number)) throw duplicateAccountError();
      throw error;
    }
  },

  async setUserSecurity(id, patch) {
    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, Number(id));
    const updates = [];
    if (Object.prototype.hasOwnProperty.call(patch, 'failedAttempts')) {
      request.input('failedAttempts', sql.Int, Number(patch.failedAttempts));
      updates.push('IntentosFallidos = @failedAttempts');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'lockedUntil')) {
      request.input('lockedUntil', sql.DateTime2, patch.lockedUntil ? new Date(patch.lockedUntil) : null);
      updates.push('BloqueadoHasta = @lockedUntil');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'lockCount')) {
      request.input('lockCount', sql.Int, Number(patch.lockCount));
      updates.push('BloqueosAcumulados = @lockCount');
    }
    if (patch.ultimoAcceso) updates.push('UltimoAcceso = SYSUTCDATETIME()');
    if (updates.length) await request.query(`UPDATE dbo.Usuarios SET ${updates.join(', ')}, ActualizadoEn = SYSUTCDATETIME() WHERE UsuarioId = @id`);
    return getUserWith(pool, id, true);
  },

  async createPasswordResetToken({ userId, tokenHash, portal, expiresAt, ip }) {
    return withTransaction(async (transaction) => {
      const recentRequest = transaction.request();
      recentRequest.input('userId', sql.Int, Number(userId));
      const recentResult = await recentRequest.query(`
        SELECT TOP 1 CreadoEn
        FROM dbo.PasswordResetTokens WITH (UPDLOCK, HOLDLOCK)
        WHERE UsuarioId = @userId
        ORDER BY CreadoEn DESC`);
      const lastCreatedAt = recentResult.recordset[0]?.CreadoEn;
      if (lastCreatedAt && new Date(lastCreatedAt).getTime() > Date.now() - (2 * 60 * 1000)) {
        return { created: false, reason: 'RATE_LIMITED' };
      }

      const invalidate = transaction.request();
      invalidate.input('userId', sql.Int, Number(userId));
      await invalidate.query(`
        UPDATE dbo.PasswordResetTokens
        SET UsadoEn = SYSUTCDATETIME()
        WHERE UsuarioId = @userId AND UsadoEn IS NULL`);

      const request = transaction.request();
      request.input('userId', sql.Int, Number(userId));
      request.input('tokenHash', sql.Char(64), tokenHash);
      request.input('portal', sql.NVarChar(20), portal);
      request.input('expiresAt', sql.DateTime2, new Date(expiresAt));
      request.input('ip', sql.NVarChar(80), ip || null);
      await request.query(`
        INSERT INTO dbo.PasswordResetTokens
          (UsuarioId, TokenHash, Portal, ExpiraEn, SolicitadoDesdeIp)
        VALUES (@userId, @tokenHash, @portal, @expiresAt, @ip)`);
      return { created: true };
    });
  },

  async consumePasswordResetToken({ tokenHash, password }) {
    const pool = await getPool();
    const precheck = pool.request();
    precheck.input('tokenHash', sql.Char(64), tokenHash);
    const precheckResult = await precheck.query(`
      SELECT TOP 1 PasswordResetTokenId
      FROM dbo.PasswordResetTokens
      WHERE TokenHash = @tokenHash
        AND UsadoEn IS NULL
        AND ExpiraEn > SYSUTCDATETIME()`);
    if (!precheckResult.recordset[0]) return null;

    const passwordHash = await bcrypt.hash(password, 12);
    return withTransaction(async (transaction) => {
      const request = transaction.request();
      request.input('tokenHash', sql.Char(64), tokenHash);
      const result = await request.query(`
        SELECT TOP 1 t.PasswordResetTokenId, t.UsuarioId, t.Portal
        FROM dbo.PasswordResetTokens t WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.Usuarios u WITH (UPDLOCK, HOLDLOCK) ON u.UsuarioId = t.UsuarioId
        WHERE t.TokenHash = @tokenHash
          AND t.UsadoEn IS NULL
          AND t.ExpiraEn > SYSUTCDATETIME()
          AND u.Activo = 1`);
      const token = result.recordset[0];
      if (!token) return null;

      const updateUserRequest = transaction.request();
      updateUserRequest.input('userId', sql.Int, Number(token.UsuarioId));
      updateUserRequest.input('passwordHash', sql.NVarChar(255), passwordHash);
      await updateUserRequest.query(`
        UPDATE dbo.Usuarios
        SET PasswordHash = @passwordHash,
            Clave = @passwordHash,
            IntentosFallidos = 0,
            BloqueadoHasta = NULL,
            BloqueosAcumulados = 0,
            VersionToken = VersionToken + 1,
            ActualizadoEn = SYSUTCDATETIME()
        WHERE UsuarioId = @userId`);

      const consumeRequest = transaction.request();
      consumeRequest.input('userId', sql.Int, Number(token.UsuarioId));
      await consumeRequest.query(`
        UPDATE dbo.PasswordResetTokens
        SET UsadoEn = SYSUTCDATETIME()
        WHERE UsuarioId = @userId AND UsadoEn IS NULL`);

      return {
        user: await getUserWith(transaction, token.UsuarioId),
        portal: token.Portal,
      };
    });
  },

  async addAudit(usuarioId, accion, detalle, ip, tabla = null, registroId = null) {
    const pool = await getPool();
    const request = pool.request();
    request.input('usuarioId', sql.Int, usuarioId ? Number(usuarioId) : null);
    request.input('accion', sql.NVarChar(120), accion);
    request.input('tabla', sql.NVarChar(120), tabla);
    request.input('registroId', sql.NVarChar(80), registroId ? String(registroId) : null);
    request.input('detalle', sql.NVarChar(1000), detalle || null);
    request.input('ip', sql.NVarChar(80), ip || null);
    await request.query('INSERT INTO dbo.Auditoria (UsuarioId, Accion, Tabla, RegistroId, Detalle, Ip) VALUES (@usuarioId, @accion, @tabla, @registroId, @detalle, @ip)');
  },

  async validateAppointmentAvailability({ fecha, hora, appointmentId = null }, executor = null) {
    const target = executor || await getPool();
    const request = target.request();
    request.input('fecha', sql.Date, fecha);
    request.input('hora', sql.VarChar(5), hora);
    request.input('id', sql.Int, appointmentId ? Number(appointmentId) : null);
    const result = await request.query(`
      SELECT TOP 1 CitaId FROM dbo.Citas WITH (UPDLOCK, HOLDLOCK)
      WHERE Fecha = @fecha AND Hora = @hora AND Activo = 1
        AND Estado NOT IN ('Cancelada', 'No asistio') AND (@id IS NULL OR CitaId <> @id)`);
    return { disponible: !result.recordset[0], conflicto: result.recordset[0] || null };
  },

  async createAppointment(payload) {
    return withTransaction(async (transaction) => {
      await validateAppointmentRelationsWith(transaction, payload);
      await validateAppointmentScheduleWith(transaction, payload);
      const availability = await this.validateAppointmentAvailability(payload, transaction);
      if (!availability.disponible) throw makeBusinessError('APPOINTMENT_CONFLICT', 'Ya existe una cita registrada en la misma fecha y hora.', availability.conflicto);
      const appointment = await insertWith(transaction, 'appointments', payload);
      return getAppointmentDetailedWith(transaction, appointment.id);
    });
  },

  async updateAppointment(id, payload) {
    return withTransaction(async (transaction) => {
      const current = await findByIdWith(transaction, 'appointments', id);
      if (!current) return null;
      const next = { ...current, ...payload };
      await validateAppointmentRelationsWith(transaction, next);
      await validateAppointmentScheduleWith(transaction, next);
      const availability = await this.validateAppointmentAvailability({
        fecha: payload.fecha || current.fecha,
        hora: payload.hora || current.hora,
        appointmentId: id,
      }, transaction);
      if (!availability.disponible) throw makeBusinessError('APPOINTMENT_CONFLICT', 'Ya existe una cita registrada en la misma fecha y hora.', availability.conflicto);
      await updateWith(transaction, 'appointments', id, payload);
      return getAppointmentDetailedWith(transaction, id);
    });
  },

  async createInventoryMovement(payload) {
    return withTransaction(async (transaction) => {
      const request = transaction.request();
      request.input('productId', sql.Int, Number(payload.productoId));
      const result = await request.query('SELECT TOP 1 Stock FROM dbo.Productos WITH (UPDLOCK, HOLDLOCK) WHERE ProductoId = @productId AND Activo = 1');
      if (!result.recordset[0]) throw makeBusinessError('PRODUCT_NOT_FOUND', 'Producto no encontrado.');
      const stock = Number(result.recordset[0].Stock);
      const quantity = Number(payload.cantidad);
      const nextStock = payload.tipo === 'Entrada' ? stock + quantity : payload.tipo === 'Salida' ? stock - quantity : quantity;
      if (nextStock < 0) throw makeBusinessError('INSUFFICIENT_STOCK', 'Stock insuficiente para registrar la salida.');
      const updateRequest = transaction.request();
      updateRequest.input('productId', sql.Int, Number(payload.productoId));
      updateRequest.input('stock', sql.Decimal(18, 2), nextStock);
      await updateRequest.query('UPDATE dbo.Productos SET Stock = @stock, ActualizadoEn = SYSUTCDATETIME() WHERE ProductoId = @productId');
      return insertWith(transaction, 'inventoryMovements', {
        productoId: payload.productoId, usuarioId: payload.usuarioId, tipo: payload.tipo,
        cantidad: payload.cantidad, motivo: payload.motivo,
      });
    });
  },

  async createSale(payload) {
    return withTransaction(async (transaction) => {
      const partiesRequest = transaction.request();
      partiesRequest.input('clientId', sql.Int, Number(payload.clienteId));
      partiesRequest.input('userId', sql.Int, Number(payload.usuarioId));
      const parties = await partiesRequest.query(`
        SELECT TOP 1 ClienteId FROM dbo.Clientes WHERE ClienteId=@clientId AND Activo=1;
        SELECT TOP 1 UsuarioId FROM dbo.Usuarios WHERE UsuarioId=@userId AND Activo=1;`);
      if (!parties.recordsets[0][0]) throw makeBusinessError('INVALID_CLIENT', 'El cliente seleccionado no existe o esta inactivo.');
      if (!parties.recordsets[1][0]) throw makeBusinessError('INVALID_USER', 'El usuario que registra la venta no existe o esta inactivo.');
      const details = [];
      for (const item of payload.detalles) {
        const isProduct = item.tipo === 'Producto';
        const request = transaction.request();
        request.input('id', sql.Int, Number(item.referenciaId));
        const result = await request.query(`SELECT TOP 1 ${isProduct ? 'ProductoId' : 'ServicioId'} AS Id, Nombre, Precio${isProduct ? ', Stock, FechaVencimiento' : ''} FROM dbo.${isProduct ? 'Productos' : 'Servicios'} WITH (${isProduct ? 'UPDLOCK, HOLDLOCK' : 'HOLDLOCK'}) WHERE ${isProduct ? 'ProductoId' : 'ServicioId'} = @id AND Activo = 1`);
        const source = result.recordset[0];
        if (!source) throw makeBusinessError('INVALID_SALE_ITEM', `No existe el item seleccionado: ${item.tipo} ${item.referenciaId}`);
        const quantity = Number(item.cantidad);
        if (isProduct && source.FechaVencimiento && dateOnly(source.FechaVencimiento) < clinicClock().date) {
          throw makeBusinessError('EXPIRED_SALE_ITEM', `El producto ${source.Nombre} esta vencido y no puede venderse.`);
        }
        if (isProduct && Number(source.Stock) < quantity) throw makeBusinessError('INSUFFICIENT_STOCK', `Stock insuficiente para ${source.Nombre}`);
        const unitPrice = Number(source.Precio);
        details.push({ ...item, cantidad: quantity, precioUnitario: unitPrice, descripcion: source.Nombre, total: Number((quantity * unitPrice).toFixed(2)) });
      }
      const subtotal = Number(details.reduce((sum, item) => sum + item.total, 0).toFixed(2));
      const iva = Number((subtotal * 0.12).toFixed(2));
      const total = Number((subtotal + iva).toFixed(2));
      const saleRequest = transaction.request();
      saleRequest.input('clienteId', sql.Int, Number(payload.clienteId));
      saleRequest.input('usuarioId', sql.Int, Number(payload.usuarioId));
      saleRequest.input('metodoPago', sql.NVarChar(40), payload.metodoPago);
      saleRequest.input('subtotal', sql.Decimal(18, 2), subtotal);
      saleRequest.input('iva', sql.Decimal(18, 2), iva);
      saleRequest.input('total', sql.Decimal(18, 2), total);
      const saleResult = await saleRequest.query(`
        INSERT INTO dbo.Ventas (ClienteId, UsuarioId, MetodoPago, Subtotal, IVA, Total)
        VALUES (@clienteId, @usuarioId, @metodoPago, @subtotal, @iva, @total);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
      const saleId = saleResult.recordset[0].id;
      for (const detail of details) {
        const detailRequest = transaction.request();
        detailRequest.input('saleId', sql.Int, saleId);
        detailRequest.input('type', sql.NVarChar(30), detail.tipo);
        detailRequest.input('productId', sql.Int, detail.tipo === 'Producto' ? Number(detail.referenciaId) : null);
        detailRequest.input('serviceId', sql.Int, detail.tipo === 'Servicio' ? Number(detail.referenciaId) : null);
        detailRequest.input('description', sql.NVarChar(200), detail.descripcion);
        detailRequest.input('quantity', sql.Decimal(18, 2), detail.cantidad);
        detailRequest.input('unitPrice', sql.Decimal(18, 2), detail.precioUnitario);
        detailRequest.input('detailTotal', sql.Decimal(18, 2), detail.total);
        await detailRequest.query(`
          INSERT INTO dbo.VentaDetalle (VentaId, TipoItem, ProductoId, ServicioId, Descripcion, Cantidad, PrecioUnitario, Total)
          VALUES (@saleId, @type, @productId, @serviceId, @description, @quantity, @unitPrice, @detailTotal)`);
        if (detail.tipo === 'Producto') {
          const stockRequest = transaction.request();
          stockRequest.input('productId', sql.Int, Number(detail.referenciaId));
          stockRequest.input('quantity', sql.Decimal(18, 2), detail.cantidad);
          stockRequest.input('usuarioId', sql.Int, Number(payload.usuarioId));
          stockRequest.input('reason', sql.NVarChar(250), `Venta #${saleId}`);
          await stockRequest.query(`
            UPDATE dbo.Productos SET Stock = Stock - @quantity, ActualizadoEn = SYSUTCDATETIME() WHERE ProductoId = @productId;
            INSERT INTO dbo.InventarioMovimientos (ProductoId, UsuarioId, Tipo, Cantidad, Motivo) VALUES (@productId, @usuarioId, 'Salida', @quantity, @reason);`);
        }
      }
      const payment = transaction.request();
      payment.input('saleId', sql.Int, saleId);
      payment.input('method', sql.NVarChar(40), payload.metodoPago);
      payment.input('total', sql.Decimal(18, 2), total);
      await payment.query('INSERT INTO dbo.Pagos (VentaId, MetodoPago, Monto) VALUES (@saleId, @method, @total)');
      return getSaleWith(transaction, saleId);
    });
  },

  async updateConfig(payload) {
    const pool = await getPool();
    const current = await getConfigWith(pool);
    if (!current) throw new Error('No existe configuracion de empresa.');
    const request = pool.request();
    request.input('id', sql.Int, current.id);
    request.input('name', sql.NVarChar(160), payload.nombreClinica);
    request.input('address', sql.NVarChar(250), payload.direccion);
    request.input('phone', sql.NVarChar(50), payload.telefono);
    request.input('petShopPhone', sql.NVarChar(50), payload.telefonoPetShop);
    request.input('contactEmail', sql.NVarChar(160), payload.correoContacto);
    request.input('facebookUrl', sql.NVarChar(500), payload.facebookUrl || '');
    request.input('nit', sql.NVarChar(50), payload.nit);
    request.input('logo', sql.NVarChar(500), payload.logoUrl || null);
    request.input('schedule', sql.NVarChar(200), payload.horario);
    request.input('reminders', sql.Bit, payload.recordatoriosActivos);
    await request.query(`UPDATE dbo.ConfiguracionEmpresa SET NombreClinica=@name, Direccion=@address, Telefono=@phone,
      TelefonoPetShop=@petShopPhone, CorreoContacto=@contactEmail, FacebookUrl=@facebookUrl,
      NIT=@nit, LogoUrl=@logo, Horario=@schedule, RecordatoriosActivos=@reminders,
      ActualizadoEn=SYSUTCDATETIME() WHERE ConfiguracionEmpresaId=@id`);
    return getConfigWith(pool);
  },

  async updateRiskLevels(levels) {
    return withTransaction(async (transaction) => {
      const ids = levels.map((level) => Number(level.id));
      const existing = await getRiskLevelsWith(transaction);
      if (ids.some((id) => !existing.some((level) => Number(level.id) === id))) {
        throw makeBusinessError('INVALID_RISK_LEVEL', 'Se intento actualizar un nivel de riesgo inexistente.');
      }
      for (const level of levels) {
        const request = transaction.request();
        request.input('id', sql.Int, Number(level.id));
        request.input('name', sql.NVarChar(40), level.nombre);
        request.input('priority', sql.Int, Number(level.prioridad));
        request.input('description', sql.NVarChar(250), level.descripcion || null);
        request.input('wait', sql.NVarChar(120), level.tiempoAtencion || null);
        request.input('keywords', sql.NVarChar(1200), level.keywords.join(', '));
        request.input('color', sql.NVarChar(20), level.color);
        request.input('active', sql.Bit, level.activo ?? true);
        const updateResult = await request.query('UPDATE dbo.NivelesRiesgo SET Nombre=@name, Prioridad=@priority, Descripcion=@description, TiempoAtencion=@wait, PalabrasClave=@keywords, ColorHex=@color, Activo=@active WHERE NivelRiesgoId=@id');
        if (updateResult.rowsAffected[0] !== 1) throw makeBusinessError('INVALID_RISK_LEVEL', 'No fue posible actualizar uno de los niveles de riesgo.');
      }
      return getRiskLevelsWith(transaction);
    });
  },

  async getRiskLevels() { return getRiskLevelsWith(await getPool()); },
  async getConfig() { return getConfigWith(await getPool()); },

  async getClientForUser(userId) {
    const pool = await getPool();
    const request = pool.request();
    request.input('userId', sql.Int, Number(userId));
    const result = await request.query('SELECT c.* FROM dbo.Usuarios u INNER JOIN dbo.Clientes c ON c.ClienteId=u.ClienteId WHERE u.UsuarioId=@userId AND u.Activo=1 AND c.Activo=1');
    return mapRow(collections.clients, result.recordset[0]);
  },

  async updateClientPortalProfile(userId, payload) {
    const email = payload.correo.trim().toLowerCase();
    try {
      return await withTransaction(async (transaction) => {
        const ownerRequest = transaction.request();
        ownerRequest.input('userId', sql.Int, Number(userId));
        const owner = await ownerRequest.query(`
          SELECT TOP 1 u.UsuarioId, u.ClienteId, u.Usuario
          FROM dbo.Usuarios u
          INNER JOIN dbo.Clientes c ON c.ClienteId = u.ClienteId
          WHERE u.UsuarioId = @userId AND u.Activo = 1 AND c.Activo = 1`);
        const account = owner.recordset[0];
        if (!account) return null;

        const duplicates = await accountDuplicatesWith(transaction, {
          usuario: account.Usuario, email, excludeUserId: userId,
        });
        if (duplicates.email) throw duplicateAccountError(duplicates);

        const client = await updateWith(transaction, 'clients', account.ClienteId, {
          nombre: payload.nombre,
          telefono: payload.telefono,
          correo: email,
          direccion: payload.direccion || null,
        });
        const userRequest = transaction.request();
        userRequest.input('userId', sql.Int, Number(userId));
        userRequest.input('nombre', sql.NVarChar(140), payload.nombre);
        userRequest.input('email', sql.NVarChar(160), email);
        await userRequest.query(`
          UPDATE dbo.Usuarios SET Nombre = @nombre, Email = @email,
            ActualizadoEn = SYSUTCDATETIME()
          WHERE UsuarioId = @userId`);
        return client;
      });
    } catch (error) {
      if ([2601, 2627].includes(error.number)) throw duplicateAccountError({ email: true });
      throw error;
    }
  },

  async listClientPets(clienteId) { return listPetsDetailedWith(await getPool(), { clienteId }); },
  async listClientAppointments(clienteId) { return listAppointmentsDetailedWith(await getPool(), { clienteId }); },
  async createClientPet(clienteId, payload) {
    const pet = await this.insert('pets', { ...payload, clienteId: Number(clienteId) });
    const pool = await getPool();
    return (await listPetsDetailedWith(pool, { clienteId })).find((item) => item.id === pet.id) || pet;
  },

  async createClientAppointment(clienteId, userId, payload) {
    return withTransaction(async (transaction) => {
      const petRequest = transaction.request();
      petRequest.input('petId', sql.Int, Number(payload.mascotaId));
      petRequest.input('clientId', sql.Int, Number(clienteId));
      const petResult = await petRequest.query('SELECT TOP 1 MascotaId FROM dbo.Mascotas WITH (HOLDLOCK) WHERE MascotaId=@petId AND ClienteId=@clientId AND Activo=1');
      if (!petResult.recordset[0]) throw makeBusinessError('INVALID_CLIENT_PET', 'La mascota seleccionada no pertenece al cliente autenticado.');
      const appointmentPayload = { ...payload, clienteId: Number(clienteId), usuarioRegistroId: Number(userId), estado: 'Pendiente' };
      await validateAppointmentRelationsWith(transaction, appointmentPayload);
      await validateAppointmentScheduleWith(transaction, appointmentPayload);
      const availability = await this.validateAppointmentAvailability(appointmentPayload, transaction);
      if (!availability.disponible) throw makeBusinessError('APPOINTMENT_CONFLICT', 'Ya existe una cita registrada en la misma fecha y hora.', availability.conflicto);
      const appointment = await insertWith(transaction, 'appointments', appointmentPayload);
      return getAppointmentDetailedWith(transaction, appointment.id);
    });
  },

  async dashboard() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SET NOCOUNT ON;
      SELECT
        (SELECT COUNT(*) FROM dbo.Usuarios WHERE Activo=1) usuarios,
        (SELECT COUNT(*) FROM dbo.Clientes WHERE Activo=1) clientes,
        (SELECT COUNT(*) FROM dbo.Mascotas WHERE Activo=1) mascotas,
        (SELECT COUNT(*) FROM dbo.Citas WHERE Activo=1 AND Fecha=CONVERT(date,GETDATE())) citasHoy,
        (SELECT COUNT(*) FROM dbo.Tratamientos WHERE Activo=1 AND Estado='Activo') tratamientosActivos,
        (SELECT COUNT(*) FROM dbo.Productos WHERE Activo=1)+(SELECT COUNT(*) FROM dbo.Servicios WHERE Activo=1) productosServicios,
        (SELECT COUNT(*) FROM dbo.Ventas) ventas;
      SELECT a.*,c.Nombre Cliente,m.Nombre Mascota,u.Nombre RegistradoPor,n.Nombre RiesgoNombre,n.Prioridad RiesgoPrioridad,n.Descripcion RiesgoDescripcion,n.TiempoAtencion RiesgoTiempoAtencion,n.ColorHex RiesgoColor
        FROM dbo.Citas a INNER JOIN dbo.Clientes c ON c.ClienteId=a.ClienteId INNER JOIN dbo.Mascotas m ON m.MascotaId=a.MascotaId INNER JOIN dbo.NivelesRiesgo n ON n.NivelRiesgoId=a.NivelRiesgoId LEFT JOIN dbo.Usuarios u ON u.UsuarioId=a.UsuarioRegistroId
        WHERE a.Activo=1 AND a.Fecha=CONVERT(date,GETDATE()) ORDER BY a.Hora;
      SELECT e.Nombre etiqueta,COUNT(*) cantidad FROM dbo.Mascotas m INNER JOIN dbo.Especies e ON e.EspecieId=m.EspecieId WHERE m.Activo=1 GROUP BY e.Nombre;
      SELECT Sexo etiqueta,COUNT(*) cantidad FROM dbo.Mascotas WHERE Activo=1 GROUP BY Sexo;
      SELECT Estado etiqueta,COUNT(*) cantidad FROM dbo.Citas WHERE Activo=1 GROUP BY Estado;
      SELECT Descripcion etiqueta,SUM(Cantidad) cantidad FROM dbo.VentaDetalle WHERE TipoItem='Servicio' GROUP BY Descripcion;
      SELECT CONVERT(varchar(10),Fecha,23) etiqueta,COUNT(*) cantidad FROM dbo.Citas WHERE Activo=1 GROUP BY Fecha ORDER BY Fecha;
      SELECT * FROM dbo.Productos WHERE Activo=1 AND Stock<=StockMinimo ORDER BY Stock;
      SELECT * FROM dbo.Productos WHERE Activo=1 AND FechaVencimiento BETWEEN CONVERT(date,GETDATE()) AND DATEADD(day,90,CONVERT(date,GETDATE())) ORDER BY FechaVencimiento;
      SELECT * FROM dbo.Productos WHERE Activo=1 AND FechaVencimiento < CONVERT(date,GETDATE()) ORDER BY FechaVencimiento;
      SELECT * FROM dbo.Vacunas WHERE Activo=1 AND ProximaDosis BETWEEN CONVERT(date,GETDATE()) AND DATEADD(day,60,CONVERT(date,GETDATE())) ORDER BY ProximaDosis;`);
    const asObject = (rows) => Object.fromEntries(rows.map((row) => [row.etiqueta || 'Sin dato', Number(row.cantidad)]));
    return {
      resumen: Object.fromEntries(Object.entries(result.recordsets[0][0]).map(([key, value]) => [key, Number(value)])),
      citasHoy: result.recordsets[1].map(mapAppointmentDetailed),
      graficas: {
        mascotasPorEspecie: asObject(result.recordsets[2]), mascotasPorSexo: asObject(result.recordsets[3]),
        citasPorEstado: asObject(result.recordsets[4]), serviciosSolicitados: asObject(result.recordsets[5]),
        demandaPorFecha: asObject(result.recordsets[6]),
      },
      alertas: {
        stockBajo: result.recordsets[7].map((row) => mapRow(collections.products, row)),
        productosPorVencer: result.recordsets[8].map((row) => mapRow(collections.products, row)),
        productosVencidos: result.recordsets[9].map((row) => mapRow(collections.products, row)),
        proximasVacunas: result.recordsets[10].map((row) => mapRow(collections.vaccines, row)),
      },
    };
  },

  async reports() {
    const pool = await getPool();
    const [dashboard, sales] = await Promise.all([this.dashboard(), listSalesWith(pool)]);
    const metrics = await pool.request().query(`
      SELECT
        (SELECT COUNT(DISTINCT ClienteId) FROM dbo.Citas WHERE Activo=1 AND Estado IN ('Atendida','Finalizada')) clientesAtendidos,
        (SELECT COUNT(DISTINCT MascotaId) FROM dbo.HistorialClinico WHERE Activo=1) mascotasAtendidas,
        (SELECT COUNT(*) FROM dbo.Tratamientos WHERE Activo=1) tratamientosRealizados,
        (SELECT COUNT(*) FROM dbo.Citas WHERE Activo=1 AND Estado='No asistio') inasistencias;`);
    return {
      citasPorFecha: dashboard.graficas.demandaPorFecha, citasPorEstado: dashboard.graficas.citasPorEstado,
      ...Object.fromEntries(Object.entries(metrics.recordset[0]).map(([key, value]) => [key, Number(value)])),
      serviciosMasSolicitados: dashboard.graficas.serviciosSolicitados,
      productosBajoStock: dashboard.alertas.stockBajo,
      productosPorVencer: dashboard.alertas.productosPorVencer,
      productosVencidos: dashboard.alertas.productosVencidos,
      ventas: sales,
    };
  },

  async relations() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT * FROM dbo.Roles WHERE Activo=1 ORDER BY Nombre;
      SELECT * FROM dbo.Permisos WHERE Activo=1 ORDER BY Nombre;
      SELECT * FROM dbo.HorariosClinica WHERE Activo=1 ORDER BY HorarioClinicaId;`);
    const roles = result.recordsets[0].map((row) => ({ id: Number(row.RolId), nombre: row.Nombre, descripcion: row.Descripcion || '' }));
    const permissions = result.recordsets[1].map((row) => ({ id: Number(row.PermisoId), nombre: row.Nombre, descripcion: row.Descripcion || '' }));
    const schedules = result.recordsets[2].map((row) => ({ id: Number(row.HorarioClinicaId), diaSemana: row.DiaSemana, horaInicio: timeOnly(row.HoraInicio), horaFin: timeOnly(row.HoraFin), activo: Boolean(row.Activo) }));
    const [species, breeds, riskLevels, config] = await Promise.all([
      listWith(pool, 'species'), listWith(pool, 'breeds'), getRiskLevelsWith(pool), getConfigWith(pool),
    ]);
    return { roles, permissions, species, breeds, riskLevels, schedules, config };
  },

  async getAudit() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT a.*, u.Nombre AS Usuario, r.Nombre AS Rol
      FROM dbo.Auditoria a
      LEFT JOIN dbo.Usuarios u ON u.UsuarioId = a.UsuarioId
      LEFT JOIN dbo.Roles r ON r.RolId = u.RolId
      ORDER BY a.AuditoriaId DESC`);
    return result.recordset.map((row) => ({ id: Number(row.AuditoriaId), usuarioId: numberOrNull(row.UsuarioId), usuario: row.Usuario || null, rol: row.Rol || null, accion: row.Accion, tabla: row.Tabla, registroId: row.RegistroId, detalle: row.Detalle, ip: row.Ip, creadoEn: row.CreadoEn }));
  },

};

module.exports = repository;
