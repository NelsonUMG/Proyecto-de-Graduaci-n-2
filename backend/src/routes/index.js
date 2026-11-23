const express = require('express');
const multer = require('multer');
const authController = require('../controllers/authController');
const healthController = require('../controllers/healthController');
const clinic = require('../controllers/clinicController');
const validate = require('../middlewares/validate');
const { authenticate, authorizePermission, authorizeRoles } = require('../middlewares/auth');
const schemas = require('../validators/schemas');

const router = express.Router();
const petPhotoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

router.get('/health', healthController.health);
router.get('/public/clinic', clinic.getPublicClinic);

router.post('/auth/login/client', validate(schemas.login), authController.loginClient);
router.post('/auth/login/staff', validate(schemas.login), authController.loginStaff);
router.post('/auth/register-client', validate(schemas.clientRegistration), authController.registerClient);
router.post('/auth/password/forgot', validate(schemas.passwordResetRequest), authController.requestPasswordReset);
router.post('/auth/password/reset', validate(schemas.passwordReset), authController.resetPassword);
router.get('/auth/me', authenticate, authController.me);
router.post('/auth/logout', authenticate, authController.logout);

router.use(authenticate);

router.get('/catalog/options', authorizePermission('dashboard.ver'), clinic.getOptions);
router.get('/dashboard', authorizePermission('dashboard.ver'), clinic.getDashboard);

router.get('/portal/summary', authorizePermission('portal.citas'), clinic.getPortalSummary);
router.put('/portal/profile', authorizeRoles('Cliente'), validate(schemas.portalProfile), clinic.updatePortalProfile);
router
  .route('/portal/pets')
  .get(authorizePermission('portal.mascotas'), clinic.listPortalPets)
  .post(authorizePermission('portal.mascotas'), validate(schemas.portalPet), clinic.createPortalPet);
router
  .route('/portal/appointments')
  .get(authorizePermission('portal.citas'), clinic.listPortalAppointments)
  .post(authorizePermission('portal.citas'), validate(schemas.portalAppointment), clinic.createPortalAppointment);

router
  .route('/clients')
  .get(authorizePermission('clientes.gestionar'), clinic.listClients)
  .post(authorizePermission('clientes.gestionar'), validate(schemas.client), clinic.createClient);
router
  .route('/clients/:id')
  .put(authorizePermission('clientes.gestionar'), validate(schemas.client), clinic.updateClient)
  .delete(authorizePermission('clientes.gestionar'), clinic.deleteClient);

router
  .route('/pets')
  .get(authorizePermission('mascotas.gestionar'), clinic.listPets)
  .post(authorizePermission('mascotas.gestionar'), validate(schemas.pet), clinic.createPet);
router
  .route('/pets/:id')
  .put(authorizePermission('mascotas.gestionar'), validate(schemas.pet), clinic.updatePet)
  .delete(authorizePermission('mascotas.gestionar'), clinic.deletePet);
router.post('/pets/:id/photo', authorizePermission('mascotas.gestionar'), petPhotoUpload.single('photo'), clinic.uploadPetPhoto);
router.get('/pet-photos/:filename', clinic.getPetPhoto);

router
  .route('/species')
  .get(clinic.listSpecies)
  .post(authorizeRoles('Administrador'), validate(schemas.species), clinic.createSpecies);
router
  .route('/species/:id')
  .put(authorizeRoles('Administrador'), validate(schemas.species), clinic.updateSpecies)
  .delete(authorizeRoles('Administrador'), clinic.deleteSpecies);

router
  .route('/breeds')
  .get(clinic.listBreeds)
  .post(authorizeRoles('Administrador'), validate(schemas.breed), clinic.createBreed);
router
  .route('/breeds/:id')
  .put(authorizeRoles('Administrador'), validate(schemas.breed), clinic.updateBreed)
  .delete(authorizeRoles('Administrador'), clinic.deleteBreed);

router
  .route('/appointments')
  .get(authorizePermission('citas.gestionar'), clinic.listAppointments)
  .post(authorizePermission('citas.gestionar'), validate(schemas.appointment), clinic.createAppointment);
router
  .route('/appointments/:id')
  .put(authorizePermission('citas.gestionar'), validate(schemas.appointment), clinic.updateAppointment);
