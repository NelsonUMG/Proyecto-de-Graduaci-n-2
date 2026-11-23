from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


ROOT = Path(r"C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO")
SOURCE = ROOT / "output" / "MARCO_DE_ANEXOS_APA7.docx"
OUTPUT = ROOT / "output" / "MARCO_DE_ANEXOS_APA7_SANDOVAL_REVISION_VISUAL_FINAL.docx"


CASES = {
    "CU001": {
        "flow": [
            "El cliente selecciona Crear cuenta.",
            "Completa sus datos personales y credenciales; el sistema valida los campos obligatorios, el correo y la fortaleza de la contraseña (Excepción 1).",
            "El sistema verifica que el usuario y el correo no estén registrados (Excepción 2).",
            "El sistema crea el cliente y el usuario con rol Cliente (Excepción 3).",
            "El sistema confirma el registro y habilita el inicio de sesión.",
        ],
        "exceptions": [
            "Datos inválidos o incompletos: el sistema identifica los campos que deben corregirse y vuelve al paso 2.",
            "Usuario o correo duplicado: el sistema informa el campo en conflicto, conserva los datos válidos y vuelve al paso 2.",
            "Fallo técnico o de base de datos: el sistema no crea registros parciales, informa que no pudo completar el registro y finaliza el caso de uso.",
        ],
    },
    "CU002": {
        "flow": [
            "El usuario ingresa su usuario o correo y contraseña en el portal correspondiente (Excepción 1).",
            "La API valida las credenciales, el estado de la cuenta y el bloqueo temporal (Excepciones 2 y 3).",
            "La API verifica que el rol de la cuenta corresponda al portal utilizado (Excepción 4).",
            "El sistema emite la sesión segura (Excepción 5).",
            "El sistema dirige al espacio correspondiente y muestra únicamente los módulos autorizados (Excepción 6).",
        ],
        "exceptions": [
            "Datos de acceso incompletos o con formato inválido: el sistema muestra la validación y vuelve al paso 1.",
            "Usuario inexistente o contraseña incorrecta: el sistema registra el intento fallido, muestra un mensaje genérico y vuelve al paso 1.",
            "Cuenta bloqueada o quinto intento fallido: el sistema informa el tiempo de bloqueo progresivo y finaliza el caso de uso.",
            "Portal incompatible con el rol: el sistema deniega el acceso, registra el intento y finaliza el caso de uso.",
            "Fallo al emitir la sesión: el sistema no autentica al usuario, informa que no pudo iniciar la sesión y finaliza el caso de uso.",
            "Permiso insuficiente para un módulo: el sistema oculta o deniega el recurso; la sesión continúa en los módulos autorizados.",
        ],
    },
    "CU003": {
        "flow": [
            "El usuario selecciona Olvidé mi clave.",
            "Indica su usuario o correo y el portal de acceso (Excepción 1).",
            "El sistema procesa la solicitud y presenta una respuesta genérica (Excepciones 2 y 3).",
            "El usuario abre el enlace temporal recibido (Excepción 4).",
            "Define y confirma una contraseña nueva que cumple la política de seguridad (Excepción 5).",
            "El sistema actualiza la contraseña, consume el token e invalida las sesiones anteriores (Excepción 6).",
        ],
        "exceptions": [
            "Identificador o portal inválido: el sistema muestra la validación y vuelve al paso 2.",
            "Cuenta no encontrada o incompatible con el portal: el sistema conserva la respuesta genérica, no envía correo y finaliza el caso de uso.",
            "Servicio de correo no configurado o no disponible: el sistema informa que la recuperación no está disponible y finaliza el caso de uso.",
            "Token inválido, vencido o utilizado: el sistema rechaza el enlace y finaliza el caso de uso.",
            "Contraseñas diferentes o contraseña débil: el sistema muestra la regla incumplida y vuelve al paso 5.",
            "Fallo técnico o de base de datos: el sistema no confirma el cambio y finaliza el caso de uso sin consumir parcialmente la operación.",
        ],
    },
    "CU004": {
        "flow": [
            "El cliente autenticado abre Mi portal y selecciona registrar mascota (Excepción 1).",
            "Completa la ficha de la mascota (Excepción 2).",
            "Selecciona una especie y una raza asociada a esa especie (Excepción 3).",
            "El sistema vincula la mascota con el cliente de la sesión y guarda el registro (Excepción 4).",
            "El sistema actualiza la lista de mascotas del cliente.",
        ],
        "exceptions": [
            "Sesión sin cliente activo vinculado o sin permiso de portal: el sistema deniega la operación y finaliza el caso de uso.",
            "Datos obligatorios incompletos o valores inválidos: el sistema identifica los campos y vuelve al paso 2.",
            "Especie o raza inexistente, inactiva o no relacionada: el sistema rechaza la selección y vuelve al paso 3.",
            "Fallo técnico o de base de datos: el sistema no registra la mascota, informa el fallo y finaliza el caso de uso.",
        ],
    },
    "CU005": {
        "flow": [
            "El cliente autenticado selecciona una de sus mascotas, la fecha y la hora de la cita (Excepciones 1 y 2).",
            "Describe el motivo y selecciona los síntomas, si corresponde (Excepción 3).",
            "El sistema valida la propiedad de la mascota y la disponibilidad del horario (Excepciones 4 y 5).",
            "El sistema determina el nivel de riesgo inicial a partir de los síntomas o conserva el nivel permitido (Excepción 6).",
            "El sistema registra la cita como Pendiente y la muestra en Mis citas (Excepción 7).",
        ],
        "exceptions": [
            "Fecha, hora o mascota sin seleccionar o con formato inválido: el sistema muestra la validación y vuelve al paso 1.",
            "Sesión sin cliente activo vinculado: el sistema deniega la solicitud y finaliza el caso de uso.",
            "Motivo obligatorio ausente o datos de síntomas inválidos: el sistema muestra la validación y vuelve al paso 2.",
            "La mascota no pertenece al cliente autenticado o está inactiva: el sistema deniega el acceso y finaliza el caso de uso.",
            "Horario ocupado: el sistema informa el conflicto y vuelve al paso 1 para elegir otra fecha u hora.",
            "Síntomas sin coincidencia con una regla activa: el sistema asigna el nivel no urgente definido y continúa en el paso 5.",
            "Fallo técnico o de base de datos: el sistema no registra la cita, informa el fallo y finaliza el caso de uso.",
        ],
    },
    "CU006": {
        "flow": [
            "El empleado o administrador accede al directorio de clientes y mascotas (Excepción 1).",
            "Busca, crea o actualiza la ficha del propietario (Excepciones 2 y 3).",
            "Registra o actualiza la mascota asociada al propietario (Excepción 4).",
            "Asigna una especie y, cuando corresponde, una raza válida (Excepción 5).",
            "El sistema guarda las relaciones y muestra los cambios (Excepción 6).",
        ],
        "exceptions": [
            "Usuario sin los permisos requeridos: el sistema deniega el acceso y finaliza el caso de uso.",
            "Datos del cliente inválidos o incompletos: el sistema identifica los campos y vuelve al paso 2.",
            "Correo, DPI u otro dato único en conflicto: el sistema informa el dato duplicado y vuelve al paso 2.",
            "Propietario inexistente o datos de mascota inválidos: el sistema rechaza el registro y vuelve al paso 3.",
            "Especie o raza inexistente, inactiva o no relacionada: el sistema rechaza la selección y vuelve al paso 4.",
            "Fallo técnico o de base de datos: el sistema no confirma los cambios; si se solicitó una baja, conserva la integridad del historial y finaliza el caso de uso.",
        ],
    },
    "CU007": {
        "flow": [
            "El empleado o administrador autorizado consulta la agenda (Excepción 1).",
            "Crea o modifica la fecha, hora, cliente, mascota y motivo de la cita (Excepciones 2, 3 y 4).",
            "Clasifica los síntomas automáticamente o selecciona un nivel de riesgo permitido (Excepción 5).",
            "Actualiza el estado de atención con uno de los estados admitidos (Excepción 6).",
            "El sistema guarda los cambios y los refleja en la agenda y los reportes (Excepción 7).",
        ],
        "exceptions": [
            "Usuario sin permiso para gestionar citas: el sistema deniega el acceso y finaliza el caso de uso.",
            "Datos obligatorios, fecha, hora o estado con formato inválido: el sistema muestra la validación y vuelve al paso 2.",
            "Cliente o mascota inexistente o inactiva: el sistema rechaza la referencia y vuelve al paso 2.",
            "Horario duplicado: el sistema informa el conflicto y vuelve al paso 2 para elegir otro horario.",
            "Nivel de riesgo inexistente o datos de triaje inválidos: el sistema rechaza la clasificación y vuelve al paso 3.",
            "Estado no permitido: el sistema conserva el estado anterior y vuelve al paso 4.",
            "Fallo técnico o de base de datos: el sistema no confirma la modificación y finaliza el caso de uso.",
        ],
    },
    "CU008": {
        "flow": [
            "El empleado o administrador autorizado selecciona la mascota y, si existe, la cita relacionada (Excepciones 1 y 2).",
            "Registra el motivo de consulta, antecedentes, signos y diagnóstico (Excepción 3).",
            "Añade tratamiento, medicamentos, observaciones y próxima cita, cuando corresponda (Excepción 4).",
            "El sistema valida y vincula cliente, mascota, cita y profesional (Excepción 5).",
            "El sistema guarda la atención en el historial clínico (Excepción 6).",
        ],
        "exceptions": [
            "Usuario sin permiso para gestionar el historial: el sistema deniega el acceso y finaliza el caso de uso.",
            "Mascota o cita inexistente o inactiva: el sistema rechaza la referencia y vuelve al paso 1.",
            "Motivo de consulta ausente o datos clínicos inválidos: el sistema identifica los campos y vuelve al paso 2.",
            "Fecha o dato opcional con formato inválido: el sistema muestra la validación y vuelve al paso 3.",
            "Cliente, mascota, cita o profesional no compatibles: el sistema no crea el historial y vuelve al paso 1 para corregir la selección.",
            "Fallo técnico o de base de datos: el sistema no guarda el registro clínico, informa el fallo y finaliza el caso de uso.",
        ],
    },
    "CU009": {
        "flow": [
            "El empleado o administrador autorizado selecciona una mascota existente (Excepciones 1 y 2).",
            "Elige registrar un tratamiento o una vacuna.",
            "Completa el medicamento o vacuna, las indicaciones, el estado y las fechas requeridas (Excepción 3).",
            "El sistema identifica al profesional responsable y valida las referencias (Excepción 4).",
            "El sistema guarda la información y la muestra en el módulo clínico (Excepción 5).",
        ],
        "exceptions": [
            "Usuario sin permiso para gestionar tratamientos o vacunas: el sistema deniega el acceso y finaliza el caso de uso.",
            "Mascota inexistente o inactiva: el sistema rechaza la selección y vuelve al paso 1.",
            "Datos obligatorios, estado o fechas inválidos: el sistema muestra la validación y vuelve al paso 3.",
            "Profesional o referencia clínica inexistente: el sistema rechaza la referencia y vuelve al paso 4.",
            "Fallo técnico o de base de datos: el sistema no guarda el tratamiento o la vacuna, informa el fallo y finaliza el caso de uso.",
        ],
    },
    "CU010": {
        "flow": [
            "El empleado o administrador autorizado selecciona un producto activo y el tipo de movimiento (Excepciones 1 y 2).",
            "Indica una cantidad positiva y el motivo del movimiento (Excepción 3).",
            "El sistema consulta y valida las existencias disponibles (Excepciones 4 y 5).",
            "El sistema registra el movimiento y actualiza el stock dentro de una transacción (Excepción 6).",
            "El sistema confirma el nuevo saldo, que queda disponible para los reportes.",
        ],
        "exceptions": [
            "Usuario sin permiso para gestionar inventario: el sistema deniega el acceso y finaliza el caso de uso.",
            "Tipo de movimiento no permitido: el sistema muestra la validación y vuelve al paso 1.",
            "Cantidad no positiva o motivo vacío: el sistema identifica el campo y vuelve al paso 2.",
            "Producto inexistente o inactivo: el sistema informa que el recurso no está disponible y vuelve al paso 1.",
            "Salida superior al stock disponible: el sistema conserva las existencias, informa el conflicto y vuelve al paso 2.",
            "Fallo técnico o de base de datos: el sistema revierte la transacción, no modifica el stock y finaliza el caso de uso.",
        ],
    },
    "CU011": {
        "flow": [
            "El empleado o administrador autorizado agrega productos o servicios activos al detalle de la venta (Excepciones 1 y 2).",
            "Indica las cantidades, el cliente y el método de pago (Excepciones 3 y 4).",
            "El sistema calcula el subtotal, el IVA y el total con los precios vigentes.",
            "El usuario confirma la venta; el sistema valida el stock y registra venta, detalle, pago y movimientos de inventario en una transacción (Excepciones 5 y 6).",
            "El sistema muestra el ticket interno para su consulta o impresión (Excepción 7).",
        ],
        "exceptions": [
            "Usuario sin permiso para gestionar ventas: el sistema deniega el acceso y finaliza el caso de uso.",
            "Producto o servicio inexistente o inactivo: el sistema identifica el elemento y vuelve al paso 1.",
            "Detalle vacío o cantidad no positiva: el sistema muestra la validación y vuelve al paso 1.",
            "Cliente inexistente o método de pago no permitido: el sistema rechaza los datos y vuelve al paso 2.",
            "Stock insuficiente: el sistema no registra la venta, informa el producto afectado y vuelve al paso 1.",
            "Fallo técnico o de base de datos: el sistema revierte toda la transacción, conserva las existencias y finaliza el caso de uso.",
            "Ticket no disponible para el identificador solicitado: el sistema informa que no encontró el recurso; la venta ya confirmada se conserva y finaliza el caso de uso.",
        ],
    },
    "CU012": {
        "flow": [
            "El administrador accede a Usuarios, Empresa, reglas de riesgo o Auditoría (Excepción 1).",
            "Crea o modifica cuentas y asigna un rol existente (Excepciones 2, 3 y 4).",
            "Actualiza los datos institucionales o las reglas de triaje (Excepciones 5 y 6).",
            "El sistema valida y persiste los cambios (Excepción 7).",
            "El administrador revisa la bitácora generada (Excepción 8).",
        ],
        "exceptions": [
            "Usuario no autenticado, rol distinto de Administrador o permiso insuficiente: el sistema deniega el acceso y finaliza el caso de uso.",
            "Datos de cuenta inválidos o contraseña débil: el sistema identifica los campos y vuelve al paso 2.",
            "Usuario o correo duplicado: el sistema informa el campo en conflicto y vuelve al paso 2.",
            "Rol inexistente o inactivo: el sistema rechaza la asignación y vuelve al paso 2.",
            "Datos institucionales incompletos o inválidos: el sistema muestra la validación y vuelve al paso 3.",
            "Regla de riesgo sin palabras clave, con prioridad fuera de rango o datos inválidos: el sistema rechaza la regla y vuelve al paso 3.",
            "Fallo técnico o de base de datos: el sistema no confirma los cambios y finaliza el caso de uso.",
            "Bitácora no disponible por un fallo de consulta: el sistema informa el fallo sin alterar la configuración y finaliza el caso de uso.",
        ],
    },
    "CU013": {
        "flow": [
            "El administrador o usuario autorizado abre Reportes o Evaluación (Excepción 1).",
            "El sistema consulta y presenta los indicadores operativos disponibles (Excepciones 2 y 3).",
            "En Evaluación, el usuario registra una medición real de fase Pre o Post (Excepción 4).",
            "El sistema calcula promedios y variaciones cuando existen datos de ambas fases (Excepciones 5 y 6).",
            "El sistema conserva las mediciones y deja la evidencia disponible para anexos y conclusiones (Excepción 7).",
        ],
        "exceptions": [
            "Usuario sin permiso para consultar reportes o gestionar la evaluación: el sistema deniega el acceso y finaliza el caso de uso.",
            "No existen registros operativos: el sistema muestra valores vacíos o cero y continúa en el paso 3 si el usuario trabaja en Evaluación.",
            "Fallo al consultar los indicadores: el sistema informa que los reportes no están disponibles y finaliza el caso de uso.",
            "Fase, fecha o valores fuera de los rangos admitidos: el sistema identifica los campos y vuelve al paso 3.",
            "Solo existe una fase: el sistema muestra los promedios disponibles, omite la comparación y continúa en el paso 5 sin afirmar impacto.",
            "Un valor base es cero o falta un promedio comparable: el sistema deja la variación correspondiente sin calcular y continúa en el paso 5.",
            "Fallo técnico o de base de datos al guardar: el sistema no confirma la medición y finaliza el caso de uso.",
        ],
    },
}


