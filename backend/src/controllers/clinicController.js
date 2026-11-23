const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/http');
const repository = require('../repositories/sqlRepository');
const riskService = require('../services/riskService');
const petPhotoService = require('../services/petPhotoService');
const { createTicketPdf } = require('../services/ticketPdfService');
const { createReportPdf } = require('../services/reportPdfService');
const { createAuditPdf } = require('../services/auditPdfService');

const dateOnly = (value) => {
  if (!value) return value;
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const withAudit = async (req, accion, detalle) => {
  if (req.user) {
    await repository.addAudit(req.user.id, accion, detalle, req.ip);
  }
};

const ensureRecord = (record, message = 'Registro no encontrado.') => {
  if (!record) {
    throw new ApiError(404, message);
  }
  return record;
};

const normalizePayloadDates = (payload, fields) => {
  const next = { ...payload };
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(next, field)) {
      next[field] = dateOnly(next[field]);
    }
  });
  return next;
};

const classifyAppointmentRisk = async (payload) =>
  riskService.classifyTriage({
    levels: await repository.getRiskLevels(),
    symptoms: payload.sintomas,
    reason: payload.motivo,
    nivelRiesgoId: payload.nivelRiesgoId,
  });

const listCollection = (collection, searchFields = ['nombre']) =>
  asyncHandler(async (req, res) => {
    const records = await repository.list(collection, {
      search: req.query.search,
      searchFields,
      equals: req.query,
    });
    ok(res, records);
  });

const createInCollection = (collection, auditAction, dateFields = []) =>
  asyncHandler(async (req, res) => {
    const payload = normalizePayloadDates(req.body, dateFields);
    const record = await repository.insert(collection, payload);
    await withAudit(req, auditAction, `Creacion en ${collection}: ${record.id}`);
    created(res, record);
  });

const updateInCollection = (collection, auditAction, dateFields = []) =>
  asyncHandler(async (req, res) => {
    const payload = normalizePayloadDates(req.body, dateFields);
    const record = ensureRecord(await repository.update(collection, req.params.id, payload));
    await withAudit(req, auditAction, `Actualizacion en ${collection}: ${record.id}`);
    ok(res, record);
  });

const deleteInCollection = (collection, auditAction) =>
  asyncHandler(async (req, res) => {
    const record = ensureRecord(await repository.softDelete(collection, req.params.id));
    await withAudit(req, auditAction, `Desactivacion en ${collection}: ${record.id}`);
    ok(res, record, 'Registro desactivado correctamente.');
  });

const getOptions = asyncHandler(async (_req, res) => {
  const [relations, clients, pets, products, services, users] = await Promise.all([
    repository.relations(),
    repository.list('clients'),
    repository.list('pets'),
    repository.list('products'),
    repository.list('services'),
    repository.listUsers(),
  ]);
  ok(res, {
    ...relations,
    clients,
    pets,
    products,
    services,
    users,
  });
});

const getPublicClinic = asyncHandler(async (_req, res) => {
  const config = ensureRecord(await repository.getConfig(), 'Configuracion de clinica no encontrada.');
  ok(res, {
    nombreClinica: config.nombreClinica,
    direccion: config.direccion,
    telefono: config.telefono,
    telefonoPetShop: config.telefonoPetShop,
    correoContacto: config.correoContacto,
    facebookUrl: config.facebookUrl,
    horario: config.horario,
  });
});

const getDashboard = asyncHandler(async (_req, res) => {
  const dashboard = await repository.dashboard();
  ok(res, dashboard);
});

const ensurePortalClient = async (req) => {
  const client = await repository.getClientForUser(req.user.id);
  if (!client) {
    throw new ApiError(403, 'El usuario no esta vinculado a un cliente del portal.');
  }
  return client;
};

const getPortalSummary = asyncHandler(async (req, res) => {
  const client = await ensurePortalClient(req);
  const [pets, appointments, species, breeds, riskLevels, config] = await Promise.all([
    repository.listClientPets(client.id),
    repository.listClientAppointments(client.id),
    repository.list('species'),
    repository.list('breeds'),
    repository.getRiskLevels(),
    repository.getConfig(),
  ]);
  ok(res, {
    client,
    pets,
    appointments,
    species,
    breeds,
    riskLevels,
    config,
  });
});

