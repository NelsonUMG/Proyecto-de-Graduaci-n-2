from __future__ import annotations

import math
import re
import textwrap
from pathlib import Path
from shutil import copy2
from zipfile import ZipFile

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


WORKSPACE = Path(r"C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO")
SOURCE = Path(r"C:\Users\Nelson\Desktop\Proyecto de Graduación\MARCO DE ANEXOS.docx")
TEMP_DIR = WORKSPACE / "tmp" / "marco_profesional"
OUTPUT_DIR = WORKSPACE / "output"
OUTPUT = OUTPUT_DIR / "MARCO_DE_ANEXOS_APA7_SANDOVAL_REVISION_VISUAL_FINAL.docx"

GANTT = TEMP_DIR / "gantt_original.png"
DATA_MODEL = TEMP_DIR / "modelo_logico_profesional.png"
ARCHITECTURE = TEMP_DIR / "arquitectura_profesional.png"
ERD_SECURITY = TEMP_DIR / "erd_seguridad_clientes.png"
ERD_APPOINTMENTS = TEMP_DIR / "erd_citas_triaje.png"
ERD_CLINICAL = TEMP_DIR / "erd_atencion_clinica.png"
ERD_CARE = TEMP_DIR / "erd_tratamientos_vacunas.png"
ERD_SALES = TEMP_DIR / "erd_inventario_ventas.png"
DB_INVENTORY = TEMP_DIR / "inventario_tablas_sql.png"
UC_CLIENT = TEMP_DIR / "casos_uso_cliente.png"
UC_EMPLOYEE = TEMP_DIR / "casos_uso_empleado.png"
UC_ADMIN = TEMP_DIR / "casos_uso_admin.png"
UC_DETAIL_DIR = TEMP_DIR / "casos_uso_individuales"

UI_DIR = TEMP_DIR / "evidencias_ui_reales"
UI_CLIENT = UI_DIR / "01_acceso_cliente.png"
UI_EMPLOYEE = UI_DIR / "02_acceso_empleado.png"
UI_ADMIN = UI_DIR / "03_acceso_admin.png"
UI_REGISTER = UI_DIR / "04_registro_cliente.png"
UI_RESET = UI_DIR / "05_recuperacion_clave.png"

FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")

PAGE_WIDTH_TWIPS = 9360
TABLE_INDENT_TWIPS = 120
TABLE_WIDTH_TWIPS = 9240


