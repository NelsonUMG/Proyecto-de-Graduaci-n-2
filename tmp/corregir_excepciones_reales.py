from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


ROOT = Path(r"C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO")
SOURCE = ROOT / "output" / "MARCO_DE_ANEXOS_APA7_SANDOVAL_REVISION_VISUAL_FINAL.docx"
OUTPUT = ROOT / "output" / "MARCO_DE_ANEXOS_APA7_SANDOVAL_REVISION_EXCEPCIONES_REALES.docx"


# Solo se incluyen respuestas comprobables en rutas, validadores, servicios,
# repositorio SQL y manejador global del sistema El Ganadero.
CASES = {
    "CU001": {
        "flow": [
            "El cliente selecciona Crear cuenta.",
            "Completa los datos personales y las credenciales; el sistema valida campos obligatorios, correo y fortaleza de la contraseña (Excepción 1).",
            "El sistema comprueba que el usuario y el correo no estén registrados (Excepción 2).",
            "El sistema crea el cliente y el usuario con el rol Cliente dentro de una transacción (Excepción 3).",
            "El sistema inicia la sesión y dirige al cliente a Mi portal.",
        ],
        "exceptions": [
            "Datos inválidos o incompletos: la API responde 400 con el detalle de validación; el cliente corrige los datos y vuelve al paso 2.",
            "Usuario o correo ya registrado: la API responde 409 e identifica el dato en conflicto; el cliente vuelve al paso 2.",
            "El rol Cliente no existe o falla la operación de base de datos: la API responde 500, la transacción revierte los registros parciales y el caso de uso finaliza.",
        ],
    },
    "CU002": {
        "flow": [
            "El usuario ingresa su usuario o correo y contraseña en el portal correspondiente (Excepción 1).",
            "La API valida las credenciales, los intentos fallidos y el bloqueo temporal (Excepciones 2 y 3).",
            "La API verifica que el rol corresponda al portal utilizado (Excepción 4).",
            "El sistema emite la sesión segura y registra el acceso (Excepción 5).",
            "El sistema dirige al espacio correspondiente y permite únicamente los módulos autorizados (Excepción 6).",
        ],
        "exceptions": [
            "Usuario o contraseña incompletos o con formato inválido: la API responde 400; el usuario vuelve al paso 1.",
            "Usuario inexistente, inactivo o contraseña incorrecta: la API responde 401 con un mensaje genérico; si la cuenta existe, incrementa los intentos y vuelve al paso 1.",
            "Cuenta bloqueada o quinto intento fallido: la API responde 423 e informa el tiempo de bloqueo progresivo; el caso de uso finaliza.",
            "Rol incompatible con el portal: la API responde 403, registra el intento en auditoría y el caso de uso finaliza.",
            "Fallo al actualizar la seguridad, crear el token o registrar la auditoría: la API responde 500, no confirma la sesión y el caso de uso finaliza.",
            "Permiso insuficiente para un módulo solicitado: la API responde 403; la sesión permanece activa y el usuario continúa únicamente con los módulos autorizados.",
        ],
    },
    "CU003": {
        "flow": [
            "El usuario selecciona Olvidé mi clave.",
            "Indica el usuario o correo y el portal de acceso (Excepción 1).",
            "El sistema procesa la solicitud de recuperación y presenta una respuesta pública genérica (Excepciones 2, 3 y 4).",
            "El usuario abre el enlace temporal recibido (Excepción 5).",
            "Define y confirma una contraseña nueva (Excepción 6).",
            "El sistema actualiza la contraseña, consume los tokens pendientes e invalida las sesiones anteriores (Excepción 7).",
        ],
        "exceptions": [
            "Identificador o portal ausente o inválido: la API responde 400; el usuario vuelve al paso 2.",
            "Servicio de correo no configurado: la API responde 503 y el caso de uso finaliza.",
            "Cuenta inexistente o rol incompatible con el portal: el sistema responde 200 con el mensaje genérico, no envía correo y el caso de uso finaliza.",
            "Solicitud repetida antes de dos minutos o fallo al enviar el correo: el sistema conserva la respuesta genérica y no revela el motivo; el caso de uso finaliza.",
            "Token inválido, vencido, ya utilizado o asociado a una cuenta inactiva: la API responde 400 y el caso de uso finaliza.",
            "Contraseña débil o confirmación diferente: la API responde 400 con la validación; el usuario vuelve al paso 5.",
            "Fallo de base de datos al consumir el token o actualizar la contraseña: la API responde 500, la transacción se revierte y el caso de uso finaliza.",
        ],
    },
    "CU004": {
        "flow": [
            "El cliente abre Mi portal y selecciona registrar mascota (Excepción 1).",
            "Completa la ficha de la mascota (Excepción 2).",
            "Selecciona la especie y, si corresponde, una raza mostrada por la interfaz.",
            "El sistema vincula la mascota con el cliente de la sesión y guarda el registro (Excepción 3).",
            "El sistema actualiza la lista de mascotas del cliente.",
        ],
        "exceptions": [
            "Sesión ausente o inválida, permiso insuficiente o usuario sin cliente activo vinculado: la API responde 401 o 403 y el caso de uso finaliza.",
            "Datos obligatorios o valores de la mascota inválidos: la API responde 400; el cliente corrige la ficha y vuelve al paso 2.",
            "Referencia inexistente rechazada por SQL Server o fallo de base de datos: la API responde 500, no confirma el registro y el caso de uso finaliza.",
        ],
    },
    "CU005": {
        "flow": [
            "El cliente abre la solicitud de cita y selecciona una mascota, fecha y hora (Excepciones 1 y 2).",
            "Describe el motivo y selecciona síntomas, si corresponde (Excepción 2).",
            "El sistema determina el riesgo inicial y valida que la mascota pertenezca al cliente y que el horario esté libre (Excepciones 3, 4 y 5).",
            "El sistema registra la cita con estado Pendiente dentro de una transacción (Excepción 6).",
            "La cita aparece en Mis citas.",
        ],
        "exceptions": [
            "Sesión ausente o inválida, permiso insuficiente o usuario sin cliente activo vinculado: la API responde 401 o 403 y el caso de uso finaliza.",
            "Mascota, fecha, hora o motivo ausente o con formato inválido: la API responde 400; el cliente corrige los datos y vuelve al paso 1 o 2.",
            "Ningún síntoma coincide con una regla activa: el clasificador usa el nivel no urgente predeterminado y continúa en el paso 4.",
            "La mascota no pertenece al cliente autenticado o está inactiva: la API responde 403 y el caso de uso finaliza.",
            "Ya existe una cita activa en la misma fecha y hora: la API responde 409; el cliente vuelve al paso 1 para elegir otro horario.",
            "Fallo de base de datos durante el registro: la API responde 500, la transacción se revierte y el caso de uso finaliza.",
        ],
    },
    "CU006": {
        "flow": [
            "El empleado o administrador accede al directorio de clientes y mascotas (Excepciones 1 y 3).",
            "Crea o actualiza la ficha del propietario (Excepciones 2 y 4).",
            "Registra o actualiza la mascota asociada al propietario (Excepciones 2 y 4).",
            "Selecciona la especie y la raza disponibles en la interfaz (Excepción 4).",
            "El sistema guarda los cambios o desactiva el registro solicitado (Excepciones 3 y 5).",
        ],
        "exceptions": [
            "Sesión ausente o inválida o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Datos del cliente o de la mascota inválidos: la API responde 400; el usuario corrige la ficha y vuelve al paso 2 o 3.",
            "Registro solicitado para actualización o baja no encontrado: la API responde 404; el usuario vuelve al paso 1.",
            "Cliente, especie o raza inexistente rechazada por SQL Server: la API responde 500 y el caso de uso finaliza sin confirmar los cambios.",
            "Fallo de base de datos al guardar o desactivar: la API responde 500 y el caso de uso finaliza.",
        ],
    },
    "CU007": {
        "flow": [
            "El empleado o administrador consulta la agenda (Excepciones 1 y 3).",
            "Crea o modifica la fecha, hora, cliente, mascota y motivo de la cita (Excepciones 2, 4 y 5).",
            "Clasifica los síntomas automáticamente o selecciona un nivel de riesgo disponible.",
            "Actualiza el estado de atención (Excepciones 2 y 3).",
            "El sistema guarda los cambios dentro de una transacción y los refleja en agenda y reportes (Excepción 5).",
        ],
        "exceptions": [
            "Sesión ausente o inválida o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Datos obligatorios, fecha, hora o estado fuera de los valores admitidos: la API responde 400; el usuario corrige los datos y vuelve al paso 2 o 4.",
            "Cita solicitada para actualización no encontrada: la API responde 404; el usuario vuelve al paso 1.",
            "Ya existe una cita activa en la misma fecha y hora: la API responde 409; el usuario vuelve al paso 2.",
            "Referencia rechazada por SQL Server o fallo de base de datos: la API responde 500, la transacción se revierte y el caso de uso finaliza.",
        ],
    },
    "CU008": {
        "flow": [
            "El empleado o administrador abre el historial y selecciona la mascota y, si existe, la cita relacionada (Excepciones 1 y 3).",
            "Registra el motivo de consulta y los datos clínicos (Excepción 2).",
            "Añade diagnóstico, tratamiento, medicamentos, observaciones y próxima cita, cuando corresponda (Excepción 2).",
            "El sistema guarda la atención con las referencias recibidas (Excepción 4).",
            "La atención queda disponible en el historial clínico.",
        ],
        "exceptions": [
            "Sesión ausente o inválida o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Motivo de consulta ausente o datos con formato o longitud inválidos: la API responde 400; el usuario vuelve al paso 2 o 3.",
            "Registro solicitado para actualización o baja no encontrado: la API responde 404; el usuario vuelve al paso 1.",
            "Referencia inexistente rechazada por SQL Server o fallo de base de datos: la API responde 500, no confirma el historial y el caso de uso finaliza.",
        ],
    },
    "CU009": {
        "flow": [
            "El empleado o administrador selecciona una mascota y el registro de tratamiento o vacuna que desea crear o modificar (Excepciones 1 y 3).",
            "Completa el medicamento o vacuna, el estado, las indicaciones y las fechas requeridas (Excepción 2).",
            "El sistema guarda el tratamiento o la vacuna con el profesional indicado (Excepción 4).",
            "La información aparece en el módulo clínico.",
        ],
        "exceptions": [
            "Sesión ausente o inválida o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Datos obligatorios, estado o fechas con formato inválido: la API responde 400; el usuario vuelve al paso 2.",
            "Tratamiento o vacuna solicitado para actualización o baja no encontrado: la API responde 404; el usuario vuelve al paso 1.",
            "Mascota o profesional inexistente rechazado por SQL Server o fallo de base de datos: la API responde 500, no confirma el registro y el caso de uso finaliza.",
        ],
    },
    "CU010": {
        "flow": [
            "El empleado o administrador selecciona un producto y el tipo de movimiento (Excepciones 1 y 2).",
            "Indica una cantidad positiva y el motivo (Excepción 2).",
            "El sistema comprueba que el producto esté activo y calcula la existencia resultante (Excepciones 3 y 4).",
            "El sistema actualiza el stock y registra el movimiento dentro de una transacción (Excepción 5).",
            "El sistema confirma el nuevo saldo.",
        ],
        "exceptions": [
            "Sesión ausente o inválida o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Tipo no admitido, cantidad no positiva o motivo ausente: la API responde 400; el usuario vuelve al paso 1 o 2.",
            "Producto inexistente o inactivo: la API responde 409; el usuario vuelve al paso 1.",
            "Salida superior a la existencia disponible: la API responde 409, conserva el stock y el usuario vuelve al paso 2.",
            "Fallo de base de datos: la API responde 500, la transacción se revierte y el caso de uso finaliza sin modificar el stock.",
        ],
    },
    "CU011": {
        "flow": [
            "El empleado o administrador agrega productos o servicios al detalle de la venta (Excepciones 1, 2 y 3).",
            "Indica cantidades, cliente y método de pago (Excepción 2).",
            "El sistema obtiene los precios vigentes y calcula subtotal, IVA y total.",
            "El usuario confirma la venta; el sistema valida el stock y registra venta, detalle, pago y movimientos en una transacción (Excepciones 4 y 5).",
            "El sistema permite consultar e imprimir el ticket interno (Excepción 6).",
        ],
        "exceptions": [
            "Sesión ausente o inválida o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Detalle vacío, cantidad no positiva, cliente ausente o método de pago no admitido: la API responde 400; el usuario vuelve al paso 1 o 2.",
            "Producto o servicio inexistente o inactivo: la API responde 409; el usuario vuelve al paso 1.",
            "Stock insuficiente: la API responde 409, no registra la venta y el usuario vuelve al paso 1.",
            "Cliente inexistente rechazado por SQL Server u otro fallo de base de datos: la API responde 500, revierte toda la transacción y el caso de uso finaliza.",
            "Venta solicitada para ticket no encontrada: la API responde 404; las ventas existentes no se modifican y el caso de uso finaliza.",
        ],
    },
    "CU012": {
        "flow": [
            "El administrador accede a Usuarios, Empresa, reglas de riesgo o Auditoría (Excepción 1).",
            "Crea, modifica o desactiva cuentas y asigna roles (Excepciones 2, 3, 4 y 5).",
            "Actualiza los datos institucionales o las reglas de triaje (Excepciones 2 y 5).",
            "El sistema guarda los cambios (Excepción 5).",
            "El administrador consulta la bitácora (Excepción 6).",
        ],
        "exceptions": [
            "Sesión ausente o inválida, rol distinto de Administrador o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Datos de cuenta, empresa o reglas con formato o valores inválidos: la API responde 400; el administrador vuelve al paso 2 o 3.",
            "Usuario o correo duplicado: la API responde 409 e identifica el conflicto; el administrador vuelve al paso 2.",
            "Usuario solicitado para actualización o baja no encontrado: la API responde 404; el administrador vuelve al paso 2.",
            "Rol inexistente, configuración de empresa ausente, restricción de SQL Server o fallo de base de datos: la API responde 500, no confirma el cambio y el caso de uso finaliza.",
            "Fallo al consultar la auditoría: la API responde 500, no altera la configuración y el caso de uso finaliza.",
        ],
    },
    "CU013": {
        "flow": [
            "El administrador o usuario autorizado abre Reportes o Evaluación (Excepción 1).",
            "El sistema consulta y presenta los indicadores operativos disponibles (Excepciones 2 y 3).",
            "En Evaluación, el usuario registra una medición de fase Pre o Post (Excepción 4).",
            "El sistema calcula promedios y comparaciones con los datos disponibles (Excepciones 3, 5 y 6).",
            "El sistema conserva las mediciones para su consulta posterior (Excepción 6).",
        ],
        "exceptions": [
            "Sesión ausente o inválida o permiso insuficiente: la API responde 401 o 403 y el caso de uso finaliza.",
            "Fallo de base de datos al consultar reportes: la API responde 500 y el caso de uso finaliza.",
            "No existen registros o falta una de las fases: el sistema muestra arreglos vacíos, valores cero o comparación nula y continúa sin afirmar impacto.",
            "Fase, fecha, satisfacción o valores numéricos fuera de los rangos admitidos: la API responde 400; el usuario vuelve al paso 3.",
            "Valor base igual a cero o promedio no disponible: el sistema deja esa variación como nula y continúa en el paso 5.",
            "Fallo de base de datos al guardar o resumir mediciones: la API responde 500, no confirma la operación y el caso de uso finaliza.",
        ],
    },
}