const updatePortalProfile = asyncHandler(async (req, res) => {
  await ensurePortalClient(req);
  let client;
  try {
    client = await repository.updateClientPortalProfile(req.user.id, req.body);
  } catch (error) {
    if (error.code === 'DUPLICATE_ACCOUNT') throw new ApiError(409, error.message);
    throw error;
  }
  if (!client) throw new ApiError(403, 'El usuario no esta vinculado a un cliente activo del portal.');
  await withAudit(req, 'portal.perfil.actualizar', `Datos personales actualizados: cliente ${client.id}`);
  ok(res, client, 'Datos personales actualizados correctamente.');
});

const listPortalPets = asyncHandler(async (req, res) => {
  const client = await ensurePortalClient(req);
  ok(res, await repository.listClientPets(client.id));
});

const createPortalPet = asyncHandler(async (req, res) => {
  const client = await ensurePortalClient(req);
  const payload = normalizePayloadDates(req.body, ['fechaNacimiento']);
  const pet = await repository.createClientPet(client.id, payload);
  await withAudit(req, 'portal.mascota.crear', `Mascota creada por cliente: ${pet.id}`);
  created(res, pet);
});

const listPortalAppointments = asyncHandler(async (req, res) => {
  const client = await ensurePortalClient(req);
  ok(res, await repository.listClientAppointments(client.id));
});

const createPortalAppointment = asyncHandler(async (req, res) => {
  const client = await ensurePortalClient(req);
  const payload = normalizePayloadDates(req.body, ['fecha']);
  payload.nivelRiesgoId = (await classifyAppointmentRisk(payload)).nivelRiesgoId;

  try {
    const appointment = await repository.createClientAppointment(client.id, req.user.id, payload);
    await withAudit(req, 'portal.cita.crear', `Cita solicitada por cliente: ${appointment.id}`);
    created(res, appointment);
  } catch (error) {
    if (error.code === 'APPOINTMENT_CONFLICT') {
      throw new ApiError(409, error.message, error.conflict);
    }
    if (error.code === 'INVALID_CLIENT_PET') {
      throw new ApiError(403, error.message);
    }
    throw error;
  }
});

const listClients = listCollection('clients', ['nombre', 'telefono', 'dpi', 'correo']);
const createClient = createInCollection('clients', 'cliente.crear', ['fechaRegistro']);
const updateClient = updateInCollection('clients', 'cliente.actualizar', ['fechaRegistro']);
const deleteClient = deleteInCollection('clients', 'cliente.desactivar');

const listPets = asyncHandler(async (req, res) => {
  const pets = await repository.list('pets', { search: req.query.search, searchFields: ['nombre', 'sexo', 'color'] });
  ok(res, pets);
});
const createPet = createInCollection('pets', 'mascota.crear', ['fechaNacimiento']);
const updatePet = updateInCollection('pets', 'mascota.actualizar', ['fechaNacimiento']);
const deletePet = deleteInCollection('pets', 'mascota.desactivar');

const uploadPetPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Seleccione una fotografia para subir.');
  const petId = Number(req.params.id);
  if (!Number.isInteger(petId) || petId < 1) throw new ApiError(400, 'Mascota no valida.');
  const pet = ensureRecord(await repository.findById('pets', petId), 'Mascota no encontrada.');
  const saved = await petPhotoService.save(req.file.buffer);
  if (!saved) throw new ApiError(400, 'La fotografia debe ser un archivo JPG, PNG o WebP valido.');
  let updated;
  try {
    updated = ensureRecord(await repository.update('pets', pet.id, { fotoUrl: saved.url }));
  } catch (error) {
    await petPhotoService.remove(saved.name).catch(() => {});
    throw error;
  }
  await withAudit(req, 'mascota.foto.actualizar', `Foto actualizada para mascota: ${pet.id}`);
  ok(res, updated);
  const previousName = petPhotoService.storedName(pet.fotoUrl);
  if (previousName) petPhotoService.remove(previousName).catch(() => {});
});

const getPetPhoto = asyncHandler(async (req, res) => {
  const target = petPhotoService.filePath(req.params.filename);
  if (!target) throw new ApiError(404, 'Fotografia no encontrada.');
  const pet = await repository.findPetByPhotoUrl(`/api/pet-photos/${req.params.filename}`);
  if (!pet) throw new ApiError(404, 'Fotografia no encontrada.');
  const canManagePets = req.user.permisos.includes('*') || req.user.permisos.includes('mascotas.gestionar');
  if (!canManagePets) {
    const client = await repository.getClientForUser(req.user.id);
    if (!client || Number(client.id) !== Number(pet.ClienteId)) throw new ApiError(404, 'Fotografia no encontrada.');
  }
  res.set('Cache-Control', 'private, max-age=300');
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(target, (error) => {
    if (error && !res.headersSent) res.status(error.status || 404).end();
  });
});