def replace_paragraph_text(paragraph, lines):
    first_rpr = None
    if paragraph.runs and paragraph.runs[0]._r.rPr is not None:
        first_rpr = deepcopy(paragraph.runs[0]._r.rPr)
    for child in list(paragraph._p):
        if child.tag == qn("w:r") or child.tag == qn("w:hyperlink"):
            paragraph._p.remove(child)
    run = paragraph.add_run()
    if first_rpr is not None:
        run._r.insert(0, first_rpr)
    for index, line in enumerate(lines):
        if index:
            run.add_break()
        run.add_text(f"{index + 1}) {line}")


def find_case_tables(document):
    result = {}
    for table in document.tables:
        if len(table.rows) >= 4 and len(table.columns) == 2:
            case_id = table.cell(0, 1).text.strip()
            if case_id in CASES:
                result[case_id] = table
    return result


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    document = Document(SOURCE)
    tables = find_case_tables(document)
    missing = sorted(set(CASES) - set(tables))
    if missing:
        raise RuntimeError(f"No se encontraron las tablas: {', '.join(missing)}")

    for case_id, content in CASES.items():
        table = tables[case_id]
        replace_paragraph_text(table.cell(2, 1).paragraphs[0], content["flow"])
        replace_paragraph_text(table.cell(3, 1).paragraphs[0], content["exceptions"])

        # Permitir crecimiento natural y repetir únicamente filas marcadas como encabezado.
        for row in table.rows:
            tr_pr = row._tr.get_or_add_trPr()
            tr_height = tr_pr.find(qn("w:trHeight"))
            if tr_height is not None:
                tr_pr.remove(tr_height)

    settings = document.settings._element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