def replace_paragraph_text(paragraph, lines):
    run_properties = None
    if paragraph.runs and paragraph.runs[0]._r.rPr is not None:
        run_properties = deepcopy(paragraph.runs[0]._r.rPr)
    for child in list(paragraph._p):
        if child.tag in {qn("w:r"), qn("w:hyperlink")}:
            paragraph._p.remove(child)
    run = paragraph.add_run()
    if run_properties is not None:
        run._r.insert(0, run_properties)
    for index, line in enumerate(lines):
        if index:
            run.add_break()
        run.add_text(f"{index + 1}) {line}")
    paragraph.paragraph_format.keep_together = True


def main():
    document = Document(SOURCE)
    found = {}
    for table in document.tables:
        if len(table.rows) >= 4 and len(table.columns) == 2:
            case_id = table.cell(0, 1).text.strip()
            if case_id in CASES:
                found[case_id] = table
    missing = sorted(set(CASES) - set(found))
    if missing:
        raise RuntimeError(f"Faltan tablas: {', '.join(missing)}")

    for case_id, content in CASES.items():
        table = found[case_id]
        replace_paragraph_text(table.cell(2, 1).paragraphs[0], content["flow"])
        replace_paragraph_text(table.cell(3, 1).paragraphs[0], content["exceptions"])
        for row in table.rows:
            tr_pr = row._tr.get_or_add_trPr()
            fixed_height = tr_pr.find(qn("w:trHeight"))
            if fixed_height is not None:
                tr_pr.remove(fixed_height)

    settings = document.settings._element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")

    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