const listSpecies = listCollection('species', ['nombre']);
const createSpecies = createInCollection('species', 'especie.crear');
const updateSpecies = updateInCollection('species', 'especie.actualizar');
const deleteSpecies = deleteInCollection('species', 'especie.desactivar');

const listBreeds = listCollection('breeds', ['nombre']);
const createBreed = createInCollection('breeds', 'raza.crear');
const updateBreed = updateInCollection('breeds', 'raza.actualizar');
const deleteBreed = deleteInCollection('breeds', 'raza.desactivar');

const listAppointments = asyncHandler(async (req, res) => {
  const appointments = await repository.list('appointments', {
      search: req.query.search,
      searchFields: ['motivo', 'estado', 'fecha', 'hora'],
      equals: {
        fecha: req.query.fecha,
        estado: req.query.estado,
        clienteId: req.query.clienteId,
        mascotaId: req.query.mascotaId,
        nivelRiesgoId: req.query.nivelRiesgoId,
      },
    });

  ok(res, appointments);
});

const createAppointment = asyncHandler(async (req, res) => {
  const payload = normalizePayloadDates(req.body, ['fecha']);
  payload.usuarioRegistroId = req.user.id;
  payload.nivelRiesgoId = (await classifyAppointmentRisk(payload)).nivelRiesgoId;

  try {
    const appointment = await repository.createAppointment(payload);
    await withAudit(req, 'cita.crear', `Cita creada: ${appointment.id}`);
    created(res, appointment);
  } catch (error) {
    if (error.code === 'APPOINTMENT_CONFLICT') {
      throw new ApiError(409, error.message, error.conflict);
    }
    throw error;
  }
});

const updateAppointment = asyncHandler(async (req, res) => {
  const payload = normalizePayloadDates(req.body, ['fecha']);

  try {
    const appointment = ensureRecord(await repository.updateAppointment(req.params.id, payload));
    await withAudit(req, 'cita.actualizar', `Cita actualizada: ${appointment.id}`);
    ok(res, appointment);
  } catch (error) {
    if (error.code === 'APPOINTMENT_CONFLICT') {
      throw new ApiError(409, error.message, error.conflict);
    }
    throw error;
  }
});

const changeAppointmentStatus = asyncHandler(async (req, res) => {
  const appointment = ensureRecord(await repository.update('appointments', req.params.id, { estado: req.body.estado }));
  await withAudit(req, 'cita.estado', `Cita ${appointment.id} cambio a ${req.body.estado}`);
  ok(res, appointment);
});

const classifyTriage = asyncHandler(async (req, res) => {
  ok(res, await classifyAppointmentRisk(req.body));
});

const updateAppointmentTriage = asyncHandler(async (req, res) => {
  const result = await classifyAppointmentRisk(req.body);
  const appointment = ensureRecord(
    await repository.update('appointments', req.params.id, {
      sintomas: req.body.sintomas,
      nivelRiesgoId: result.nivelRiesgoId,
      riesgoModificadoPorId: req.user.id,
      riesgoModificadoEn: new Date().toISOString(),
    }),
  );
  await withAudit(req, 'cita.triaje', `Riesgo actualizado en cita ${appointment.id}`);
  ok(res, appointment);
});

const listClinicalRecords = asyncHandler(async (req, res) => {
  const records = await repository.list('clinicalRecords', {
    search: req.query.search,
    searchFields: ['motivoConsulta', 'sintomas', 'diagnostico', 'tratamiento'],
    equals: { mascotaId: req.query.mascotaId, clienteId: req.query.clienteId },
  });
  ok(res, records);
});
const createClinicalRecord = asyncHandler(async (req, res) => {
  const payload = normalizePayloadDates({ ...req.body, veterinarioId: req.user.id }, ['proximaCita']);
  const record = await repository.insert('clinicalRecords', payload);
  await withAudit(req, 'historial.crear', `Creacion en clinicalRecords: ${record.id}`);
  created(res, record);
});
const updateClinicalRecord = updateInCollection('clinicalRecords', 'historial.actualizar', ['proximaCita']);
const deleteClinicalRecord = deleteInCollection('clinicalRecords', 'historial.desactivar');