FUNCTIONAL_REQUIREMENTS = [
    {
        "id": "REQ001",
        "name": "Acceso separado por portal",
        "module": "Autenticación",
        "actors": "Cliente, empleado y administrador",
        "priority": "Alta",
        "description": "El sistema presentará una URL de acceso específica para cada tipo de usuario y conservará una sola aplicación con autorización centralizada.",
        "precondition": "La aplicación web está disponible y el usuario conoce el portal que corresponde a su función.",
        "functions": [
            "F001. Publicar /cliente/acceso para clientes.",
            "F002. Publicar /empleado/acceso para el personal.",
            "F003. Publicar /admin/acceso para administradores.",
            "F004. Redirigir rutas genéricas o desconocidas al acceso de clientes.",
        ],
        "acceptance": [
            "CA01. Las tres URL cargan directamente sin depender de navegación previa.",
            "CA02. Cada pantalla identifica con claridad el portal y no ofrece enlaces cruzados de acceso.",
            "CA03. Conocer otra URL no concede permisos adicionales.",
        ],
        "exceptions": ["La ruta no reconocida se redirige a /cliente/acceso."],
    },
    {
        "id": "REQ002",
        "name": "Registro de cuenta de cliente",
        "module": "Autenticación",
        "actors": "Cliente",
        "priority": "Alta",
        "description": "El cliente podrá crear una cuenta vinculada con su registro de propietario desde el portal público de clientes.",
        "precondition": "El usuario no posee una cuenta con el mismo nombre de usuario o correo electrónico.",
        "functions": [
            "F001. Solicitar nombre, teléfono, dirección, usuario, correo y contraseña.",
            "F002. Validar el formato y la longitud de los datos.",
            "F003. Crear el cliente y el usuario con rol Cliente en una operación consistente.",
            "F004. Normalizar usuario y correo para comparar duplicados sin distinguir mayúsculas.",
        ],
        "acceptance": [
            "CA01. POST /api/auth/register-client crea una cuenta válida.",
            "CA02. Un usuario repetido responde 409 e identifica el campo usuario.",
            "CA03. Un correo repetido responde 409 e identifica el campo correo.",
        ],
        "exceptions": ["Datos inválidos: 400.", "Usuario o correo existente: 409.", "Fallo de persistencia: no se conserva un registro parcial."],
    },
    {
        "id": "REQ003",
        "name": "Inicio de sesión de clientes",
        "module": "Autenticación",
        "actors": "Cliente",
        "priority": "Alta",
        "description": "El sistema autenticará clientes únicamente desde su portal y limitará la sesión al propietario vinculado.",
        "precondition": "La cuenta existe, está activa y posee el rol Cliente.",
        "functions": [
            "F001. Aceptar usuario o correo como identificador.",
            "F002. Verificar la contraseña cifrada y el estado de la cuenta.",
            "F003. Confirmar que el rol corresponde al portal cliente.",
            "F004. Iniciar una sesión protegida y dirigir a /cliente/portal.",
        ],
        "acceptance": ["CA01. Credenciales válidas responden 200.", "CA02. El portal muestra solo datos del cliente autenticado.", "CA03. El cliente recibe 403 al solicitar funciones internas."],
        "exceptions": ["Credenciales inválidas: 401.", "Rol incompatible: 403.", "Cuenta bloqueada: 423."],
    },
    {
        "id": "REQ004",
        "name": "Inicio de sesión del personal",
        "module": "Autenticación",
        "actors": "Empleado",
        "priority": "Alta",
        "description": "El personal autorizado accederá al espacio de operación clínica desde un portal independiente.",
        "precondition": "La cuenta existe, está activa y posee el rol Empleado.",
        "functions": [
            "F001. Autenticar mediante POST /api/auth/login/employee.",
            "F002. Validar usuario o correo, contraseña, estado y rol.",
            "F003. Dirigir al espacio /empleado.",
            "F004. Mostrar solo módulos permitidos por el rol.",
        ],
        "acceptance": ["CA01. El empleado puede iniciar sesión en su portal.", "CA02. El mismo empleado es rechazado en /admin/acceso.", "CA03. No se muestran enlaces de usuarios o configuración sin permiso."],
        "exceptions": ["Credenciales inválidas: 401.", "Portal incorrecto: 403.", "Cuenta bloqueada: 423."],
    },
    {
        "id": "REQ005",
        "name": "Inicio de sesión administrativo",
        "module": "Autenticación",
        "actors": "Administrador",
        "priority": "Alta",
        "description": "El administrador accederá a funciones de operación, seguridad, configuración, auditoría y evaluación desde su portal.",
        "precondition": "La cuenta existe, está activa y posee el rol Administrador.",
        "functions": [
            "F001. Autenticar mediante POST /api/auth/login/admin.",
            "F002. Verificar el rol antes de emitir la sesión.",
            "F003. Dirigir al espacio /admin.",
            "F004. Habilitar módulos conforme a los permisos del rol.",
        ],
        "acceptance": ["CA01. El administrador inicia sesión con respuesta 200.", "CA02. Puede consultar usuarios, auditoría y evaluación.", "CA03. Las cuentas de otros roles reciben 403 en este portal."],
        "exceptions": ["Credenciales inválidas: 401.", "Rol incompatible: 403.", "Cuenta inactiva o bloqueada: rechazo de acceso."],
    },
    {
        "id": "REQ006",
        "name": "Sesión segura y cierre de sesión",
        "module": "Autenticación",
        "actors": "Usuario autenticado",
        "priority": "Alta",
        "description": "El sistema mantendrá la identidad mediante un token firmado y permitirá invalidar la sesión desde cualquier portal.",
        "precondition": "El usuario completó una autenticación válida.",
        "functions": [
            "F001. Emitir cookie HttpOnly con SameSite=Strict.",
            "F002. Aplicar Secure en producción con HTTPS.",
            "F003. Restaurar la identidad mediante GET /api/auth/me.",
            "F004. Eliminar la cookie mediante POST /api/auth/logout.",
        ],
        "acceptance": ["CA01. La cookie no es accesible desde JavaScript del navegador.", "CA02. /auth/me devuelve rol y permisos vigentes.", "CA03. Tras cerrar sesión, una ruta protegida responde 401."],
        "exceptions": ["Token ausente, inválido, expirado o anterior al cambio de seguridad: 401."],
    },
    {
        "id": "REQ007",
        "name": "Bloqueo progresivo por intentos fallidos",
        "module": "Seguridad",
        "actors": "Usuario no autenticado",
        "priority": "Alta",
        "description": "El sistema reducirá los ataques de fuerza bruta mediante bloqueos acumulativos después de cada ciclo de cinco contraseñas incorrectas.",
        "precondition": "La cuenta existe y todavía no se ha autenticado correctamente.",
        "functions": [
            "F001. Incrementar IntentosFallidos por cada contraseña incorrecta.",
            "F002. Aplicar 10 minutos en el primer ciclo de cinco fallos.",
            "F003. Escalar los ciclos siguientes a 30, 60, 90 y 120 minutos.",
            "F004. Reiniciar los intentos después de un acceso válido sin reducir el historial de ciclos de seguridad establecido.",
        ],
        "acceptance": ["CA01. Los primeros cuatro fallos responden 401.", "CA02. El quinto fallo responde 423 e informa el tiempo de espera.", "CA03. La secuencia nunca supera 120 minutos."],
        "exceptions": ["Mientras BloqueadoHasta esté vigente, no se evalúa la contraseña y se conserva el bloqueo."],
    },
    {
        "id": "REQ008",
        "name": "Recuperación y restablecimiento de contraseña",
        "module": "Seguridad",
        "actors": "Cliente, empleado y administrador",
        "priority": "Alta",
        "description": "El usuario podrá solicitar por correo un enlace temporal y definir una nueva contraseña sin revelar si una cuenta existe.",
        "precondition": "La cuenta posee un correo registrado y el servicio SMTP está configurado.",
        "functions": [
            "F001. Recibir usuario o correo y portal mediante /auth/password/forgot.",
            "F002. Responder de forma genérica para evitar enumeración de cuentas.",
            "F003. Guardar únicamente el hash del token con vigencia de 30 minutos.",
            "F004. Aceptar el token una sola vez, cambiar la contraseña e invalidar sesiones anteriores.",
        ],
        "acceptance": ["CA01. Cuenta inexistente y existente producen la misma respuesta pública.", "CA02. El token usado o vencido se rechaza.", "CA03. La contraseña nueva permite entrar y la sesión anterior deja de ser válida."],
        "exceptions": ["SMTP no disponible: registrar el error sin exponer secretos.", "Token inválido, usado o vencido: 400."],
    },
    {
        "id": "REQ009",
        "name": "Resumen del portal del cliente",
        "module": "Portal de clientes",
        "actors": "Cliente",
        "priority": "Alta",
        "description": "El portal reunirá el perfil, las mascotas, las citas y los catálogos necesarios para la autogestión del cliente.",
        "precondition": "El usuario inició sesión como Cliente y está vinculado con un registro de Clientes.",
        "functions": ["F001. Consultar GET /api/portal/summary.", "F002. Mostrar los datos del propietario.", "F003. Listar únicamente sus mascotas y sus citas.", "F004. Proveer especies, razas, niveles de riesgo y datos de la clínica."],
        "acceptance": ["CA01. La respuesta se limita al ClienteId de la sesión.", "CA02. La pantalla muestra estados y riesgo de sus citas.", "CA03. No incluye el directorio completo de clientes."],
        "exceptions": ["Usuario sin vínculo de cliente: acceso denegado o respuesta controlada."],
    },
    {
        "id": "REQ010",
        "name": "Registro de mascotas por el cliente",
        "module": "Portal de clientes",
        "actors": "Cliente",
        "priority": "Alta",
        "description": "El cliente podrá registrar mascotas en su propia cuenta con datos básicos de identificación.",
        "precondition": "Existe una sesión de Cliente y los catálogos de especie y raza están disponibles.",
        "functions": ["F001. Capturar nombre, especie, raza, sexo, peso, color, fecha de nacimiento y observaciones.", "F002. Filtrar las razas según la especie elegida.", "F003. Vincular automáticamente la mascota al cliente autenticado.", "F004. Actualizar la lista después del registro."],
        "acceptance": ["CA01. POST /api/portal/pets crea la mascota con el ClienteId de la sesión.", "CA02. El cliente no puede asignarla a otro propietario.", "CA03. Los campos obligatorios se validan."],
        "exceptions": ["Especie inexistente o datos inválidos: 400.", "Sesión sin rol Cliente: 403."],
    },
    {
        "id": "REQ011",
        "name": "Solicitud y consulta de citas por el cliente",
        "module": "Portal de clientes",
        "actors": "Cliente",
        "priority": "Alta",
        "description": "El cliente podrá solicitar una cita para una mascota propia y consultar su seguimiento.",
        "precondition": "El cliente posee al menos una mascota registrada.",
        "functions": ["F001. Seleccionar mascota, fecha, hora, motivo y síntomas.", "F002. Validar que la mascota pertenezca al cliente.", "F003. Clasificar un riesgo inicial con base en síntomas cuando corresponda.", "F004. Registrar la cita como solicitud y mostrar su estado posterior."],
        "acceptance": ["CA01. POST /api/portal/appointments registra una cita válida.", "CA02. No permite citas para mascotas ajenas.", "CA03. GET /api/portal/appointments devuelve solo citas propias."],
        "exceptions": ["Horario ocupado o inválido: rechazo con mensaje comprensible.", "Mascota no vinculada: 403 o 404."],
    },
    {
        "id": "REQ012",
        "name": "Panel operativo e información de catálogo",
        "module": "Operación",
        "actors": "Empleado y administrador",
        "priority": "Media",
        "description": "El sistema presentará un resumen operativo y las opciones reutilizadas por los formularios internos.",
        "precondition": "El usuario posee el permiso dashboard.ver.",
        "functions": ["F001. Consultar indicadores mediante GET /api/dashboard.", "F002. Consultar opciones mediante GET /api/catalog/options.", "F003. Mostrar contadores y estados relevantes.", "F004. Reutilizar clientes, mascotas, especies, razas, roles, servicios, riesgos y configuración en los formularios."],
        "acceptance": ["CA01. Los indicadores provienen de SQL Server.", "CA02. Las opciones contienen solo registros activos cuando aplica.", "CA03. El módulo se oculta sin permiso."],
        "exceptions": ["Fallo de consulta: mostrar estado de carga o mensaje controlado."],
    },
    {
        "id": "REQ013",
        "name": "Gestión de clientes",
        "module": "Clientes",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El personal autorizado podrá consultar, crear, actualizar y desactivar registros de propietarios.",
        "precondition": "El usuario posee clientes.gestionar.",
        "functions": ["F001. Listar y buscar clientes.", "F002. Registrar nombre, documento, teléfono, correo y dirección.", "F003. Actualizar datos de contacto.", "F004. Aplicar eliminación lógica cuando corresponda."],
        "acceptance": ["CA01. GET y POST /api/clients operan con autorización.", "CA02. PUT /api/clients/:id persiste cambios.", "CA03. DELETE /api/clients/:id no deja referencias inválidas."],
        "exceptions": ["Datos duplicados o inválidos: 400/409.", "Registro no encontrado: 404.", "Sin permiso: 403."],
    },
    {
        "id": "REQ014",
        "name": "Gestión interna de mascotas",
        "module": "Mascotas",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El personal podrá administrar la ficha demográfica y el vínculo de cada mascota con su propietario.",
        "precondition": "Existe un cliente y una especie válidos; el usuario posee mascotas.gestionar.",
        "functions": ["F001. Listar mascotas con propietario, especie y raza.", "F002. Crear la ficha del paciente.", "F003. Actualizar peso, identificación y observaciones.", "F004. Desactivar el registro sin borrar la trazabilidad clínica."],
        "acceptance": ["CA01. GET/POST /api/pets funcionan con permiso.", "CA02. PUT conserva relaciones válidas.", "CA03. DELETE aplica el comportamiento de baja definido."],
        "exceptions": ["Cliente, especie o raza inexistente: 400/404.", "Sin permiso: 403."],
    },
    {
        "id": "REQ015",
        "name": "Catálogos de especies y razas",
        "module": "Mascotas",
        "actors": "Administrador; consulta por personal autorizado",
        "priority": "Media",
        "description": "El sistema mantendrá catálogos normalizados para clasificar las mascotas y filtrar razas por especie.",
        "precondition": "El usuario está autenticado; las modificaciones requieren rol Administrador.",
        "functions": ["F001. Listar especies y razas.", "F002. Crear especies con nombre único.", "F003. Crear razas vinculadas con una especie.", "F004. Actualizar o desactivar catálogos sin romper expedientes existentes."],
        "acceptance": ["CA01. GET /species y /breeds está disponible a usuarios autorizados.", "CA02. Solo Administrador puede crear, actualizar o eliminar.", "CA03. No se repite una raza dentro de la misma especie."],
        "exceptions": ["Catálogo duplicado: 409.", "Referencia en uso: operación controlada.", "Rol no administrativo: 403."],
    },
    {
        "id": "REQ016",
        "name": "Gestión de agenda y disponibilidad",
        "module": "Citas",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El personal podrá registrar y actualizar citas conservando la relación entre cliente, mascota, fecha, hora y servicio.",
        "precondition": "El usuario posee citas.gestionar y existen cliente y mascota válidos.",
        "functions": ["F001. Listar la agenda y sus estados.", "F002. Crear citas internas.", "F003. Modificar fecha, hora, motivo, síntomas y datos asociados.", "F004. Impedir duplicidad de horarios activos mediante índice y validación."],
        "acceptance": ["CA01. GET/POST /api/appointments opera con permiso.", "CA02. PUT /appointments/:id actualiza una cita existente.", "CA03. Dos citas activas no ocupan la misma fecha y hora."],
        "exceptions": ["Horario ocupado: 409.", "Datos inválidos: 400.", "Cita inexistente: 404."],
    },
    {
        "id": "REQ017",
        "name": "Clasificación de triaje",
        "module": "Citas",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El sistema propondrá un nivel de riesgo a partir de síntomas y permitirá que el profesional confirme o modifique la clasificación.",
        "precondition": "Existen niveles de riesgo activos y el usuario posee citas.gestionar.",
        "functions": ["F001. Normalizar texto, acentos y signos.", "F002. Detectar palabras clave aun con errores ortográficos moderados.", "F003. Priorizar emergencias respiratorias y otros síntomas críticos.", "F004. Respetar la selección manual del profesional."],
        "acceptance": ["CA01. POST /api/triage/classify devuelve nivel, prioridad y tiempo sugerido.", "CA02. La emergencia respiratoria se clasifica como roja.", "CA03. Sin coincidencias se asigna el nivel no urgente."],
        "exceptions": ["Síntomas vacíos: clasificación no urgente o validación controlada.", "El triaje no sustituye criterio clínico."],
    },
    {
        "id": "REQ018",
        "name": "Configuración de reglas de triaje",
        "module": "Configuración",
        "actors": "Administrador",
        "priority": "Alta",
        "description": "El administrador podrá mantener nombres, prioridades, tiempos, palabras clave, color y estado de cada nivel de riesgo.",
        "precondition": "El usuario posee configuracion.gestionar.",
        "functions": ["F001. Consultar GET /api/triage/rules.", "F002. Editar reglas desde la pantalla Empresa.", "F003. Validar prioridad, tiempo, palabras clave y color.", "F004. Persistir el conjunto mediante PUT /api/triage/rules."],
        "acceptance": ["CA01. La configuración actual se carga desde SQL Server.", "CA02. Un cambio válido queda disponible para clasificaciones posteriores.", "CA03. Prioridades duplicadas o datos inválidos se rechazan."],
        "exceptions": ["Sin permiso: 403.", "Conjunto inválido: 400 y ninguna actualización parcial."],
    },
    {
        "id": "REQ019",
        "name": "Control del estado de la cita",
        "module": "Citas",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El personal actualizará el ciclo de atención de la cita con estados controlados.",
        "precondition": "La cita existe y el usuario posee citas.gestionar.",
        "functions": ["F001. Admitir Pendiente, Confirmada, En espera, En atención, Atendida, Finalizada, Cancelada y No asistió.", "F002. Cambiar el estado mediante PATCH /appointments/:id/status.", "F003. Conservar el riesgo y la trazabilidad del registro.", "F004. Reflejar el cambio en agenda, portal y reportes."],
        "acceptance": ["CA01. Solo se aceptan estados definidos por la restricción SQL.", "CA02. El cambio aparece en consultas posteriores.", "CA03. Los reportes contabilizan el nuevo estado."],
        "exceptions": ["Estado inválido: 400.", "Cita inexistente: 404.", "Sin permiso: 403."],
    },
    {
        "id": "REQ020",
        "name": "Gestión del historial clínico",
        "module": "Atención clínica",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El sistema conservará las atenciones de cada mascota, el propietario, la cita relacionada y el profesional responsable.",
        "precondition": "Existe la mascota; el usuario posee historial.gestionar.",
        "functions": ["F001. Listar registros clínicos.", "F002. Crear una atención con antecedentes, signos, diagnóstico y observaciones.", "F003. Relacionar opcionalmente una cita.", "F004. Actualizar o aplicar eliminación lógica al registro."],
        "acceptance": ["CA01. GET/POST /api/clinical-records opera con permiso.", "CA02. El historial conserva MascotaId, ClienteId y VeterinarioId.", "CA03. PUT/DELETE no afecta otros pacientes."],
        "exceptions": ["Mascota o cliente inexistente: 404.", "Datos clínicos inválidos: 400.", "Sin permiso: 403."],
    },
    {
        "id": "REQ021",
        "name": "Gestión de tratamientos",
        "module": "Atención clínica",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El personal registrará indicaciones y seguimiento de tratamientos asociados a una mascota y un profesional.",
        "precondition": "Existe la mascota y el usuario posee tratamientos.gestionar.",
        "functions": ["F001. Crear tratamientos con fechas, descripción e indicaciones.", "F002. Registrar el estado Activo, Finalizado o Suspendido.", "F003. Consultar y actualizar el seguimiento.", "F004. Aplicar baja lógica cuando corresponda."],
        "acceptance": ["CA01. GET/POST /api/treatments funciona con permiso.", "CA02. Solo se aceptan los estados definidos.", "CA03. El tratamiento queda vinculado con mascota y veterinario."],
        "exceptions": ["Estado o fechas inválidos: 400.", "Mascota inexistente: 404.", "Sin permiso: 403."],
    },
    {
        "id": "REQ022",
        "name": "Gestión de vacunas",
        "module": "Atención clínica",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El sistema registrará las vacunas aplicadas y su próxima fecha de control por mascota.",
        "precondition": "Existe la mascota y el usuario posee vacunas.gestionar.",
        "functions": ["F001. Registrar vacuna, laboratorio o lote cuando aplique.", "F002. Guardar fecha de aplicación y próxima dosis.", "F003. Relacionar al profesional responsable.", "F004. Consultar, actualizar o desactivar el registro."],
        "acceptance": ["CA01. GET/POST /api/vaccines opera con permiso.", "CA02. La próxima dosis no antecede a la aplicación.", "CA03. PUT/DELETE mantiene la trazabilidad de la mascota."],
        "exceptions": ["Fechas o datos inválidos: 400.", "Mascota inexistente: 404.", "Sin permiso: 403."],
    },
    {
        "id": "REQ023",
        "name": "Gestión de productos y servicios",
        "module": "Inventario",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El sistema mantendrá los artículos con existencia y los servicios facturables utilizados por la clínica.",
        "precondition": "El usuario posee inventario.gestionar para modificar; está autenticado para consultar servicios.",
        "functions": ["F001. Crear y actualizar productos con precio, stock, mínimo, lote y vencimiento.", "F002. Crear y actualizar servicios con descripción y precio.", "F003. Identificar productos bajo mínimo o próximos a vencer.", "F004. Desactivar registros sin borrar ventas previas."],
        "acceptance": ["CA01. /api/products y /api/services reflejan la persistencia SQL.", "CA02. Precio y stock nunca son negativos.", "CA03. Los reportes detectan mínimos y vencimientos."],
        "exceptions": ["Valores negativos: 400.", "Registro no encontrado: 404.", "Sin permiso de modificación: 403."],
    },
    {
        "id": "REQ024",
        "name": "Movimientos y consistencia de inventario",
        "module": "Inventario",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "Las entradas, salidas y ajustes modificarán existencias mediante una operación transaccional y auditable.",
        "precondition": "Existe el producto y el usuario posee inventario.gestionar.",
        "functions": ["F001. Registrar movimientos de Entrada, Salida o Ajuste.", "F002. Exigir cantidad mayor que cero.", "F003. Actualizar el stock en la misma transacción.", "F004. Asociar el movimiento al usuario responsable."],
        "acceptance": ["CA01. POST /api/inventory/movements crea el movimiento y actualiza stock.", "CA02. Una salida no produce stock negativo.", "CA03. GET devuelve la trazabilidad cronológica."],
        "exceptions": ["Stock insuficiente: 409.", "Tipo o cantidad inválidos: 400.", "Producto inexistente: 404."],
    },
    {
        "id": "REQ025",
        "name": "Registro transaccional de ventas",
        "module": "Ventas",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "El sistema registrará una venta con productos o servicios, calculará importes y conservará la integridad del inventario.",
        "precondition": "El usuario posee ventas.gestionar y existen los artículos seleccionados.",
        "functions": ["F001. Seleccionar cliente opcional, productos, servicios y cantidades.", "F002. Calcular subtotal, IVA y total.", "F003. Crear Venta y VentaDetalle en una transacción.", "F004. Descontar existencias de productos y registrar al vendedor."],
        "acceptance": ["CA01. POST /api/sales persiste encabezado y detalles.", "CA02. Los totales coinciden con cantidades y precios.", "CA03. Un fallo revierte venta, detalles y stock."],
        "exceptions": ["Stock insuficiente: 409.", "Detalle vacío o inválido: 400.", "Artículo inexistente: 404."],
    },
    {
        "id": "REQ026",
        "name": "Pago y comprobante interno",
        "module": "Ventas",
        "actors": "Empleado y administrador",
        "priority": "Alta",
        "description": "Cada venta conservará el método de pago y podrá producir un comprobante interno con datos de la clínica y detalle vendido.",
        "precondition": "La venta fue registrada correctamente.",
        "functions": ["F001. Admitir Efectivo, Débito, Crédito o Transferencia.", "F002. Registrar el pago asociado con la venta.", "F003. Consultar GET /api/sales/:id/ticket.", "F004. Mostrar clínica, número, cliente, vendedor, líneas, IVA y total para impresión."],
        "acceptance": ["CA01. El método de pago pertenece al catálogo SQL.", "CA02. El ticket coincide con la venta almacenada.", "CA03. La impresión no modifica los datos."],
        "exceptions": ["Método inválido: 400.", "Venta inexistente: 404.", "Sin permiso: 403."],
    },
    {
        "id": "REQ027",
        "name": "Reportes operativos",
        "module": "Reportería",
        "actors": "Empleado y administrador con permiso",
        "priority": "Media",
        "description": "El sistema consolidará información de citas, atención, inventario y servicios para apoyar decisiones operativas.",
        "precondition": "El usuario posee reportes.ver.",
        "functions": ["F001. Resumir citas por estado.", "F002. Mostrar servicios más solicitados.", "F003. Calcular clientes y mascotas atendidos e inasistencias.", "F004. Listar productos bajo stock y próximos a vencer."],
        "acceptance": ["CA01. GET /api/reports devuelve todas las secciones.", "CA02. Los totales corresponden con registros activos.", "CA03. El módulo no aparece sin permiso."],
        "exceptions": ["Sin información: mostrar valores cero y tablas vacías.", "Sin permiso: 403."],
    },
    {
        "id": "REQ028",
        "name": "Administración de usuarios y roles",
        "module": "Seguridad",
        "actors": "Administrador",
        "priority": "Alta",
        "description": "El administrador podrá mantener cuentas internas y asignar un rol que determine sus permisos.",
        "precondition": "El usuario posee usuarios.gestionar.",
        "functions": ["F001. Listar cuentas y su rol.", "F002. Crear usuario con nombre, identificador, correo, contraseña y RolId.", "F003. Actualizar datos, rol, estado y contraseña cuando corresponda.", "F004. Desactivar cuentas sin eliminar auditoría histórica."],
        "acceptance": ["CA01. GET/POST/PUT/DELETE /api/users exige autorización.", "CA02. Usuario y correo son únicos.", "CA03. La contraseña se almacena como hash."],
        "exceptions": ["Usuario o correo duplicado: 409.", "Rol inexistente: 400/404.", "Sin permiso: 403."],
    },
    {
        "id": "REQ029",
        "name": "Configuración de la empresa",
        "module": "Configuración",
        "actors": "Administrador",
        "priority": "Media",
        "description": "El administrador podrá mantener la información institucional utilizada en la interfaz y los comprobantes.",
        "precondition": "El usuario está autenticado; la actualización requiere configuracion.gestionar.",
        "functions": ["F001. Consultar nombre de clínica, dirección, teléfono, NIT y horario.", "F002. Actualizar los datos mediante PUT /api/config/company.", "F003. Reutilizar la configuración en opciones y comprobantes.", "F004. Validar campos obligatorios antes de persistir."],
        "acceptance": ["CA01. GET devuelve la configuración vigente.", "CA02. PUT actualiza un único registro institucional.", "CA03. El ticket refleja los datos guardados."],
        "exceptions": ["Datos inválidos: 400.", "Sin permiso de actualización: 403."],
    },
    {
        "id": "REQ030",
        "name": "Auditoría de operaciones",
        "module": "Seguridad",
        "actors": "Administrador",
        "priority": "Alta",
        "description": "El sistema registrará acciones sensibles para identificar usuario, operación, detalle, dirección IP y fecha.",
        "precondition": "La operación auditada se ejecuta y existe contexto de usuario cuando aplica.",
        "functions": ["F001. Registrar accesos y cambios de seguridad.", "F002. Registrar operaciones críticas de módulos administrativos.", "F003. Conservar usuario, acción, entidad, detalle, IP y marca temporal.", "F004. Consultar la bitácora reciente mediante GET /api/audit."],
        "acceptance": ["CA01. La bitácora se almacena en dbo.Auditoria.", "CA02. Solo Administrador puede consultarla.", "CA03. Los registros no se modifican desde la interfaz."],
        "exceptions": ["Operación anónima: UsuarioId puede ser nulo si el diseño lo permite.", "Consulta por otro rol: 403."],
    },
    {
        "id": "REQ031",
        "name": "Evaluación cuantitativa preprueba y postprueba",
        "module": "Evaluación",
        "actors": "Administrador",
        "priority": "Alta",
        "description": "El sistema almacenará mediciones comparables antes y después de la implementación y calculará indicadores de cambio.",
        "precondition": "El usuario posee evaluacion.gestionar y dispone de observaciones reales de la clínica.",
        "functions": ["F001. Registrar fase Pre o Post y fecha.", "F002. Capturar tiempos de agenda y búsqueda de expediente.", "F003. Capturar errores administrativos, citas duplicadas y satisfacción de 1 a 5.", "F004. Calcular promedios, reducciones porcentuales y variación de satisfacción."],
        "acceptance": ["CA01. POST /api/evaluation/measurements valida rangos no negativos.", "CA02. GET /measurements conserva la evidencia individual.", "CA03. GET /summary compara fases solo cuando ambas tienen datos."],
        "exceptions": ["Fase o rangos inválidos: 400.", "Sin ambas fases: resumen parcial sin afirmar impacto.", "Sin permiso: 403."],
    },
]