router.patch(
  '/appointments/:id/status',
  authorizePermission('citas.gestionar'),
  validate(schemas.appointmentStatus),
  clinic.changeAppointmentStatus,
);
router
  .route('/triage/rules')
  .get(authorizePermission('configuracion.gestionar'), clinic.getTriageRules)
  .put(authorizePermission('configuracion.gestionar'), validate(schemas.triageRules), clinic.updateTriageRules);
router.post('/triage/classify', authorizePermission('citas.gestionar'), validate(schemas.triage), clinic.classifyTriage);
router.patch(
  '/appointments/:id/triage',
  authorizePermission('citas.gestionar'),
  validate(schemas.triage),
  clinic.updateAppointmentTriage,
);

router
  .route('/clinical-records')
  .get(authorizePermission('historial.gestionar'), clinic.listClinicalRecords)
  .post(authorizePermission('historial.gestionar'), validate(schemas.clinicalRecord), clinic.createClinicalRecord);
router
  .route('/clinical-records/:id')
  .put(authorizePermission('historial.gestionar'), validate(schemas.clinicalRecord), clinic.updateClinicalRecord)
  .delete(authorizePermission('historial.gestionar'), clinic.deleteClinicalRecord);

router
  .route('/treatments')
  .get(authorizePermission('tratamientos.gestionar'), clinic.listTreatments)
  .post(authorizePermission('tratamientos.gestionar'), validate(schemas.treatment), clinic.createTreatment);
router
  .route('/treatments/:id')
  .put(authorizePermission('tratamientos.gestionar'), validate(schemas.treatment), clinic.updateTreatment)
  .delete(authorizePermission('tratamientos.gestionar'), clinic.deleteTreatment);

router
  .route('/vaccines')
  .get(authorizePermission('vacunas.gestionar'), clinic.listVaccines)
  .post(authorizePermission('vacunas.gestionar'), validate(schemas.vaccine), clinic.createVaccine);
router
  .route('/vaccines/:id')
  .put(authorizePermission('vacunas.gestionar'), validate(schemas.vaccine), clinic.updateVaccine)
  .delete(authorizePermission('vacunas.gestionar'), clinic.deleteVaccine);

router
  .route('/products')
  .get(authorizePermission('inventario.gestionar'), clinic.listProducts)
  .post(authorizePermission('inventario.gestionar'), validate(schemas.product), clinic.createProduct);
router
  .route('/products/:id')
  .put(authorizePermission('inventario.gestionar'), validate(schemas.product), clinic.updateProduct)
  .delete(authorizePermission('inventario.gestionar'), clinic.deleteProduct);

router
  .route('/services')
  .get(clinic.listServices)
  .post(authorizePermission('inventario.gestionar'), validate(schemas.service), clinic.createService);
router
  .route('/services/:id')
  .put(authorizePermission('inventario.gestionar'), validate(schemas.service), clinic.updateService)
  .delete(authorizePermission('inventario.gestionar'), clinic.deleteService);

router
  .route('/inventory/movements')
  .get(authorizePermission('inventario.gestionar'), clinic.listInventoryMovements)
  .post(authorizePermission('inventario.gestionar'), validate(schemas.inventoryMovement), clinic.createInventoryMovement);

router
  .route('/sales')
  .get(authorizePermission('ventas.gestionar'), clinic.listSales)
  .post(authorizePermission('ventas.gestionar'), validate(schemas.sale), clinic.createSale);
router.get('/sales/:id/ticket', authorizePermission('ventas.gestionar'), clinic.getSaleTicket);
router.get('/sales/:id/ticket.pdf', authorizePermission('ventas.gestionar'), clinic.getSaleTicketPdf);

router.get('/reports', authorizePermission('reportes.ver'), clinic.getReports);
router.get('/reports/pdf', authorizePermission('reportes.ver'), clinic.getReportsPdf);

router
  .route('/users')
  .get(authorizePermission('usuarios.gestionar'), clinic.listUsers)
  .post(authorizePermission('usuarios.gestionar'), validate(schemas.user), clinic.createUser);
router
  .route('/users/:id')
  .put(authorizePermission('usuarios.gestionar'), validate(schemas.userUpdate), clinic.updateUser)
  .delete(authorizePermission('usuarios.gestionar'), clinic.deleteUser);

router
  .route('/config/company')
  .get(clinic.getConfig)
  .put(authorizePermission('configuracion.gestionar'), validate(schemas.companyConfig), clinic.updateConfig);

router.get('/audit', authorizeRoles('Administrador'), clinic.getAudit);
router.get('/audit/pdf', authorizeRoles('Administrador'), clinic.getAuditPdf);

module.exports = router;