const listTreatments = listCollection('treatments', ['estado', 'medicamentoServicio', 'seguimiento']);
const createTreatment = asyncHandler(async (req, res) => {
  const payload = normalizePayloadDates({ ...req.body, veterinarioId: req.user.id }, ['fechaInicio', 'fechaFin']);
  const record = await repository.insert('treatments', payload);
  await withAudit(req, 'tratamiento.crear', `Creacion en treatments: ${record.id}`);
  created(res, record);
});
const updateTreatment = updateInCollection('treatments', 'tratamiento.actualizar', ['fechaInicio', 'fechaFin']);
const deleteTreatment = deleteInCollection('treatments', 'tratamiento.desactivar');

const listVaccines = listCollection('vaccines', ['nombreVacuna', 'lote', 'observaciones']);
const createVaccine = asyncHandler(async (req, res) => {
  const payload = normalizePayloadDates({ ...req.body, veterinarioId: req.user.id }, [
    'fechaAplicacion', 'proximaDosis', 'fechaVencimientoProducto',
  ]);
  const record = await repository.insert('vaccines', payload);
  await withAudit(req, 'vacuna.crear', `Creacion en vaccines: ${record.id}`);
  created(res, record);
});
const updateVaccine = updateInCollection('vaccines', 'vacuna.actualizar', [
  'fechaAplicacion',
  'proximaDosis',
  'fechaVencimientoProducto',
]);
const deleteVaccine = deleteInCollection('vaccines', 'vacuna.desactivar');

const listProducts = listCollection('products', ['nombre', 'categoria', 'lote']);
const createProduct = createInCollection('products', 'producto.crear', ['fechaVencimiento']);
const updateProduct = updateInCollection('products', 'producto.actualizar', ['fechaVencimiento']);
const deleteProduct = deleteInCollection('products', 'producto.desactivar');

const listServices = listCollection('services', ['nombre', 'categoria']);
const createService = createInCollection('services', 'servicio.crear');
const updateService = updateInCollection('services', 'servicio.actualizar');
const deleteService = deleteInCollection('services', 'servicio.desactivar');

const listInventoryMovements = listCollection('inventoryMovements', ['tipo', 'motivo']);
const createInventoryMovement = asyncHandler(async (req, res) => {
  try {
    const movement = await repository.createInventoryMovement({ ...req.body, usuarioId: req.user.id });
    await withAudit(req, 'inventario.movimiento', `Movimiento ${movement.tipo} producto ${req.body.productoId}`);
    created(res, movement);
  } catch (error) {
    if (['PRODUCT_NOT_FOUND', 'INSUFFICIENT_STOCK'].includes(error.code)) throw new ApiError(409, error.message);
    throw error;
  }
});

const listSales = asyncHandler(async (_req, res) => {
  ok(res, await repository.list('sales'));
});

const createSale = asyncHandler(async (req, res) => {
  try {
    const sale = await repository.createSale({ ...req.body, usuarioId: req.user.id });
    await withAudit(req, 'venta.crear', `Venta creada: ${sale.id}`);
    created(res, sale);
  } catch (error) {
    if (['INVALID_SALE_ITEM', 'EXPIRED_SALE_ITEM', 'INSUFFICIENT_STOCK'].includes(error.code)) {
      throw new ApiError(409, error.message);
    }
    throw error;
  }
});

const loadSaleTicket = async (saleId) => {
  const sale = ensureRecord(await repository.findById('sales', saleId), 'Venta no encontrada.');
  const [client, companyConfig, seller] = await Promise.all([
    sale.clienteId ? repository.findById('clients', sale.clienteId) : null,
    repository.getConfig(),
    repository.getUser(sale.usuarioId),
  ]);
  return {
    empresa: companyConfig,
    cliente: client,
    vendedor: seller ? { id: seller.id, nombre: seller.nombre, rol: seller.rol } : null,
    venta: sale,
    textoImprimible: [
      companyConfig.nombreClinica,
      `Ticket interno #${sale.id}`,
      `Cliente: ${client ? client.nombre : 'Consumidor final'}`,
      `Total: Q${sale.total.toFixed(2)}`,
    ],
  };
};