NON_FUNCTIONAL_REQUIREMENTS = [
    ("RNF001", "Seguridad", "Contraseñas protegidas con bcrypt y sesiones firmadas.", "Ninguna contraseña legible en SQL; cookie HttpOnly y SameSite=Strict."),
    ("RNF002", "Autorización", "Permisos verificados en la API además de la interfaz.", "Una cuenta sin permiso recibe 403 aunque invoque el endpoint directamente."),
    ("RNF003", "Confidencialidad", "La publicación utilizará HTTPS y SQL Server no se expondrá a Internet.", "Certificado válido; puerto de base de datos accesible solo desde el servidor de aplicación."),
    ("RNF004", "Integridad", "Claves foráneas, restricciones, índices y transacciones conservarán datos consistentes.", "No existen referencias huérfanas ni ventas o movimientos parciales."),
    ("RNF005", "Disponibilidad", "El sistema publicará un endpoint de salud con conexión real a VeterinariaDB.", "GET /api/health responde 200 e identifica dbMode sql-server."),
    ("RNF006", "Rendimiento", "Las consultas habituales responderán con tiempos aptos para la operación clínica.", "Postprueba de 20 muestras; conservar promedio, p95, mínimo y máximo."),
    ("RNF007", "Usabilidad", "La interfaz será orientada a tareas, legible y consistente por rol.", "No existe desbordamiento horizontal y los controles permanecen visibles en escritorio y móvil."),
    ("RNF008", "Compatibilidad", "La aplicación funcionará en navegadores modernos con diseño adaptable.", "Prueba visual en escritorio y móvil sin controles fuera del ancho."),
    ("RNF009", "Auditabilidad", "Las acciones críticas tendrán usuario, detalle, IP y fecha.", "Cada operación seleccionada produce un registro consultable en dbo.Auditoria."),
    ("RNF010", "Mantenibilidad", "Interfaz, API, servicios, repositorio y SQL estarán separados por responsabilidad.", "Los cambios de una capa se validan con lint, compilación y pruebas."),
    ("RNF011", "Validación", "Toda entrada externa será validada antes de ejecutar lógica de negocio.", "Datos fuera de esquema responden 400 con un mensaje controlado."),
    ("RNF012", "Resiliencia", "La API limitará solicitudes y ocultará detalles internos en producción.", "Rate limit activo; respuestas 500 no muestran secretos ni sentencias SQL."),
    ("RNF013", "Respaldo", "VeterinariaDB tendrá copias programadas y prueba de restauración.", "Bitácora de respaldo y restauración exitosa antes de la entrega final."),
    ("RNF014", "Trazabilidad", "Cada requisito tendrá componente, datos y evidencia de verificación asociados.", "Matriz REQ-endpoint-tabla-prueba completa y sin identificadores duplicados."),
    ("RNF015", "Accesibilidad", "Campos, botones, estados e imágenes utilizarán nombres comprensibles.", "Navegación por teclado, etiquetas de formulario y contraste revisados en los portales."),
]


USE_CASES = [
    ("CU001", "Crear cuenta de cliente", "Cliente", "REQ002", "Portal de clientes disponible; usuario y correo no registrados.", ["Selecciona Crear cuenta.", "Completa datos personales y credenciales.", "El sistema valida formato y unicidad.", "Se crean Cliente y Usuario con rol Cliente.", "El sistema confirma el registro y permite iniciar sesión."], ["Usuario repetido: se identifica el campo.", "Correo repetido: se identifica el campo.", "Datos inválidos: se conservan mensajes de validación."], "Cuenta de cliente activa y vinculada con su propietario."),
    ("CU002", "Iniciar sesión por portal", "Cliente, empleado o administrador", "REQ001, REQ003-REQ007", "Cuenta activa y acceso al portal correspondiente.", ["Ingresa usuario o correo y contraseña.", "La API valida credenciales, estado, bloqueo y rol.", "Se emite la sesión segura.", "El sistema dirige al espacio correspondiente.", "Se muestran solo módulos autorizados."], ["Portal incompatible: 403.", "Contraseña incorrecta: se incrementan intentos.", "Quinto fallo: bloqueo progresivo con tiempo informado."], "Sesión autenticada con rol y permisos vigentes."),
    ("CU003", "Restablecer contraseña", "Usuario", "REQ008", "Correo registrado y SMTP disponible.", ["Selecciona Olvidé mi clave.", "Indica usuario o correo.", "El sistema responde de forma genérica.", "El usuario abre el enlace temporal.", "Define y confirma una contraseña nueva.", "El sistema consume el token e invalida sesiones anteriores."], ["Cuenta desconocida: misma respuesta pública sin enviar correo.", "Token vencido o usado: se rechaza.", "Contraseñas diferentes: validación local y de API."], "Contraseña actualizada y token inutilizable."),
    ("CU004", "Registrar mascota propia", "Cliente", "REQ009, REQ010", "Cliente autenticado y catálogos disponibles.", ["Abre Mi portal.", "Completa la ficha de mascota.", "Selecciona especie y raza filtrada.", "El sistema vincula la mascota al cliente de la sesión.", "La lista se actualiza."], ["Raza no correspondiente: rechazo.", "Datos obligatorios incompletos: validación."], "Mascota disponible para solicitar citas."),
    ("CU005", "Solicitar cita", "Cliente", "REQ011, REQ017", "Cliente autenticado con una mascota propia.", ["Selecciona mascota, fecha y hora.", "Describe motivo y síntomas.", "El sistema valida propiedad y disponibilidad.", "Se calcula el riesgo inicial cuando aplica.", "La solicitud se almacena y aparece en Mis citas."], ["Horario ocupado: se solicita otra hora.", "Mascota ajena: acceso denegado.", "Síntomas sin coincidencia: nivel no urgente."], "Cita pendiente disponible para gestión interna."),
    ("CU006", "Administrar clientes y mascotas", "Empleado o administrador", "REQ013-REQ015", "Usuario con permisos de clientes y mascotas.", ["Consulta el directorio.", "Crea o actualiza al propietario.", "Registra o actualiza la mascota.", "Asigna especie y raza válidas.", "El sistema conserva relaciones y muestra los cambios."], ["Datos repetidos: conflicto controlado.", "Referencia inexistente: rechazo.", "Baja con historial: eliminación lógica."], "Fichas administrativas y del paciente actualizadas."),
    ("CU007", "Gestionar agenda y triaje", "Empleado o administrador", "REQ016-REQ019", "Usuario con citas.gestionar y cita existente o datos para crearla.", ["Consulta la agenda.", "Crea o modifica fecha, hora y motivo.", "Clasifica síntomas o elige riesgo manual.", "Actualiza el estado de atención.", "El sistema refleja el cambio en agenda y reportes."], ["Horario duplicado: 409.", "Nivel o estado inválido: 400.", "El profesional puede sustituir la sugerencia automática."], "Cita trazable con horario, riesgo y estado vigentes."),
    ("CU008", "Registrar atención clínica", "Empleado o administrador", "REQ020", "Mascota identificada y usuario con historial.gestionar.", ["Selecciona la mascota y, si existe, la cita.", "Registra antecedentes, signos y diagnóstico.", "Añade observaciones clínicas.", "El sistema vincula cliente, mascota y profesional.", "La atención queda en el historial."], ["Mascota o cita inexistente: rechazo.", "Información obligatoria incompleta: validación."], "Nuevo registro clínico disponible para continuidad asistencial."),
    ("CU009", "Registrar tratamiento o vacuna", "Empleado o administrador", "REQ021, REQ022", "Mascota existente y permisos clínicos.", ["Selecciona la mascota.", "Elige tratamiento o vacuna.", "Completa indicaciones, estado o fechas.", "El sistema registra al profesional.", "La información aparece en el módulo clínico."], ["Estado o fechas inválidos: rechazo.", "Registro duplicado evidente: revisión del usuario."], "Seguimiento terapéutico o vacunal trazable."),
    ("CU010", "Actualizar inventario", "Empleado o administrador", "REQ023, REQ024", "Producto existente y permiso inventario.gestionar.", ["Selecciona producto y tipo de movimiento.", "Indica cantidad y motivo.", "El sistema valida existencias.", "Registra el movimiento y actualiza stock en una transacción.", "Los reportes reflejan el nuevo saldo."], ["Salida superior al stock: 409.", "Cantidad no positiva: 400."], "Existencia actualizada con movimiento auditable."),
    ("CU011", "Registrar venta y emitir ticket", "Empleado o administrador", "REQ025, REQ026", "Artículos disponibles y permiso ventas.gestionar.", ["Agrega productos o servicios.", "Indica cantidades, cliente y método de pago.", "El sistema calcula subtotal, IVA y total.", "Confirma la transacción y actualiza inventario.", "Consulta e imprime el ticket interno."], ["Stock insuficiente: transacción revertida.", "Detalle vacío o método inválido: rechazo."], "Venta, detalles, pago y existencias consistentes."),
    ("CU012", "Administrar seguridad y configuración", "Administrador", "REQ018, REQ028-REQ030", "Administrador autenticado.", ["Consulta usuarios, empresa, reglas de riesgo y auditoría.", "Crea o modifica cuentas y roles.", "Actualiza datos institucionales o reglas.", "El sistema valida y persiste los cambios.", "Revisa la bitácora generada."], ["Usuario o correo duplicado: 409.", "Prioridad de riesgo repetida: rechazo.", "Otro rol intenta acceder: 403."], "Configuración vigente y acciones sensibles auditadas."),
    ("CU013", "Consultar reportes y evaluar impacto", "Administrador o usuario autorizado", "REQ027, REQ031", "Existen datos operativos; para impacto completo existen fases Pre y Post.", ["Abre Reportes o Evaluación.", "Consulta indicadores operativos.", "Registra mediciones reales por fase.", "El sistema calcula promedios y variaciones.", "Se conserva la evidencia para anexos y conclusiones."], ["Sin registros: valores vacíos o cero.", "Sin ambas fases: no se afirma impacto.", "Valor fuera de rango: 400."], "Indicadores consultables y evidencia cuantitativa preservada."),
]


def image_font(size: int, bold: bool = False):
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


def draw_centered_text(draw, box, value, size=34, bold=False, fill="#17212B", spacing=6):
    left, top, right, bottom = box
    current = size
    while current >= 22:
        fnt = image_font(current, bold)
        bounds = draw.multiline_textbbox((0, 0), value, font=fnt, spacing=spacing, align="center")
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        if width <= (right - left - 28) and height <= (bottom - top - 20):
            break
        current -= 1
    draw.multiline_text(
        ((left + right - width) / 2, (top + bottom - height) / 2),
        value,
        font=fnt,
        fill=fill,
        spacing=spacing,
        align="center",
    )


def draw_box(draw, box, text, fill="#F4F6F7", outline="#2F4858"):
    draw.rounded_rectangle(box, radius=12, fill=fill, outline=outline, width=4)
    draw_centered_text(draw, box, text, size=34, bold=True)


def draw_arrow(draw, start, end, color="#2F4858", width=5):
    draw.line([start, end], fill=color, width=width)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    length = 22
    spread = 0.55
    points = [
        end,
        (
            end[0] - length * math.cos(angle - spread),
            end[1] - length * math.sin(angle - spread),
        ),
        (
            end[0] - length * math.cos(angle + spread),
            end[1] - length * math.sin(angle + spread),
        ),
    ]
    draw.polygon(points, fill=color)


