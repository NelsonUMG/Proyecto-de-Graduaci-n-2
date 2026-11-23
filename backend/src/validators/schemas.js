const Joi = require('joi');
const clinicClock = require('../utils/clinicClock');

const id = Joi.number().integer().positive();
const text = (max = 160) => Joi.string().trim().max(max);
const optionalText = (max = 160) => text(max).allow('', null);
const futureOrToday = Joi.date().iso().custom((value, helpers) => {
  return value.toISOString().slice(0, 10) < clinicClock().date ? helpers.error('date.futureOrToday') : value;
}).messages({
  'date.futureOrToday': 'La fecha de la cita no puede estar en el pasado.',
});
const strongPassword = Joi.string().min(10).max(128).custom((value, helpers) => {
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return helpers.error('password.strong');
  }
  return value;
}).messages({
  'string.min': 'La clave debe tener al menos 10 caracteres.',
  'password.strong': 'La clave debe incluir mayuscula, minuscula, numero y simbolo.',
});

const schemas = {
  login: Joi.object({
    usuario: text(120).required(),
    password: Joi.string().min(6).max(128).required(),
  }),

  passwordResetRequest: Joi.object({
    identifier: text(160).required(),
    portal: Joi.string().valid('cliente', 'empleado').required(),
  }),

  passwordReset: Joi.object({
    token: Joi.string().trim().min(32).max(200).required(),
    password: strongPassword.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
      'any.only': 'La confirmacion de la clave no coincide.',
    }),
  }),

  clientRegistration: Joi.object({
    nombre: text(120).required(),
    telefono: text(30).required(),
    dpi: optionalText(20),
    direccion: optionalText(250),
    usuario: text(60).required(),
    email: Joi.string().trim().email().required(),
    password: strongPassword.required(),
  }),

  portalProfile: Joi.object({
    nombre: text(120).required(),
    telefono: text(30).required(),
    correo: Joi.string().trim().email().max(160).required(),
    direccion: optionalText(250),
  }),

  client: Joi.object({
    nombre: text(120).required(),
    telefono: text(30).required(),
    dpi: optionalText(20),
    correo: Joi.string().trim().email().allow('', null),
    direccion: optionalText(250),
    fechaRegistro: Joi.date().iso().optional(),
    activo: Joi.boolean().optional(),
  }),

  pet: Joi.object({
    clienteId: id.required(),
    nombre: text(100).required(),
    especieId: id.required(),
    razaId: id.allow(null),
    sexo: Joi.string().valid('Macho', 'Hembra', 'No especificado').required(),
    peso: Joi.number().min(0).precision(2).allow(null),
    color: optionalText(80),
    fechaNacimiento: Joi.date().iso().allow(null),
    observaciones: optionalText(500),
    fotoUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).allow('', null),
    activo: Joi.boolean().optional(),
  }),

  portalPet: Joi.object({
    nombre: text(100).required(),
    especieId: id.required(),
    razaId: id.allow(null),
    sexo: Joi.string().valid('Macho', 'Hembra', 'No especificado').required(),
    peso: Joi.number().min(0).precision(2).allow(null),
    color: optionalText(80),
    fechaNacimiento: Joi.date().iso().allow(null),
    observaciones: optionalText(500),
    fotoUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).allow('', null),
  }),

  species: Joi.object({
    nombre: text(80).required(),
    activo: Joi.boolean().optional(),
  }),

  breed: Joi.object({
    especieId: id.required(),
    nombre: text(80).required(),
    activo: Joi.boolean().optional(),
  }),

  appointment: Joi.object({
    clienteId: id.required(),
    mascotaId: id.required(),
    fecha: futureOrToday.required(),
    hora: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    motivo: text(250).required(),
    sintomas: Joi.array().items(text(100)).default([]),
    nivelRiesgoId: id.optional(),
    estado: Joi.string()
      .valid('Pendiente', 'Confirmada', 'En espera', 'En atencion', 'Atendida', 'Finalizada', 'Cancelada', 'No asistio')
      .default('Pendiente'),
  }),

  portalAppointment: Joi.object({
    mascotaId: id.required(),
    fecha: futureOrToday.required(),
    hora: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).required(),
    motivo: text(250).required(),
    sintomas: Joi.array().items(text(100)).default([]),
    nivelRiesgoId: id.optional(),
  }),

  appointmentStatus: Joi.object({
    estado: Joi.string()
      .valid('Pendiente', 'Confirmada', 'En espera', 'En atencion', 'Atendida', 'Finalizada', 'Cancelada', 'No asistio')
      .required(),
  }),

  triage: Joi.object({
    sintomas: Joi.array().items(text(100)).default([]),
    motivo: optionalText(250),
    nivelRiesgoId: id.optional(),
  }),

  triageRules: Joi.object({
    riskLevels: Joi.array()
      .items(
        Joi.object({
          id: id.required(),
          nombre: text(40).required(),
          prioridad: Joi.number().integer().min(1).max(99).required(),
          descripcion: optionalText(250),
          tiempoAtencion: text(120).required(),
          keywords: Joi.array().items(text(80)).min(1).required(),
          color: text(20).required(),
          activo: Joi.boolean().optional(),
        }),
      )
      .unique('id')
      .unique('nombre')
      .unique('prioridad')
      .min(1)
      .required(),
  }),

  clinicalRecord: Joi.object({
    mascotaId: id.required(),
    clienteId: id.required(),
    citaId: id.allow(null),
    motivoConsulta: text(250).required(),
    sintomas: optionalText(1000),
    diagnostico: optionalText(1000),
    tratamiento: optionalText(1000),
    medicamentos: optionalText(1000),
    observaciones: optionalText(1000),
    proximaCita: Joi.date().iso().allow(null),
    activo: Joi.boolean().optional(),
  }),

  treatment: Joi.object({
    mascotaId: id.required(),
    estado: Joi.string().valid('Activo', 'Finalizado', 'Suspendido').default('Activo'),
    fechaInicio: Joi.date().iso().required(),
    fechaFin: Joi.date().iso().min(Joi.ref('fechaInicio')).allow(null).messages({
      'date.min': 'La fecha final no puede ser anterior a la fecha inicial.',
    }),
    medicamentoServicio: text(200).required(),
    dosisIndicaciones: optionalText(500),
    observaciones: optionalText(500),
    seguimiento: optionalText(500),
    activo: Joi.boolean().optional(),
  }),

  vaccine: Joi.object({
    mascotaId: id.required(),
    nombreVacuna: text(160).required(),
    fechaAplicacion: Joi.date().iso().required(),
    proximaDosis: Joi.date().iso().min(Joi.ref('fechaAplicacion')).allow(null).messages({
      'date.min': 'La proxima dosis no puede ser anterior a la aplicacion.',
    }),
    lote: optionalText(80),
    fechaVencimientoProducto: Joi.date().iso().min(Joi.ref('fechaAplicacion')).allow(null).messages({
      'date.min': 'No se puede registrar una vacuna aplicada despues del vencimiento del producto.',
    }),
    observaciones: optionalText(500),
    activo: Joi.boolean().optional(),
  }),

  product: Joi.object({
    nombre: text(160).required(),
    categoria: text(100).required(),
    stock: Joi.number().min(0).required(),
    stockMinimo: Joi.number().min(0).default(0),
    precio: Joi.number().min(0).precision(2).required(),
    fechaVencimiento: Joi.date().iso().allow(null),
    lote: optionalText(80),
    activo: Joi.boolean().optional(),
  }),

  service: Joi.object({
    nombre: text(160).required(),
    categoria: text(100).required(),
    precio: Joi.number().min(0).precision(2).required(),
    activo: Joi.boolean().optional(),
  }),

  inventoryMovement: Joi.object({
    productoId: id.required(),
    tipo: Joi.string().valid('Entrada', 'Salida', 'Ajuste').required(),
    cantidad: Joi.number().positive().required(),
    motivo: text(250).required(),
  }),

  sale: Joi.object({
    clienteId: id.required(),
    metodoPago: Joi.string().valid('Efectivo', 'Debito', 'Credito', 'Transferencia').required(),
    detalles: Joi.array()
      .items(
        Joi.object({
          tipo: Joi.string().valid('Producto', 'Servicio').required(),
          referenciaId: id.required(),
          cantidad: Joi.number().positive().required(),
        }),
      )
      .min(1)
      .required(),
  }),

  user: Joi.object({
    nombre: text(120).required(),
    usuario: text(60).required(),
    email: Joi.string().trim().email().required(),
    password: strongPassword.required(),
    roleId: id.required(),
    activo: Joi.boolean().optional(),
  }),

  userUpdate: Joi.object({
    nombre: text(120).optional(),
    usuario: text(60).optional(),
    email: Joi.string().trim().email().optional(),
    password: strongPassword.optional(),
    roleId: id.optional(),
    activo: Joi.boolean().optional(),
  }).min(1),

  companyConfig: Joi.object({
    nombreClinica: text(160).required(),
    direccion: text(250).required(),
    telefono: text(50).required(),
    telefonoPetShop: text(50).required(),
    correoContacto: Joi.string().trim().email().max(160).required(),
    facebookUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).allow(''),
    nit: text(50).required(),
    logoUrl: optionalText(500),
    horario: text(200).required(),
    recordatoriosActivos: Joi.boolean().required(),
  }),

};

module.exports = schemas;