const getSaleTicket = asyncHandler(async (req, res) => {
  ok(res, await loadSaleTicket(req.params.id));
});

const getSaleTicketPdf = asyncHandler(async (req, res) => {
  const saleId = Number(req.params.id);
  if (!Number.isInteger(saleId) || saleId < 1) throw new ApiError(400, 'Venta no valida.');
  const ticket = await loadSaleTicket(saleId);
  const pdf = await createTicketPdf(ticket);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="ticket-${saleId}.pdf"`,
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
});

const getReports = asyncHandler(async (_req, res) => {
  ok(res, await repository.reports());
});

const getReportsPdf = asyncHandler(async (_req, res) => {
  const [report, company] = await Promise.all([repository.reports(), repository.getConfig()]);
  const pdf = await createReportPdf(report, company);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="reporte-clinica.pdf"',
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
});

const listUsers = asyncHandler(async (_req, res) => {
  ok(res, await repository.listUsers());
});

const createUser = asyncHandler(async (req, res) => {
  try {
    const user = await repository.createUser(req.body);
    await withAudit(req, 'usuario.crear', `Usuario creado: ${user.id}`);
    created(res, user);
  } catch (error) {
    if (error.code === 'DUPLICATE_ACCOUNT') throw new ApiError(409, error.message, error.conflict);
    throw error;
  }
});

const updateUser = asyncHandler(async (req, res) => {
  try {
    const user = ensureRecord(await repository.updateUser(req.params.id, req.body), 'Usuario no encontrado.');
    await withAudit(req, 'usuario.actualizar', `Usuario actualizado: ${user.id}`);
    ok(res, user);
  } catch (error) {
    if (error.code === 'DUPLICATE_ACCOUNT') throw new ApiError(409, error.message, error.conflict);
    throw error;
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = ensureRecord(await repository.updateUser(req.params.id, { activo: false }), 'Usuario no encontrado.');
  await withAudit(req, 'usuario.desactivar', `Usuario desactivado: ${user.id}`);
  ok(res, user);
});

const getConfig = asyncHandler(async (_req, res) => {
  ok(res, await repository.getConfig());
});

const updateConfig = asyncHandler(async (req, res) => {
  const config = await repository.updateConfig(req.body);
  await withAudit(req, 'configuracion.actualizar', 'Configuracion de empresa actualizada');
  ok(res, config);
});

const getTriageRules = asyncHandler(async (_req, res) => {
  ok(res, await repository.getRiskLevels());
});

const updateTriageRules = asyncHandler(async (req, res) => {
  const levels = await repository.updateRiskLevels(req.body.riskLevels);
  await withAudit(req, 'triaje.configurar', 'Reglas de clasificacion de riesgo actualizadas');
  ok(res, levels);
});

const getAudit = asyncHandler(async (_req, res) => {
  ok(res, await repository.getAudit());
});

const getAuditPdf = asyncHandler(async (_req, res) => {
  const [audit, company] = await Promise.all([repository.getAudit(), repository.getConfig()]);
  const pdf = await createAuditPdf(audit, company);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="reporte-auditoria.pdf"',
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
});

module.exports = {
  getPublicClinic,
  getOptions,
  getDashboard,
  getPortalSummary,
  updatePortalProfile,
  listPortalPets,
  createPortalPet,
  listPortalAppointments,
  createPortalAppointment,
  listClients,
  createClient,
  updateClient,
  deleteClient,
  listPets,
  createPet,
  updatePet,
  deletePet,
  uploadPetPhoto,
  getPetPhoto,
  listSpecies,
  createSpecies,
  updateSpecies,
  deleteSpecies,
  listBreeds,
  createBreed,
  updateBreed,
  deleteBreed,
  listAppointments,
  createAppointment,
  updateAppointment,
  changeAppointmentStatus,
  classifyTriage,
  updateAppointmentTriage,
  listClinicalRecords,
  createClinicalRecord,
  updateClinicalRecord,
  deleteClinicalRecord,
  listTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  listVaccines,
  createVaccine,
  updateVaccine,
  deleteVaccine,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listServices,
  createService,
  updateService,
  deleteService,
  listInventoryMovements,
  createInventoryMovement,
  listSales,
  createSale,
  getSaleTicket,
  getSaleTicketPdf,
  getReports,
  getReportsPdf,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  getConfig,
  updateConfig,
  getTriageRules,
  updateTriageRules,
  getAudit,
  getAuditPdf,
};