def create_data_model_diagram():
    image = Image.new("RGB", (1800, 940), "white")
    draw = ImageDraw.Draw(image)

    top_boxes = [
        ((60, 130, 385, 280), "Roles y\npermisos"),
        ((510, 130, 835, 280), "Usuarios"),
        ((960, 130, 1285, 280), "Clientes y\nmascotas"),
        ((1410, 130, 1735, 280), "Citas y\ntriaje"),
    ]
    bottom_boxes = [
        ((60, 520, 385, 670), "Configuración\ny auditoría"),
        ((510, 520, 835, 670), "Inventario"),
        ((960, 520, 1285, 670), "Ventas y\npagos"),
        ((1410, 520, 1735, 670), "Atención\nclínica"),
    ]
    for box, label in top_boxes + bottom_boxes:
        draw_box(draw, box, label)

    draw_arrow(draw, (385, 205), (510, 205))
    draw_arrow(draw, (835, 205), (960, 205))
    draw_arrow(draw, (1285, 205), (1410, 205))
    draw_arrow(draw, (223, 280), (223, 520))
    draw_arrow(draw, (673, 670), (960, 595))
    draw_arrow(draw, (1123, 280), (1572, 520))
    draw_arrow(draw, (1572, 280), (1572, 520))

    draw_centered_text(
        draw,
        (110, 760, 1690, 880),
        "Relaciones lógicas entre los grupos principales de datos del sistema",
        size=32,
        bold=False,
        fill="#333333",
    )
    image.save(DATA_MODEL, dpi=(300, 300))


def draw_entity(draw, box, title, fields):
    left, top, right, bottom = box
    draw.rounded_rectangle(box, radius=8, fill="#FFFFFF", outline="#254C5B", width=4)
    draw.rounded_rectangle((left, top, right, top + 54), radius=8, fill="#DCEAED", outline="#254C5B", width=4)
    draw.rectangle((left, top + 46, right, top + 56), fill="#DCEAED")
    draw_centered_text(draw, (left + 8, top + 3, right - 8, top + 52), title, size=28, bold=True, fill="#173C49")
    field_font = image_font(20)
    y = top + 68
    for field in fields:
        draw.text((left + 16, y), field, font=field_font, fill="#263238")
        y += 28


def draw_cardinality(draw, point, value, offset):
    x = point[0] + offset[0]
    y = point[1] + offset[1]
    font = image_font(21, bold=True)
    bounds = draw.textbbox((0, 0), value, font=font)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    draw.rounded_rectangle((x - 6, y - 4, x + width + 6, y + height + 4), radius=4, fill="white")
    draw.text((x, y), value, font=font, fill="#173C49")


def draw_relationship(draw, points, first_card="1", last_card="0..*", first_offset=None, last_offset=None):
    draw.line(points, fill="#426A78", width=5, joint="curve")
    first = points[0]
    second = points[1]
    last = points[-1]
    before_last = points[-2]
    if first_offset is None:
        first_offset = (8 if second[0] >= first[0] else -46, 8 if second[1] >= first[1] else -32)
    if last_offset is None:
        last_offset = (-52 if last[0] >= before_last[0] else 8, -32 if last[1] >= before_last[1] else 8)
    draw_cardinality(draw, first, first_card, first_offset)
    draw_cardinality(draw, last, last_card, last_offset)


def create_erd(path, title, nodes, relationships, subtitle):
    image = Image.new("RGB", (2100, 1250), "white")
    draw = ImageDraw.Draw(image)
    draw_centered_text(draw, (80, 28, 2020, 105), title, size=38, bold=True, fill="#173C49")

    for relationship in relationships:
        draw_relationship(draw, *relationship)
    for name, definition in nodes.items():
        box, fields = definition
        draw_entity(draw, box, name, fields)

    draw_centered_text(draw, (120, 1135, 1980, 1215), subtitle, size=25, fill="#333333")
    image.save(path, dpi=(300, 300))


def create_database_diagrams():
    security_nodes = {
        "Roles": ((70, 150, 430, 330), ["PK RolId", "Nombre", "Activo"]),
        "Usuarios": ((600, 150, 960, 386), ["PK UsuarioId", "FK RolId", "FK ClienteId?", "Usuario / Email", "Seguridad"]),
        "Clientes": ((1130, 150, 1490, 358), ["PK ClienteId", "Nombre", "Contacto", "Activo"]),
        "Mascotas": ((1660, 150, 2020, 414), ["PK MascotaId", "FK ClienteId", "FK EspecieId", "FK RazaId?", "Ficha básica"]),
        "Permisos": ((70, 720, 430, 900), ["PK PermisoId", "Nombre", "Descripción"]),
        "RolPermiso": ((600, 720, 960, 900), ["PK/FK RolId", "PK/FK PermisoId", "Asignación"]),
        "Especies": ((1130, 720, 1490, 900), ["PK EspecieId", "Nombre", "Activo"]),
        "Razas": ((1660, 720, 2020, 928), ["PK RazaId", "FK EspecieId", "Nombre", "Activo"]),
    }
    security_rel = [
        ([(430, 240), (600, 240)], "1", "0..*"),
        ([(250, 330), (250, 610), (700, 610), (700, 720)], "1", "0..*"),
        ([(430, 810), (600, 810)], "1", "0..*"),
        ([(960, 250), (1130, 250)], "0..*", "0..1"),
        ([(1490, 254), (1660, 254)], "1", "0..*"),
        ([(1490, 810), (1660, 810)], "1", "0..*"),
        ([(1310, 720), (1310, 560), (1840, 560), (1840, 414)], "1", "0..*"),
        ([(1840, 720), (1840, 414)], "0..1", "0..*"),
    ]
    create_erd(
        ERD_SECURITY,
        "Modelo relacional: seguridad, clientes y mascotas",
        security_nodes,
        security_rel,
        "Las líneas expresan cardinalidad; no representan secuencia ni flujo de trabajo.",
    )

    appointment_nodes = {
        "Clientes": ((80, 170, 450, 378), ["PK ClienteId", "Nombre", "Contacto", "Activo"]),
        "Mascotas": ((620, 170, 990, 434), ["PK MascotaId", "FK ClienteId", "FK EspecieId", "FK RazaId?", "Ficha básica"]),
        "Citas": ((1160, 140, 1580, 488), ["PK CitaId", "FK ClienteId", "FK MascotaId", "FK NivelRiesgoId", "FK UsuarioRegistroId", "FK RiesgoModificadoPorId?", "Fecha / hora / estado"]),
        "NivelesRiesgo": ((1730, 170, 2050, 434), ["PK NivelRiesgoId", "Nombre / prioridad", "Palabras clave", "Tiempo / color", "Activo"]),
        "Usuarios": ((620, 760, 990, 996), ["PK UsuarioId", "FK RolId", "Usuario / Email", "Estado / seguridad"]),
    }
    appointment_rel = [
        ([(450, 270), (620, 270)], "1", "0..*"),
        ([(265, 378), (265, 610), (1250, 610), (1250, 488)], "1", "0..*"),
        ([(990, 300), (1160, 300)], "1", "0..*"),
        ([(1730, 300), (1580, 300)], "1", "0..*"),
        ([(805, 760), (805, 650), (1430, 650), (1430, 488)], "1", "0..*"),
    ]
    create_erd(
        ERD_APPOINTMENTS,
        "Modelo relacional: agenda y triaje",
        appointment_nodes,
        appointment_rel,
        "Citas concentra disponibilidad, estado, riesgo y responsables de registro o modificación.",
    )

    clinical_nodes = {
        "Clientes": ((70, 170, 430, 378), ["PK ClienteId", "Nombre", "Contacto", "Activo"]),
        "Mascotas": ((570, 150, 930, 414), ["PK MascotaId", "FK ClienteId", "FK EspecieId", "FK RazaId?", "Paciente"]),
        "Citas": ((1070, 170, 1430, 406), ["PK CitaId", "FK ClienteId", "FK MascotaId", "Fecha / estado"]),
        "Usuarios": ((1570, 170, 1930, 406), ["PK UsuarioId", "FK RolId", "Profesional", "Estado"]),
        "HistorialClinico": ((770, 720, 1330, 1068), ["PK HistorialId", "FK MascotaId", "FK ClienteId", "FK CitaId?", "FK VeterinarioId", "Diagnóstico / notas"]),
    }
    clinical_rel = [
        ([(430, 260), (570, 260)], "1", "0..*"),
        ([(930, 280), (1070, 280)], "1", "0..*"),
        ([(250, 378), (250, 590), (850, 590), (850, 720)], "1", "0..*"),
        ([(750, 414), (750, 620), (970, 620), (970, 720)], "1", "0..*"),
        ([(1250, 406), (1250, 720)], "0..1", "0..*"),
        ([(1750, 406), (1750, 620), (1230, 620), (1230, 720)], "1", "0..*"),
    ]
    create_erd(
        ERD_CLINICAL,
        "Modelo relacional: atención clínica",
        clinical_nodes,
        clinical_rel,
        "El historial conserva cliente, paciente y profesional; la referencia a una cita es opcional.",
    )

    care_nodes = {
        "Mascotas": ((180, 180, 660, 444), ["PK MascotaId", "FK ClienteId", "FK EspecieId", "FK RazaId?", "Paciente"]),
        "Usuarios": ((1440, 180, 1920, 416), ["PK UsuarioId", "FK RolId", "Profesional", "Estado"]),
        "Tratamientos": ((180, 760, 660, 1052), ["PK TratamientoId", "FK MascotaId", "FK VeterinarioId", "Fechas / estado", "Indicaciones"]),
        "Vacunas": ((1440, 760, 1920, 1024), ["PK VacunaId", "FK MascotaId", "FK VeterinarioId", "Aplicación / próxima", "Lote"]),
    }
    care_rel = [
        ([(420, 444), (420, 760)], "1", "0..*"),
        ([(660, 340), (900, 340), (900, 580), (1560, 580), (1560, 760)], "1", "0..*"),
        ([(1680, 416), (1680, 760)], "1", "0..*"),
        ([(1440, 300), (1200, 300), (1200, 650), (540, 650), (540, 760)], "1", "0..*"),
    ]
    create_erd(
        ERD_CARE,
        "Modelo relacional: tratamientos y vacunas",
        care_nodes,
        care_rel,
        "Cada tratamiento o vacuna pertenece a una mascota y registra al profesional responsable.",
    )

    sales_nodes = {
        "Productos": ((60, 150, 410, 414), ["PK ProductoId", "Precio / stock", "Lote / vencimiento", "Stock mínimo", "Activo"]),
        "InventarioMovimientos": ((550, 150, 1010, 414), ["PK MovimientoId", "FK ProductoId", "FK UsuarioId", "Tipo / cantidad", "Fecha / motivo"]),
        "Usuarios": ((1160, 150, 1510, 386), ["PK UsuarioId", "FK RolId", "Cuenta", "Estado"]),
        "Clientes": ((1690, 150, 2040, 358), ["PK ClienteId", "Nombre", "Contacto", "Activo"]),
        "Servicios": ((60, 760, 410, 940), ["PK ServicioId", "Nombre", "Precio"]),
        "VentaDetalle": ((550, 720, 1010, 1012), ["PK VentaDetalleId", "FK VentaId", "FK ProductoId?", "FK ServicioId?", "Cantidad / precio / total"]),
        "Ventas": ((1160, 720, 1510, 984), ["PK VentaId", "FK ClienteId?", "FK UsuarioId", "Subtotal / IVA / total", "Método de pago"]),
        "Pagos": ((1690, 760, 2040, 968), ["PK PagoId", "FK VentaId", "Monto", "Fecha"]),
    }
    sales_rel = [
        ([(410, 280), (550, 280)], "1", "0..*"),
        ([(1335, 386), (1335, 540), (800, 540), (800, 414)], "1", "0..*"),
        ([(235, 414), (235, 610), (700, 610), (700, 720)], "0..1", "0..*"),
        ([(410, 850), (550, 850)], "0..1", "0..*"),
        ([(1010, 860), (1160, 860)], "0..*", "1"),
        ([(1335, 386), (1335, 720)], "1", "0..*"),
        ([(1865, 358), (1865, 620), (1450, 620), (1450, 720)], "0..1", "0..*"),
        ([(1510, 850), (1690, 850)], "1", "0..*"),
    ]
    create_erd(
        ERD_SALES,
        "Modelo relacional: inventario, ventas y pagos",
        sales_nodes,
        sales_rel,
        "Una venta reúne detalles de productos o servicios; los movimientos documentan cambios de existencias.",
    )


def create_database_inventory():
    image = Image.new("RGB", (2100, 1320), "white")
    draw = ImageDraw.Draw(image)
    draw_centered_text(draw, (80, 30, 2020, 110), "Inventario de tablas de VeterinariaDB", size=40, bold=True, fill="#173C49")
    groups = [
        ("Seguridad y acceso", ["Roles", "Permisos", "RolPermiso", "Usuarios", "PasswordResetTokens", "Auditoria"]),
        ("Clientes y pacientes", ["Clientes", "Especies", "Razas", "Mascotas", "Notificaciones"]),
        ("Agenda y clínica", ["NivelesRiesgo", "Citas", "HistorialClinico", "Tratamientos", "Vacunas"]),
        ("Inventario y ventas", ["Productos", "Servicios", "InventarioMovimientos", "Ventas", "VentaDetalle", "Pagos"]),
        ("Empresa y evaluación", ["ConfiguracionEmpresa", "HorariosClinica", "MedicionesImpacto"]),
    ]
    boxes = [
        (80, 170, 680, 575),
        (750, 170, 1350, 575),
        (1420, 170, 2020, 575),
        (280, 690, 940, 1120),
        (1160, 690, 1820, 1040),
    ]
    for (title, tables), box in zip(groups, boxes):
        left, top, right, bottom = box
        draw.rounded_rectangle(box, radius=10, fill="#F7F9FA", outline="#254C5B", width=4)
        draw.rectangle((left, top, right, top + 62), fill="#DCEAED")
        draw_centered_text(draw, (left + 10, top + 4, right - 10, top + 58), title, size=29, bold=True, fill="#173C49")
        y = top + 85
        for index, table_name in enumerate(tables, start=1):
            draw.text((left + 34, y), f"{index:02d}. dbo.{table_name}", font=image_font(24), fill="#263238")
            y += 48
    draw_centered_text(draw, (100, 1190, 2000, 1270), "Total: 25 tablas físicas identificadas en los scripts de creación y endurecimiento.", size=27, bold=True, fill="#333333")
    image.save(DB_INVENTORY, dpi=(300, 300))


def draw_actor(draw, center_x, top_y, label):
    draw.ellipse((center_x - 32, top_y, center_x + 32, top_y + 64), outline="#444444", width=5)
    draw.line((center_x, top_y + 64, center_x, top_y + 190), fill="#444444", width=5)
    draw.line((center_x - 72, top_y + 105, center_x + 72, top_y + 105), fill="#444444", width=5)
    draw.line((center_x, top_y + 190, center_x - 70, top_y + 280), fill="#444444", width=5)
    draw.line((center_x, top_y + 190, center_x + 70, top_y + 280), fill="#444444", width=5)
    draw_centered_text(draw, (center_x - 140, top_y + 292, center_x + 140, top_y + 350), label, size=28, bold=True, fill="#333333")


def draw_dashed_arrow(draw, start, end, label, color="#426A78", width=4):
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    distance = max(math.hypot(dx, dy), 1)
    ux, uy = dx / distance, dy / distance
    cursor = 0
    while cursor < distance - 24:
        segment_end = min(cursor + 22, distance - 24)
        draw.line(
            (
                start[0] + ux * cursor,
                start[1] + uy * cursor,
                start[0] + ux * segment_end,
                start[1] + uy * segment_end,
            ),
            fill=color,
            width=width,
        )
        cursor += 36
    angle = math.atan2(dy, dx)
    arrow_length = 24
    spread = 0.52
    draw.polygon(
        [
            end,
            (
                end[0] - arrow_length * math.cos(angle - spread),
                end[1] - arrow_length * math.sin(angle - spread),
            ),
            (
                end[0] - arrow_length * math.cos(angle + spread),
                end[1] - arrow_length * math.sin(angle + spread),
            ),
        ],
        fill=color,
    )
    midpoint = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
    font = image_font(22, bold=True)
    bounds = draw.textbbox((0, 0), label, font=font)
    label_width = bounds[2] - bounds[0]
    label_height = bounds[3] - bounds[1]
    x = midpoint[0] - label_width / 2
    y = midpoint[1] - label_height - 12
    draw.rounded_rectangle((x - 8, y - 5, x + label_width + 8, y + label_height + 5), radius=4, fill="white")
    draw.text((x, y), label, font=font, fill="#263238")


def compact_use_case_label(value, width=24):
    text = re.sub(r"\s+", " ", value.strip().rstrip("."))
    for prefix in (
        "El sistema ",
        "La API ",
        "El usuario ",
        "El cliente ",
        "El administrador ",
        "Selecciona ",
    ):
        if text.startswith(prefix):
            text = text[len(prefix):]
            break
    if len(text) > 72:
        text = text[:69].rsplit(" ", 1)[0] + "..."
    return textwrap.fill(text[:1].upper() + text[1:], width=width)


def individual_use_case_path(case_id):
    return UC_DETAIL_DIR / f"{case_id.lower()}_diagrama.png"


def create_individual_use_case_diagram(case):
    case_id, case_name, actor, _, _, main_flow, alternatives, _ = case
    image = Image.new("RGB", (2100, 1420), "white")
    draw = ImageDraw.Draw(image)
    draw_centered_text(
        draw,
        (80, 25, 2020, 100),
        f"Sistema web El Ganadero - {case_id}",
        size=38,
        bold=True,
        fill="#333333",
    )

    boundary = (360, 130, 2030, 1330)
    draw.rectangle(boundary, outline="#777777", width=4)
    draw_actor(draw, 180, 500, textwrap.fill(actor, width=18))

    main_box = (440, 530, 940, 790)
    draw.line((250, 640, main_box[0], 640), fill="#555555", width=4)
    draw.ellipse(main_box, fill="#347DCB", outline="#2A64A2", width=5)
    draw_centered_text(
        draw,
        (main_box[0] + 22, main_box[1] + 18, main_box[2] - 22, main_box[3] - 18),
        textwrap.fill(f"{case_id}: {case_name}", width=23),
        size=30,
        bold=True,
        fill="#FFFFFF",
    )

    include_boxes = [
        (1080, 220, 1570, 430),
        (1080, 535, 1570, 745),
        (1080, 850, 1570, 1060),
    ]
    include_labels = [compact_use_case_label(step) for step in main_flow[:3]]
    for box, label in zip(include_boxes, include_labels):
        draw.ellipse(box, fill="#347DCB", outline="#2A64A2", width=4)
        draw_centered_text(draw, (box[0] + 18, box[1] + 15, box[2] - 18, box[3] - 15), label, size=27, fill="#FFFFFF")
        draw_dashed_arrow(draw, (main_box[2], 650), (box[0], (box[1] + box[3]) / 2), "<<include>>", color="#555555")

    exception_boxes = [
        (1680, 385, 1990, 610),
        (1680, 780, 1990, 1005),
    ]
    exception_labels = [compact_use_case_label(value, width=18) for value in alternatives[:2]]
    for index, (box, label) in enumerate(zip(exception_boxes, exception_labels)):
        draw.ellipse(box, fill="#347DCB", outline="#2A64A2", width=4)
        draw_centered_text(draw, (box[0] + 16, box[1] + 14, box[2] - 16, box[3] - 14), label, size=24, fill="#FFFFFF")
        target = include_boxes[min(index + 1, len(include_boxes) - 1)]
        draw_dashed_arrow(
            draw,
            (box[0], (box[1] + box[3]) / 2),
            (target[2], (target[1] + target[3]) / 2),
            "<<extend>>",
            color="#555555",
        )
    image.save(individual_use_case_path(case_id), dpi=(300, 300))


def create_use_case_diagram(path, actor, title, cases):
    image = Image.new("RGB", (2100, 1420), "white")
    draw = ImageDraw.Draw(image)
    draw_centered_text(draw, (80, 25, 2020, 100), title, size=40, bold=True, fill="#333333")
    draw_actor(draw, 250, 470, actor)
    boundary = (500, 130, 2030, 1325)
    draw.rectangle(boundary, outline="#777777", width=4)
    draw_centered_text(draw, (540, 145, 1990, 205), "Sistema web El Ganadero", size=30, bold=True, fill="#333333")

    columns = [850, 1590]
    rows = [310, 530, 750, 970, 1190]
    ellipses = []
    for index, case in enumerate(cases):
        col = columns[index % 2]
        row = rows[index // 2]
        box = (col - 285, row - 72, col + 285, row + 72)
        ellipses.append((box, case))
        draw.line((330, 620, box[0], row), fill="#555555", width=3)
    for box, case in ellipses:
        draw.ellipse(box, fill="#347DCB", outline="#2A64A2", width=4)
        draw_centered_text(draw, (box[0] + 18, box[1] + 10, box[2] - 18, box[3] - 10), case, size=27, bold=True, fill="#FFFFFF")
    image.save(path, dpi=(300, 300))


def create_use_case_diagrams():
    UC_DETAIL_DIR.mkdir(parents=True, exist_ok=True)
    create_use_case_diagram(
        UC_CLIENT,
        "Cliente",
        "Casos de uso del portal de clientes",
        ["Crear cuenta", "Iniciar sesión", "Restablecer contraseña", "Consultar perfil", "Registrar mascota", "Solicitar cita", "Consultar mis mascotas", "Consultar estado de citas"],
    )
    create_use_case_diagram(
        UC_EMPLOYEE,
        "Empleado",
        "Casos de uso del personal",
        ["Iniciar sesión", "Consultar dashboard", "Gestionar clientes", "Gestionar mascotas", "Gestionar agenda", "Clasificar triaje", "Registrar atención", "Tratamientos y vacunas", "Gestionar inventario", "Registrar venta y ticket"],
    )
    create_use_case_diagram(
        UC_ADMIN,
        "Administrador",
        "Casos de uso administrativos",
        ["Iniciar sesión", "Gestionar usuarios", "Configurar empresa", "Configurar triaje", "Gestionar catálogos", "Consultar auditoría", "Consultar reportes", "Registrar evaluación", "Supervisar módulos", "Revisar indicadores"],
    )
    for case in USE_CASES:
        create_individual_use_case_diagram(case)


def create_architecture_diagram():
    image = Image.new("RGB", (1800, 1050), "white")
    draw = ImageDraw.Draw(image)

    portal_boxes = [
        ((80, 70, 520, 190), "Portal de clientes"),
        ((680, 70, 1120, 190), "Portal de empleados"),
        ((1280, 70, 1720, 190), "Portal administrativo"),
    ]
    for box, label in portal_boxes:
        draw_box(draw, box, label, fill="#EEF3F6")

    draw_box(draw, (360, 310, 1140, 450), "Interfaz web - React y Vite")
    draw_box(draw, (360, 560, 1140, 720), "API REST - Node.js y Express")
    draw_box(draw, (360, 830, 1140, 970), "Microsoft SQL Server - VeterinariaDB")
    draw_box(
        draw,
        (1280, 330, 1720, 790),
        "Seguridad transversal\n\nRoles y permisos\nValidación de entradas\nSesión segura\nAuditoría y límites",
        fill="#F7F7F7",
    )

    for x in (300, 900, 1500):
        draw_arrow(draw, (x, 190), (750, 310))
    draw_arrow(draw, (750, 450), (750, 560))
    draw_arrow(draw, (750, 720), (750, 830))
    draw_arrow(draw, (1280, 560), (1140, 640))

    draw_centered_text(draw, (40, 455, 300, 625), "HTTPS", size=32, bold=True)
    image.save(ARCHITECTURE, dpi=(300, 300))


def extract_gantt():
    with ZipFile(SOURCE) as package:
        GANTT.write_bytes(package.read("word/media/image7.png"))


def set_run_font(run, size=12, bold=None, italic=None):
    run.font.name = "Times New Roman"
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    for attr in ("ascii", "hAnsi", "eastAsia", "cs"):
        rfonts.set(qn(f"w:{attr}"), "Times New Roman")
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def set_keep(paragraph, keep_next=False, keep_together=False):
    paragraph.paragraph_format.keep_with_next = keep_next
    paragraph.paragraph_format.keep_together = keep_together
    ppr = paragraph._p.get_or_add_pPr()
    if ppr.find(qn("w:widowControl")) is None:
        ppr.append(OxmlElement("w:widowControl"))


def format_body(paragraph, first_line=True):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    pf = paragraph.paragraph_format
    pf.line_spacing = 2
    pf.space_before = Pt(0)
    pf.space_after = Pt(8)
    pf.first_line_indent = Inches(0.5) if first_line else Inches(0)
    set_keep(paragraph)


def format_heading(paragraph, level):
    pf = paragraph.paragraph_format
    pf.space_before = Pt(12)
    pf.space_after = Pt(8)
    pf.line_spacing = 1
    pf.first_line_indent = Inches(0)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if level == 1 else WD_ALIGN_PARAGRAPH.LEFT
    set_keep(paragraph, keep_next=True, keep_together=True)
    for run in paragraph.runs:
        set_run_font(run, 12, bold=True, italic=(level == 3))


def add_field(paragraph, instruction, display_text, bold=False, italic=False, size=12):
    begin_run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    begin.set(qn("w:dirty"), "true")
    begin_run._r.append(begin)

    instruction_run = paragraph.add_run()
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {instruction} "
    instruction_run._r.append(instr)

    separate_run = paragraph.add_run()
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    separate_run._r.append(separate)

    result_run = paragraph.add_run(display_text)

    end_run = paragraph.add_run()
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    end_run._r.append(end)

    for run in (begin_run, instruction_run, separate_run, result_run, end_run):
        set_run_font(run, size=size, bold=bold, italic=italic)
    return result_run


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tcpr = cell._tc.get_or_add_tcPr()
    tc_mar = tcpr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tcpr.append(tc_mar)
    for edge, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_cell_border(cell, edge, value="single", size=8, color="000000"):
    tcpr = cell._tc.get_or_add_tcPr()
    borders = tcpr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tcpr.append(borders)
    border = borders.find(qn(f"w:{edge}"))
    if border is None:
        border = OxmlElement(f"w:{edge}")
        borders.append(border)
    border.set(qn("w:val"), value)
    if value != "nil":
        border.set(qn("w:sz"), str(size))
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), color)


def set_table_borders(table):
    tblpr = table._tbl.tblPr
    borders = tblpr.first_child_found_in("w:tblBorders")
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tblpr.append(borders)
    # Sandoval presents the methodological matrices as complete, compact grids.
    # Keeping every edge explicit also prevents isolated horizontal rules after merges.
    settings = {
        "top": ("single", 8),
        "bottom": ("single", 8),
        "left": ("single", 8),
        "right": ("single", 8),
        "insideH": ("single", 6),
        "insideV": ("single", 6),
    }
    for edge, (value, size) in settings.items():
        node = borders.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            borders.append(node)
        node.set(qn("w:val"), value)
        if value != "nil":
            node.set(qn("w:sz"), str(size))
            node.set(qn("w:space"), "0")
            node.set(qn("w:color"), "000000")


def set_table_geometry(table, widths):
    width_twips = [round(width * 1440) for width in widths]
    scale = TABLE_WIDTH_TWIPS / sum(width_twips)
    width_twips = [round(value * scale) for value in width_twips]
    width_twips[-1] += TABLE_WIDTH_TWIPS - sum(width_twips)

    tblpr = table._tbl.tblPr
    tblw = tblpr.first_child_found_in("w:tblW")
    tblw.set(qn("w:type"), "dxa")
    tblw.set(qn("w:w"), str(TABLE_WIDTH_TWIPS))

    tblind = tblpr.first_child_found_in("w:tblInd")
    if tblind is None:
        tblind = OxmlElement("w:tblInd")
        tblpr.append(tblind)
    tblind.set(qn("w:type"), "dxa")
    tblind.set(qn("w:w"), str(TABLE_INDENT_TWIPS))

    layout = tblpr.first_child_found_in("w:tblLayout")
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tblpr.append(layout)
    layout.set(qn("w:type"), "fixed")

    grid = table._tbl.tblGrid
    for node in list(grid):
        grid.remove(node)
    for value in width_twips:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(value))
        grid.append(col)

    for row in table.rows:
        for cell, value in zip(row.cells, width_twips):
            tcpr = cell._tc.get_or_add_tcPr()
            tcw = tcpr.first_child_found_in("w:tcW")
            tcw.set(qn("w:type"), "dxa")
            tcw.set(qn("w:w"), str(value))


def make_header_repeat(row):
    trpr = row._tr.get_or_add_trPr()
    if trpr.find(qn("w:tblHeader")) is None:
        trpr.append(OxmlElement("w:tblHeader"))


def mark_fields_dirty(document):
    for begin in document.element.xpath('.//w:fldChar[@w:fldCharType="begin"]'):
        begin.set(qn("w:dirty"), "true")
    settings = document.settings.element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")


def build_document():
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    copy2(SOURCE, OUTPUT)
    extract_gantt()
    create_database_diagrams()
    create_database_inventory()
    create_use_case_diagrams()
    create_architecture_diagram()

    document = Document(OUTPUT)
    start = next(p for p in document.paragraphs if p.text.strip().startswith("Capítulo III"))
    anchor = next(p for p in document.paragraphs if p.text.strip() == "Anexos")
    body = document.element.body
    deleting = False
    for child in list(body):
        if child is start._p:
            deleting = True
        if child is anchor._p:
            break
        if deleting:
            body.remove(child)

    counters = {"Tabla": 5, "Ilustración": 5}

    def place(element):
        anchor._p.addprevious(element)

    def paragraph(text="", style="Normal", body_text=True):
        item = document.add_paragraph(style=style)
        if text:
            run = item.add_run(text)
            set_run_font(run)
        if style == "Normal" and body_text:
            format_body(item)
        elif style.startswith("Heading "):
            format_heading(item, int(style[-1]))
        place(item._p)
        return item

    def heading(text, level):
        return paragraph(text, f"Heading {level}", body_text=False)

    def bullet(text):
        style = "List Bullet" if "List Bullet" in [s.name for s in document.styles if s.name] else "List Paragraph"
        item = paragraph("", style, body_text=False)
        item.paragraph_format.line_spacing = 2
        item.paragraph_format.space_after = Pt(4)
        item.paragraph_format.first_line_indent = None
        set_keep(item)
        set_run_font(item.add_run(text))
        return item

    def section_label(text, italic=False):
        item = paragraph("", "Normal", body_text=False)
        item.paragraph_format.first_line_indent = Inches(0)
        item.paragraph_format.space_before = Pt(10)
        item.paragraph_format.space_after = Pt(6)
        item.paragraph_format.line_spacing = 1
        set_keep(item, keep_next=True, keep_together=True)
        set_run_font(item.add_run(text), 12, bold=True, italic=italic)
        return item

    def caption(label, title, page_break_before=False):
        counters[label] += 1
        number = paragraph("", "Caption", body_text=False)
        number.paragraph_format.page_break_before = page_break_before
        number.paragraph_format.space_before = Pt(10)
        number.paragraph_format.space_after = Pt(0)
        number.paragraph_format.line_spacing = 1
        number.paragraph_format.first_line_indent = Inches(0)
        number.alignment = WD_ALIGN_PARAGRAPH.LEFT
        set_keep(number, keep_next=True, keep_together=True)
        set_run_font(number.add_run(f"{label} "), 12, bold=True, italic=False)
        add_field(number, f"SEQ {label} \\* ARABIC", str(counters[label]), bold=True, size=12)

        title_p = paragraph("", "Normal", body_text=False)
        title_p.paragraph_format.space_before = Pt(0)
        title_p.paragraph_format.space_after = Pt(6)
        title_p.paragraph_format.line_spacing = 1
        title_p.paragraph_format.first_line_indent = Inches(0)
        title_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        set_keep(title_p, keep_next=True, keep_together=True)
        set_run_font(title_p.add_run(title), 12, italic=True)
        return counters[label]

    def note(text):
        item = paragraph("", "Normal", body_text=False)
        item.alignment = WD_ALIGN_PARAGRAPH.LEFT
        item.paragraph_format.first_line_indent = Inches(0)
        item.paragraph_format.line_spacing = 1.5
        item.paragraph_format.space_before = Pt(6)
        item.paragraph_format.space_after = Pt(8)
        set_run_font(item.add_run("Nota. "), 10.5, italic=True)
        set_run_font(item.add_run(text), 10.5)
        return item

    def table(
        rows,
        widths,
        centered_columns=(),
        centered_cells=(),
        bold_columns=(),
        bold_rows=(),
        merges=(),
        font_size=10.5,
        header_row=True,
    ):
        item = document.add_table(rows=len(rows), cols=len(rows[0]))
        item.alignment = WD_TABLE_ALIGNMENT.LEFT
        item.autofit = False
        set_table_geometry(item, widths)
        set_table_borders(item)
        if header_row:
            make_header_repeat(item.rows[0])

        merged_aliases = set()
        for row_index, start_column, end_column in merges:
            item.cell(row_index, start_column).merge(item.cell(row_index, end_column))
            merged_aliases.update(
                (row_index, column_index)
                for column_index in range(start_column + 1, end_column + 1)
            )

        for row_index, row_values in enumerate(rows):
            for column_index, value in enumerate(row_values):
                if (row_index, column_index) in merged_aliases:
                    continue
                cell = item.cell(row_index, column_index)
                cell.text = ""
                cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                set_cell_margins(cell)
                p = cell.paragraphs[0]
                p.paragraph_format.first_line_indent = Inches(0)
                p.paragraph_format.left_indent = Inches(0)
                p.paragraph_format.right_indent = Inches(0)
                p.paragraph_format.line_spacing = 1
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(3)
                p.alignment = (
                    WD_ALIGN_PARAGRAPH.CENTER
                    if (header_row and row_index == 0)
                    or column_index in centered_columns
                    or (row_index, column_index) in centered_cells
                    else WD_ALIGN_PARAGRAPH.LEFT
                )
                set_keep(
                    p,
                    keep_next=(header_row and row_index == 0),
                    keep_together=(header_row and row_index == 0),
                )
                set_run_font(
                    p.add_run(str(value)),
                    font_size,
                    bold=(
                        (header_row and row_index == 0)
                        or row_index in bold_rows
                        or (row_index > 0 and column_index in bold_columns)
                    ),
                )
                if (header_row and row_index == 0) or row_index in bold_rows:
                    set_cell_border(cell, "bottom", "single", 8)
        place(item._tbl)
        return item

    def picture(path, width=6.2, keep_with_note=True, alt_text=None):
        item = document.add_paragraph()
        item.alignment = WD_ALIGN_PARAGRAPH.CENTER
        item.paragraph_format.first_line_indent = Inches(0)
        item.paragraph_format.space_before = Pt(0)
        item.paragraph_format.space_after = Pt(0)
        item.paragraph_format.line_spacing = 1
        set_keep(item, keep_next=keep_with_note, keep_together=True)
        shape = item.add_run().add_picture(str(path), width=Inches(width))
        description = alt_text or path.stem.replace("_", " ")
        shape._inline.docPr.set("descr", description)
        shape._inline.graphic.graphicData.pic.nvPicPr.cNvPr.set("descr", description)
        place(item._p)
        return item

    heading("Capítulo III – Análisis de Requerimientos", 1)
    paragraph(
        "En este capítulo se describe el proceso metodológico, funcional y técnico utilizado para "
        "desarrollar el sistema web de gestión de citas y tratamientos de la Clínica Veterinaria El "
        "Ganadero. La propuesta se estructura a partir del diagnóstico institucional, el levantamiento "
        "de requerimientos, el diseño de la solución, la evaluación de factibilidad y la planificación "
        "de los recursos necesarios para su implementación."
    )

    heading("3.1 Antecedentes", 2)
    paragraph(
        "La Clínica Veterinaria El Ganadero evolucionó de una farmacia veterinaria a un establecimiento "
        "de atención clínica. La programación de citas, la identificación de pacientes, el seguimiento "
        "de tratamientos y parte del control administrativo se realizaban mediante mensajes, agendas "
        "físicas y documentos separados. Esta forma de trabajo dificultaba consultar la disponibilidad, "
        "mantener expedientes ordenados y obtener información oportuna para la toma de decisiones."
    )
    paragraph(
        "Para el diagnóstico se aplicó una encuesta con escala de Likert a 30 participantes: cinco "
        "personas relacionadas directamente con la clínica y veinticinco participantes de establecimientos "
        "con procesos semejantes. La evidencia reunida respaldó la necesidad de centralizar las citas, "
        "los expedientes clínicos y los controles administrativos en una plataforma web."
    )

    heading("3.2 Impacto", 2)
    paragraph(
        "El impacto se evaluará mediante un diseño cuantitativo de preprueba y postprueba con un solo "
        "grupo. La variable independiente corresponde a la implementación del sistema web; la variable "
        "dependiente corresponde a la eficiencia operativa y a la calidad de la atención. Se compararán "
        "el tiempo para agendar una cita, el tiempo para localizar un expediente, los errores "
        "administrativos, las citas duplicadas y la satisfacción de los usuarios."
    )
    paragraph(
        "Las mediciones se registrarán en el módulo administrativo de Evaluación. Para cada fase se "
        "recomienda recopilar al menos diez operaciones comparables, capacitar al personal y conservar "
        "condiciones equivalentes. Los resultados se expresarán mediante reducciones porcentuales de "
        "tiempo, errores y duplicidades, además de la variación promedio de satisfacción."
    )

    heading("3.3 Beneficios", 2)
    for value in (
        "Centralización de clientes, mascotas, citas, expedientes clínicos, tratamientos y vacunas.",
        "Reducción de registros duplicados, pérdidas de información y búsquedas manuales.",
        "Priorización de citas mediante niveles de riesgo y consulta inmediata de disponibilidad.",
        "Accesos separados para clientes, empleados y administradores, con permisos según el rol.",
        "Trazabilidad de inventario, ventas y operaciones sensibles mediante auditoría.",
        "Obtención de indicadores cuantitativos para evaluar el efecto de la implementación.",
    ):
        bullet(value)

    heading("3.4 Referencias", 2)
    paragraph(
        "Los documentos y medios utilizados en la operación de la clínica permitieron identificar los "
        "datos, responsables y movimientos que deben registrarse. Las encuestas y evidencias de "
        "aplicación se conservan en los anexos del documento."
    )
    caption("Tabla", "Documentos y medios de referencia de la operación actual")
    table(
        [
            ["Tipo", "Referencia", "Uso identificado", "Disponibilidad"],
            ["Agenda", "Registro manual de citas", "Fecha, hora, cliente, mascota y estado", "Levantamiento"],
            ["Mensajería", "WhatsApp de la clínica", "Solicitud, confirmación y seguimiento", "Levantamiento"],
            ["Expediente", "Historial de la mascota", "Antecedentes, diagnósticos y tratamientos", "Por atención"],
            ["Control", "Inventario y comprobantes", "Productos, movimientos, pagos y reportes", "Por operación"],
        ],
        [0.9, 1.65, 2.85, 1.0],
        centered_columns=(0, 3),
        font_size=10,
    )
    note("Elaboración propia con base en el levantamiento de información de la clínica.")

    heading("3.5 Descripción del Problema", 2)
    caption("Tabla", "Descripción del problema y propuesta de solución")
    table(
        [
            [
                "¿Cuál es el problema?",
                "La Clínica Veterinaria El Ganadero administra citas, expedientes, inventario, ventas y controles de acceso mediante registros dispersos o procesos manuales. Esto ocasiona conflictos de horario, búsquedas lentas, diferencias de existencias y menor trazabilidad.",
            ],
            [
                "¿Afecta a?",
                "Clientes, pacientes, personal de atención, responsables de inventario y ventas, y administración de la clínica.",
            ],
            [
                "Una solución exitosa debe ser:",
                "Un sistema web centralizado con portales separados por rol, agenda y triaje, historial por mascota, tratamientos y vacunas, inventario transaccional, ventas, reportes, auditoría y persistencia en SQL Server.",
            ],
        ],
        [2.05, 4.35],
        bold_columns=(0,),
        font_size=10.5,
        header_row=False,
    )
    note("Elaboración propia a partir del diagnóstico institucional.")

    heading("3.6 Funcionalidades Requeridas", 2)
    paragraph(
        "Los requerimientos funcionales se obtuvieron mediante revisión de las rutas de la interfaz, "
        "los servicios REST, las reglas de seguridad, los validadores y los scripts de SQL Server del "
        "sistema El Ganadero. La numeración REQ001-REQ031 permite identificar de forma continua las "
        "funcionalidades verificables de cada módulo."
    )
    for requirement in FUNCTIONAL_REQUIREMENTS:
        caption(
            "Tabla",
            f"Requerimientos del módulo de {requirement['name']}",
        )
        function_rows = []
        for function in requirement["functions"]:
            code, separator, description = function.partition(".")
            number = code.removeprefix("F") if separator else ""
            function_rows.append([number, "", description.strip() if separator else function, "", ""])

        detail_rows = [
            ["Id. Requerimiento", "", requirement["id"], "Clasificación o prioridad", requirement["priority"]],
            ["Nombre Requerimiento", "", requirement["name"], "", ""],
            ["", "", "", "", ""],
            ["No. Func.", "", "Funcionalidad", "", ""],
            *function_rows,
        ]
        function_start = 4
        detail_merges = [(0, 0, 1), (1, 0, 1), (1, 2, 4), (2, 0, 4), (3, 0, 1), (3, 2, 4)]
        for row_index in range(function_start, function_start + len(function_rows)):
            detail_merges.extend([(row_index, 0, 1), (row_index, 2, 4)])
        table(
            detail_rows,
            [0.75, 1.55, 1.15, 2.2, 0.75],
            centered_cells=tuple(
                [(0, 2), (0, 4), (3, 0), (3, 2)]
                + [(row_index, 0) for row_index in range(function_start, function_start + len(function_rows))]
            ),
            bold_rows=(0, 1, 3),
            merges=detail_merges,
            font_size=10.5,
            header_row=False,
        )
        note(f"Elaboración propia. Módulo: {requirement['module']}. Actor(es): {requirement['actors']}.")

    heading("3.7 Limitaciones y Restricciones", 2)
    for value in (
        "La calidad de los resultados depende del registro constante y correcto de la información.",
        "El triaje apoya la priorización administrativa y no sustituye el criterio veterinario.",
        "La recuperación de contraseña requiere una cuenta institucional y configuración SMTP válida.",
        "La operación necesita un navegador actualizado, conexión de red y SQL Server disponible.",
        "La publicación en Internet requiere dominio, certificado TLS, respaldos y servidor administrado.",
    ):
        bullet(value)

    heading("3.8 Requerimientos No Funcionales", 2)
    paragraph(
        "Los requerimientos no funcionales establecen atributos de calidad y condiciones de operación. "
        "Se expresan mediante criterios observables para evitar formulaciones subjetivas."
    )
    caption("Tabla", "Descripción de requerimientos no funcionales")
    non_functional_rows = [["Categoría", "ID", "Descripción"]]
    non_functional_rows.extend(
        [category, requirement_id, f"{description} Criterio de verificación: {criterion}"]
        for requirement_id, category, description, criterion in NON_FUNCTIONAL_REQUIREMENTS
    )
    table(
        non_functional_rows,
        [1.25, 0.85, 4.3],
        centered_columns=(1,),
        font_size=9.15,
    )
    note("La evidencia se obtiene mediante pruebas unitarias, integración con SQL Server, lint, compilación, navegación y postdespliegue.")

    heading("3.9 Análisis de Solución Propuesta", 2)
    paragraph(
        "La solución consiste en una aplicación web con interfaz React, una API REST desarrollada con "
        "Node.js y Express, y una base de datos Microsoft SQL Server. El proceso se organiza con las "
        "fases de inicio, elaboración, construcción y transición de RUP. Esta secuencia permite definir "
        "requerimientos, diseñar los componentes, implementar módulos y validar la solución con los "
        "usuarios de la clínica."
    )
    paragraph(
        "Las operaciones de citas, inventario y ventas emplean validaciones y transacciones para conservar "
        "la consistencia. Las consultas se parametrizan y los permisos se comprueban en el servidor, por lo "
        "que conocer una URL no concede acceso a funciones restringidas."
    )

    heading("3.10 Alcance", 2)
    for value in (
        "Portal de clientes para registro, mascotas y solicitud de citas.",
        "Portal de empleados para agenda, triaje, expedientes, tratamientos, vacunas, inventario y ventas.",
        "Portal administrativo para usuarios, configuración, auditoría, reportes y evaluación.",
        "Base de datos relacional para la información clínica y operativa.",
        "Pruebas formales y postpruebas con evidencia cuantitativa.",
    ):
        bullet(value)

    heading("3.11 Diseño General del Desarrollo", 2)
    paragraph(
        "El diseño general define las interacciones de los usuarios, la estructura de los datos y los "
        "componentes de la solución. Se prioriza una interfaz orientada a tareas, una API con validación de "
        "entradas y una base de datos con integridad referencial."
    )
    heading("3.11.1 Casos de Uso", 3)
    paragraph(
        "Los casos de uso describen la interacción verificable entre cada actor y el sistema. Se incluyen "
        "los flujos principales, las alternativas y las postcondiciones asociadas con los requerimientos."
    )
    caption("Tabla", "Catálogo de casos de uso")
    use_case_summary = [["ID", "Caso de uso", "Actor", "REQ relacionados"]]
    use_case_summary.extend([[case[0], case[1], case[2], case[3]] for case in USE_CASES])
    table(
        use_case_summary,
        [0.75, 2.35, 1.65, 1.65],
        centered_columns=(0,),
        font_size=9.2,
    )

    caption("Ilustración", "Casos de uso del portal de clientes")
    picture(UC_CLIENT, width=6.15)
    note("Elaboración propia. Las asociaciones identifican las funciones disponibles para el actor Cliente.")
    caption("Ilustración", "Casos de uso del personal de la clínica")
    picture(UC_EMPLOYEE, width=6.15)
    note("Elaboración propia. El acceso real depende además de los permisos asignados al rol.")
    caption("Ilustración", "Casos de uso administrativos")
    picture(UC_ADMIN, width=6.15)
    note("Elaboración propia. El administrador supervisa seguridad, configuración, reportes y evaluación.")

    for case in USE_CASES:
        case_id, case_name, actor, related, preconditions, main_flow, alternatives, postcondition = case
        caption("Ilustración", f"Caso de Uso - {case_name}")
        picture(
            individual_use_case_path(case_id),
            width=6.15,
            alt_text=f"Diagrama UML del caso de uso {case_id}, {case_name}, para el actor {actor}",
        )
        note(
            "Elaboración propia. La asociación une al actor con el caso principal; include identifica "
            "acciones obligatorias y extend representa condiciones excepcionales."
        )
        caption("Tabla", f"Especificación de Caso de Uso de {case_name}")
        table(
            [
                ["ID", case_id],
                [
                    "Descripción",
                    f"Permite al actor {actor} realizar la operación {case_name.lower()} en el sistema El Ganadero.",
                ],
                ["Flujo básico", "\n".join(f"{index}) {step}" for index, step in enumerate(main_flow, start=1))],
                [
                    "Excepciones",
                    "\n".join(f"{index}) {step}" for index, step in enumerate(alternatives, start=1)),
                ],
            ],
            [1.65, 4.75],
            bold_columns=(0,),
            font_size=9.5,
        )
        note("Elaboración propia con base en los controles de la interfaz y las reglas de la API.")

    heading("3.11.2 Base de Datos", 3)
    paragraph(
        "El modelo físico comprende 25 tablas de SQL Server. Para mantener la legibilidad, el diagrama se "
        "divide por dominios funcionales. Las líneas representan relaciones de claves foráneas y cada extremo "
        "muestra su cardinalidad; no se utilizan flechas de secuencia."
    )
    caption("Ilustración", "Modelo relacional de seguridad, clientes y mascotas")
    picture(ERD_SECURITY, width=6.15)
    note("Elaboración propia a partir de las claves foráneas de dbo.Roles, dbo.Usuarios, dbo.Clientes, dbo.Mascotas y catálogos relacionados.")
    caption("Ilustración", "Modelo relacional de agenda y triaje")
    picture(ERD_APPOINTMENTS, width=6.15)
    note("Elaboración propia. Una cita pertenece a un cliente y una mascota, y referencia el nivel de riesgo y los usuarios responsables.")
    caption("Ilustración", "Modelo relacional de atención clínica")
    picture(ERD_CLINICAL, width=6.15)
    note("Elaboración propia. El historial conserva cliente, paciente, cita opcional y profesional responsable.")
    caption("Ilustración", "Modelo relacional de tratamientos y vacunas")
    picture(ERD_CARE, width=6.15)
    note("Elaboración propia. Tratamientos y vacunas conservan la identidad del paciente y del profesional.")
    caption("Ilustración", "Modelo relacional de inventario, ventas y pagos")
    picture(ERD_SALES, width=6.15)
    note("Elaboración propia. VentaDetalle admite productos o servicios; Pagos depende de Ventas y los movimientos documentan el stock.")
    caption("Ilustración", "Inventario de tablas físicas de VeterinariaDB")
    picture(DB_INVENTORY, width=6.15)
    note("Elaboración propia con base en 02_tables.sql, 07_production_hardening.sql y 08_auth_security.sql.")

    caption("Tabla", "Inventario de entidades de la base de datos")
    table(
        [
            ["Dominio", "Tablas", "Finalidad"],
            ["Seguridad", "Roles, Permisos, RolPermiso, Usuarios, PasswordResetTokens, Auditoria", "Identidad, autorización, recuperación y trazabilidad"],
            ["Clientes", "Clientes, Especies, Razas, Mascotas, Notificaciones", "Propietarios, pacientes, catálogos y avisos"],
            ["Agenda", "NivelesRiesgo, Citas", "Disponibilidad, estado y priorización"],
            ["Clínica", "HistorialClinico, Tratamientos, Vacunas", "Continuidad de la atención veterinaria"],
            ["Inventario", "Productos, Servicios, InventarioMovimientos", "Catálogo, existencia y movimientos"],
            ["Ventas", "Ventas, VentaDetalle, Pagos", "Transacción, líneas, método y pago"],
            ["Empresa", "ConfiguracionEmpresa, HorariosClinica", "Información institucional y operación"],
            ["Evaluación", "MedicionesImpacto", "Evidencia cuantitativa Pre y Post"],
        ],
        [1.0, 3.25, 2.15],
        font_size=9.2,
    )

    section_label("Matriz de trazabilidad de requerimientos")
    paragraph(
        "La matriz vincula los requerimientos con la ruta o componente que los implementa, las tablas "
        "principales que conservan la información y la verificación prevista."
    )
    traceability = [
        ("REQ001", "React Router", "-", "Navegación directa"),
        ("REQ002", "POST auth/register-client", "Clientes, Usuarios", "Integración duplicados"),
        ("REQ003", "POST auth/login/client", "Usuarios, Clientes", "Integración por rol"),
        ("REQ004", "POST auth/login/employee", "Usuarios, Roles", "Integración por rol"),
        ("REQ005", "POST auth/login/admin", "Usuarios, Roles", "Integración por rol"),
        ("REQ006", "auth/me; auth/logout", "Usuarios", "Cookie y sesión"),
        ("REQ007", "authService.login", "Usuarios, Auditoria", "Unidad e integración"),
        ("REQ008", "auth/password/*", "Usuarios, PasswordResetTokens", "Integración de token"),
        ("REQ009", "GET portal/summary", "Clientes, Mascotas, Citas", "Aislamiento de cliente"),
        ("REQ010", "POST portal/pets", "Mascotas, Especies, Razas", "Integración de propietario"),
        ("REQ011", "portal/appointments", "Citas, Mascotas", "Disponibilidad y propiedad"),
        ("REQ012", "dashboard; catalog/options", "Vistas y catálogos", "Consulta autorizada"),
        ("REQ013", "CRUD clients", "Clientes", "CRUD y validación"),
        ("REQ014", "CRUD pets", "Mascotas", "CRUD y relaciones"),
        ("REQ015", "CRUD species; breeds", "Especies, Razas", "Rol y unicidad"),
        ("REQ016", "CRUD appointments", "Citas", "Índice de horario"),
        ("REQ017", "POST triage/classify", "NivelesRiesgo", "6 pruebas unitarias"),
        ("REQ018", "GET/PUT triage/rules", "NivelesRiesgo", "Permiso y conjunto válido"),
        ("REQ019", "PATCH appointments/status", "Citas", "Restricción de estado"),
        ("REQ020", "CRUD clinical-records", "HistorialClinico", "Relaciones clínicas"),
        ("REQ021", "CRUD treatments", "Tratamientos", "Estado y fechas"),
        ("REQ022", "CRUD vaccines", "Vacunas", "Fechas y paciente"),
        ("REQ023", "CRUD products; services", "Productos, Servicios", "Rangos y reportes"),
        ("REQ024", "inventory/movements", "InventarioMovimientos, Productos", "Transacción de stock"),
        ("REQ025", "POST sales", "Ventas, VentaDetalle, Productos", "Transacción de venta"),
        ("REQ026", "sales/:id/ticket", "Ventas, VentaDetalle, Pagos", "Comparación con venta"),
        ("REQ027", "GET reports", "Consultas operativas", "Totales y listas"),
        ("REQ028", "CRUD users", "Usuarios, Roles, RolPermiso", "Unicidad y permiso"),
        ("REQ029", "config/company", "ConfiguracionEmpresa", "Persistencia y ticket"),
        ("REQ030", "GET audit", "Auditoria", "Solo administrador"),
        ("REQ031", "evaluation/*", "MedicionesImpacto", "Rangos y resumen"),
    ]
    traceability_rows = [["REQ", "Componente", "Datos principales", "Verificación"]]
    traceability_rows.extend([list(item) for item in traceability])
    caption("Tabla", "Matriz de trazabilidad entre requisitos, componentes, datos y pruebas")
    table(
        traceability_rows,
        [0.72, 2.0, 2.15, 1.53],
        centered_columns=(0,),
        font_size=8.5,
    )

    section_label("Pruebas formales y evidencia cuantitativa")
    paragraph(
        "La verificación combina evidencia histórica de postdespliegue, pruebas automatizadas y revisión "
        "visual de los portales. Los resultados se conservan sin ocultar condiciones que impidan repetir "
        "una prueba."
    )
    caption("Tabla", "Evidencia cuantitativa de postdespliegue del 20 de julio de 2026")
    table(
        [
            ["Indicador", "Resultado", "Interpretación"],
            ["Controles HTTP", "14 de 14 aprobados", "Salud, rutas, roles y permisos respondieron como se esperaba"],
            ["Muestras de salud", "20", "Consultas repetidas contra VeterinariaDB"],
            ["Tiempo promedio", "10.52 ms", "Promedio de respuesta del control de salud"],
            ["Percentil 95", "6.70 ms", "El 95 % de las muestras quedó en ese valor o por debajo según la evidencia guardada"],
            ["Mínimo / máximo", "2.60 / 132.77 ms", "Rango observado"],
            ["Vulnerabilidades de producción", "0", "Auditorías de dependencias reportadas sin hallazgos"],
            ["Errores de consola", "0", "Navegación verificada sin errores"],
            ["Controles fuera del ancho móvil", "0 de 17", "Sin desbordamiento horizontal"],
        ],
        [2.1, 1.25, 3.05],
        centered_columns=(1,),
        font_size=9.2,
    )
    note("Fuente: backend/docs/evidencias/postdeployment-latest.json y protocolo de despliegue del proyecto.")

    caption("Tabla", "Resultado de la comprobación repetida el 17 de agosto de 2026")
    table(
        [
            ["Comprobación", "Resultado", "Evidencia / observación"],
            ["Sintaxis del backend", "Aprobada", "npm run check finalizó sin errores"],
            ["Pruebas unitarias", "6 de 6 aprobadas", "Triaje, normalización, selección manual y bloqueo máximo"],
            ["Lint del frontend", "Aprobado", "ESLint finalizó sin errores"],
            ["Compilación de producción", "Aprobada", "1,826 módulos; JS 367.45 kB, gzip 111.91 kB"],
            ["Portales en navegador", "4 vistas verificadas", "Cliente, empleado, administrador y recuperación de clave"],
            ["Suite total con integración SQL", "6 aprobadas y 9 fallidas", "La conexión ODBC a localhost no estuvo disponible para el proceso de prueba"],
            ["Endpoint /api/health", "HTTP 500", "SQL Server no fue accesible desde la sesión de ejecución; debe corregirse antes de la entrega"],
        ],
        [2.0, 1.45, 2.95],
        centered_columns=(1,),
        font_size=9.2,
    )
    note("La segunda tabla no reemplaza la evidencia histórica. Documenta una repetición independiente y un bloqueo de infraestructura que impide certificar nuevamente la integración SQL.")

    heading("3.12 Diseño de Elementos", 2)
    paragraph(
        "Las pantallas se diseñan para facilitar las tareas recurrentes. La interfaz utiliza campos "
        "validados, tablas de consulta, controles de estado y mensajes comprensibles para que el usuario "
        "identifique una acción incompleta o no autorizada."
    )
    paragraph(
        "Las siguientes capturas fueron tomadas el 17 de agosto de 2026 mediante navegación directa sobre "
        "la compilación local del sistema. Cada pantalla se acompaña de la descripción de sus campos, tal "
        "como se estructura esta sección en el documento de referencia."
    )
    caption("Ilustración", "Pantalla de acceso del portal de clientes")
    picture(UI_CLIENT, width=6.15)
    note("Captura de la ruta /cliente/acceso. El registro de cuenta está disponible únicamente en este portal.")
    caption("Tabla", "Descripción de campos de la pantalla de acceso de clientes")
    table(
        [
            ["Campo", "Valor por defecto", "Tipo de campo", "Observación"],
            ["Usuario o correo", "Vacío", "Entrada de texto", "Requerido; acepta el usuario o correo registrado."],
            ["Contraseña", "Vacío", "Entrada protegida", "Requerida; oculta los caracteres ingresados."],
            ["Ingresar", "Activo", "Botón principal", "Valida la cuenta y confirma que pertenece al portal de clientes."],
            ["Crear cuenta", "—", "Enlace de navegación", "Disponible únicamente para el registro de clientes."],
            ["Olvidé mi clave", "—", "Enlace de recuperación", "Abre la solicitud de un enlace temporal de restablecimiento."],
        ],
        [1.45, 1.25, 1.45, 2.25],
        centered_columns=(1,),
        font_size=9.4,
    )
    note("Elaboración propia con base en los controles implementados en el portal de clientes.")
    caption("Ilustración", "Pantalla de registro de cuenta de cliente")
    picture(UI_REGISTER, width=6.15)
    note("Captura real del estado Crear cuenta en /cliente/acceso. El formulario solo está disponible para clientes.")
    caption("Tabla", "Descripción de campos de la pantalla de registro de clientes")
    table(
        [
            ["Campo", "Valor por defecto", "Tipo de campo", "Observación"],
            ["Nombre completo", "Vacío", "Entrada de texto", "Requerido; identifica al propietario de la mascota."],
            ["Teléfono", "Vacío", "Entrada telefónica", "Requerido para la comunicación de la clínica."],
            ["Correo", "Vacío", "Entrada de correo", "Requerido; debe ser válido y no estar registrado."],
            ["Usuario", "Vacío", "Entrada de texto", "Requerido; debe ser único sin distinguir mayúsculas."],
            ["Dirección", "Vacío", "Entrada de texto", "Registra la ubicación de referencia del cliente."],
            ["Clave", "Vacío", "Entrada protegida", "Requerida; se almacena mediante hash seguro."],
            ["Registrarme y agendar", "Activo", "Botón principal", "Crea la cuenta y continúa al flujo de citas cuando los datos son válidos."],
        ],
        [1.45, 1.25, 1.45, 2.25],
        centered_columns=(1,),
        font_size=9.4,
    )
    note("Elaboración propia con base en la pantalla implementada y las validaciones de registro.")
    caption("Ilustración", "Pantalla de acceso del portal de empleados")
    picture(UI_EMPLOYEE, width=6.15)
    note("Captura de la ruta /empleado/acceso. La pantalla identifica el acceso exclusivo del personal.")
    caption("Tabla", "Descripción de campos de la pantalla de acceso de empleados")
    table(
        [
            ["Campo", "Valor por defecto", "Tipo de campo", "Observación"],
            ["Usuario o correo", "Vacío", "Entrada de texto", "Requerido; identifica la cuenta interna del empleado."],
            ["Contraseña", "Vacío", "Entrada protegida", "Requerida; la API verifica estado, bloqueo, rol y permisos."],
            ["Ingresar", "Activo", "Botón principal", "Permite el acceso solo si la cuenta corresponde al personal."],
            ["Olvidé mi clave", "—", "Enlace de recuperación", "Inicia la recuperación sin revelar si la cuenta existe."],
        ],
        [1.45, 1.25, 1.45, 2.25],
        centered_columns=(1,),
        font_size=9.4,
    )
    note("Elaboración propia con base en los controles implementados en el portal de empleados.")
    caption("Ilustración", "Pantalla de acceso del portal administrativo")
    picture(UI_ADMIN, width=6.15)
    note("Captura de la ruta /admin/acceso. La pantalla identifica las funciones de control y configuración.")
    caption("Tabla", "Descripción de campos de la pantalla de acceso administrativo")
    table(
        [
            ["Campo", "Valor por defecto", "Tipo de campo", "Observación"],
            ["Usuario o correo", "Vacío", "Entrada de texto", "Requerido; identifica la cuenta administrativa."],
            ["Contraseña", "Vacío", "Entrada protegida", "Requerida; se valida junto con estado, bloqueo y rol."],
            ["Ingresar", "Activo", "Botón principal", "Concede acceso únicamente a una cuenta con rol administrador."],
            ["Olvidé mi clave", "—", "Enlace de recuperación", "Solicita un token temporal de un solo uso."],
        ],
        [1.45, 1.25, 1.45, 2.25],
        centered_columns=(1,),
        font_size=9.4,
    )
    note("Elaboración propia con base en los controles implementados en el portal administrativo.")
    caption("Ilustración", "Flujo inicial de recuperación de contraseña")
    picture(UI_RESET, width=6.15)
    note("Captura del estado Recuperar clave. El usuario solicita un enlace de un solo uso mediante usuario o correo.")
    caption("Tabla", "Descripción de campos de la recuperación de contraseña")
    table(
        [
            ["Campo", "Valor por defecto", "Tipo de campo", "Observación"],
            ["Usuario o correo", "Vacío", "Entrada de texto", "Requerido; localiza la cuenta sin revelar públicamente su existencia."],
            ["Enviar enlace", "Activo", "Botón principal", "Solicita un token de un solo uso con vencimiento configurado."],
            ["Nueva contraseña", "Vacío", "Entrada protegida", "Se muestra al abrir un token válido y debe cumplir la política de seguridad."],
            ["Confirmar contraseña", "Vacío", "Entrada protegida", "Debe coincidir con la nueva contraseña."],
            ["Volver al acceso", "—", "Enlace de navegación", "Regresa al portal desde el cual se inició la recuperación."],
        ],
        [1.45, 1.25, 1.45, 2.25],
        centered_columns=(1,),
        font_size=9.4,
    )
    note("Elaboración propia con base en el flujo de tokens temporales y validaciones de la API.")

    heading("3.13 Arquitectura del Software", 2)
    paragraph(
        "La arquitectura separa la experiencia de usuario, las reglas de negocio y la persistencia. React "
        "administra los portales; Node.js y Express exponen servicios REST, validan datos y aplican permisos; "
        "SQL Server conserva la información clínica y administrativa. Esta separación facilita las pruebas, "
        "el mantenimiento y el crecimiento de la solución."
    )
    caption("Ilustración", "Arquitectura de la solución web")
    picture(ARCHITECTURE, width=6.15)
    note("Elaboración propia. En producción, los portales se publican mediante HTTPS y la base de datos permanece aislada de Internet.")

    heading("3.14 Factibilidades del Proyecto", 2)
    paragraph(
        "La factibilidad se evaluó en las dimensiones técnica, operativa, económica, legal y ambiental. La "
        "disponibilidad de herramientas y la participación del personal permiten una implementación gradual, "
        "sujeta a la preparación de la infraestructura de producción."
    )
    heading("3.14.1 Factibilidad Técnica", 3)
    caption("Tabla", "Factibilidad de software")
    table(
        [
            ["Componente", "Uso", "Justificación"],
            ["Node.js y Express", "API REST", "Servicios, validación y reglas de negocio"],
            ["React y Vite", "Interfaz", "Componentes reutilizables y navegación por rol"],
            ["SQL Server", "Persistencia", "Integridad relacional, transacciones y auditoría"],
            ["ODBC y SSMS", "Conexión y gestión", "Administración de VeterinariaDB"],
            ["Correo SMTP", "Recuperación", "Entrega de enlaces temporales"],
        ],
        [1.55, 1.65, 3.2],
        centered_columns=(0, 1),
    )
    caption("Tabla", "Factibilidad de hardware e infraestructura")
    table(
        [
            ["Recurso", "Requisito", "Uso"],
            ["Computadora", "Procesador moderno, 8 GB RAM", "Administración y operación"],
            ["Red e Internet", "Conectividad estable", "Acceso, respaldo y publicación"],
            ["Servidor o nube", "Node.js y SQL Server", "Despliegue controlado"],
            ["Impresora", "Disponible cuando aplique", "Comprobantes administrativos"],
        ],
        [1.55, 2.55, 2.3],
        centered_columns=(0,),
    )
    heading("3.14.2 Factibilidad Operativa", 3)
    paragraph(
        "La solución es operativamente viable porque digitaliza tareas que el personal ya realiza: registrar "
        "citas, consultar mascotas, documentar tratamientos, controlar inventario y atender ventas. Su adopción "
        "requiere capacitación inicial, responsables definidos y registro constante de la información."
    )
    heading("3.14.3 Factibilidad Económica", 3)
    paragraph(
        "El desarrollo se realiza como trabajo de graduación, por lo que no se asigna a la clínica un costo "
        "por programación. El presupuesto estima los recursos de operación, conectividad, impresión, pruebas y "
        "despliegue inicial."
    )
    section_label("Costos de personal")
    paragraph(
        "El análisis, desarrollo y documentación son realizados por el estudiante como parte del proyecto de "
        "graduación. La clínica participa en el levantamiento, la validación y la capacitación sin contratar "
        "personal técnico adicional para esta etapa."
    )
    section_label("Costos de desarrollo")
    paragraph(
        "El diseño, la implementación y las pruebas forman parte del proceso académico. Las herramientas de "
        "desarrollo utilizadas no requieren una compra inicial para construir y validar el prototipo."
    )
    section_label("Costos de hardware")
    paragraph(
        "La operación inicial puede realizarse con el equipo de cómputo, la impresora y la conectividad ya "
        "disponibles en la clínica. Los recursos sugeridos se incorporarán únicamente cuando se apruebe el "
        "despliegue definitivo."
    )
    section_label("Costos de software")
    paragraph(
        "React, Node.js, Visual Studio Code y las dependencias abiertas no generan un costo de licencia para "
        "el desarrollo. La edición de SQL Server y el servicio de nube deberán seleccionarse conforme a las "
        "condiciones de uso del ambiente de producción."
    )
    caption("Tabla", "Presupuesto estimado para la implementación inicial")
    table(
        [
            ["Cantidad", "Recurso", "Descripción", "Costo"],
            ["1", "Computadora", "Equipo disponible", "Disponible"],
            ["1", "Impresora", "Comprobantes", "Q50.00"],
            ["1", "Router WiFi", "Conectividad local", "Q250.00"],
            ["5", "Puntos de acceso", "Cobertura de red", "Q150.00"],
            ["-", "Servicio en nube", "Alojamiento inicial", "Q80.00"],
            ["1", "Multifuncional", "Impresión y escaneo", "Q50.00"],
            ["100", "Papel carta", "Apoyo administrativo", "Q200.00"],
            ["-", "Electricidad e Internet", "Operación del proyecto", "Q500.00"],
            ["-", "Datos móviles", "Investigación y respaldo", "Q100.00"],
            ["-", "Análisis y pruebas", "Validación del software", "Q100.00"],
            ["", "Total estimado", "", "Q1,480.00"],
        ],
        [0.75, 1.65, 2.75, 1.25],
        centered_columns=(0, 3),
        font_size=10,
    )
    note("El total corresponde a la suma de los rubros con costo monetario incluidos en la tabla.")
    heading("3.14.4 Factibilidad Legal", 3)
    paragraph(
        "El sistema debe respaldar los procedimientos internos de la clínica y el tratamiento responsable "
        "de los datos de propietarios y mascotas. El control de acceso, la auditoría y la trazabilidad de "
        "tratamientos e inventario permiten mantener registros verificables. La prestación veterinaria debe "
        "continuar alineada con la normativa aplicable."
    )
    heading("3.14.4.1 Licenciamientos de Softwares para el Desarrollo del Proyecto", 3)
    paragraph(
        "Las herramientas de desarrollo se utilizarán conforme a sus licencias. La edición de SQL Server "
        "seleccionada para producción deberá contar con una modalidad de uso válida, y las dependencias de "
        "código abierto conservarán sus avisos correspondientes."
    )
    heading("3.14.4.2 Régimen Legal Nacional", 3)
    paragraph(
        "El proyecto se desarrolla en Guatemala y debe respetar la normativa nacional aplicable en materia "
        "de derecho de autor, protección de información, comprobantes y prestación de servicios. Los datos "
        "personales se utilizarán únicamente para la operación autorizada de la clínica."
    )
    heading("3.14.4.3 Acuerdos de Entrega del Proyecto", 3)
    paragraph(
        "La entrega debe documentar la instalación, las credenciales iniciales, la configuración de la base de "
        "datos, la capacitación y las evidencias de prueba. El período de garantía y las condiciones de soporte "
        "posteriores deberán quedar definidos en el acta de entrega aceptada por la clínica."
    )
    heading("3.14.5 Factibilidad Ambiental", 3)
    paragraph(
        "La digitalización disminuye el uso de agendas físicas, formularios repetidos y copias de expedientes. "
        "Los documentos que deban conservarse por motivos operativos o normativos podrán coexistir con los "
        "registros digitales del sistema."
    )
    heading("3.14.5.1 Reducción de hojas de papel", 3)
    paragraph(
        "El registro digital de citas, expedientes, inventario, ventas y reportes reduce la impresión de "
        "formularios de trabajo. Se conservará el uso de papel únicamente para comprobantes o documentos que "
        "la clínica deba entregar o archivar por necesidad operativa o legal."
    )

    heading("3.15 Recursos del Proyecto", 2)
    caption("Tabla", "Recursos disponibles")
    table(
        [
            ["Cantidad", "Recurso", "Característica o uso"],
            ["1", "Computadora o laptop", "Registro de operaciones y administración"],
            ["1", "Conexión a Internet", "Acceso y comunicación operativa"],
            ["1", "Impresora", "Comprobantes cuando aplique"],
            ["-", "Personal de la clínica", "Validación de procesos y capacitación"],
        ],
        [0.9, 2.15, 3.35],
        centered_columns=(0,),
    )
    note("Recursos identificados durante el levantamiento de información.")
    caption("Tabla", "Recursos sugeridos para crecimiento")
    table(
        [
            ["Cantidad", "Recurso", "Finalidad"],
            ["1", "Servidor o servicio en nube", "Alojamiento y respaldos"],
            ["1", "Router administrable", "Conectividad controlada"],
            ["1", "Impresora multifuncional", "Impresión y digitalización"],
            ["1", "Dominio y certificado TLS", "Publicación segura de los portales"],
        ],
        [0.9, 2.5, 3.0],
        centered_columns=(0,),
    )
    note("Los recursos sugeridos se incorporarán según el alcance del despliegue aprobado.")

    heading("3.16 Cronograma de Actividades del Proyecto", 2)
    paragraph(
        "El cronograma presenta la secuencia prevista desde el anteproyecto y el levantamiento de información "
        "hasta el desarrollo, las pruebas, la implementación y la defensa del proyecto."
    )
    caption("Ilustración", "Cronograma de actividades del proyecto")
    picture(GANTT, width=6.2)
    note("Cronograma de referencia para Proyecto de Graduación I y II.")

    page_break = paragraph("", "Normal", body_text=False)
    page_break.paragraph_format.space_after = Pt(0)
    page_break.add_run().add_break(WD_BREAK.PAGE)

    mark_fields_dirty(document)
    document.save(OUTPUT)

    assert counters == {"Tabla": 67, "Ilustración": 34}, counters


if __name__ == "__main__":
    build_document()
