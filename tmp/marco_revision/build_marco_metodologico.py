from __future__ import annotations

from pathlib import Path
from shutil import copy2

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt


WORKSPACE = Path(r"C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO")
SOURCE = Path(r"C:\Users\Nelson\Desktop\Proyecto de Graduación\MARCO DE ANEXOS.docx")
OUTPUT_DIR = WORKSPACE / "output"
OUTPUT = OUTPUT_DIR / "MARCO_DE_ANEXOS_MARCO_METODOLOGICO_REEMPLAZADO.docx"
TEMP_DIR = WORKSPACE / "tmp" / "marco_revision"
GANTT = TEMP_DIR / "gantt_original.png"
ARCHITECTURE = TEMP_DIR / "arquitectura_sistema.png"
DATA_MODEL = TEMP_DIR / "modelo_logico_datos.png"


def font(size: int, bold: bool = False):
    filename = "arialbd.ttf" if bold else "arial.ttf"
    path = Path(r"C:\Windows\Fonts") / filename
    return ImageFont.truetype(str(path), size)


def centered_text(draw, box, value, text_font, fill="black"):
    left, top, right, bottom = box
    bounds = draw.multiline_textbbox((0, 0), value, font=text_font, spacing=5, align="center")
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    draw.multiline_text(
        ((left + right - width) / 2, (top + bottom - height) / 2),
        value,
        font=text_font,
        fill=fill,
        spacing=5,
        align="center",
    )


def draw_box(draw, box, value, fill="#ffffff", outline="#1a1a1a", title=False):
    draw.rounded_rectangle(box, radius=12, fill=fill, outline=outline, width=3)
    centered_text(draw, box, value, font(32 if title else 26, bold=title))


def create_architecture_diagram() -> None:
    image = Image.new("RGB", (1800, 1040), "white")
    draw = ImageDraw.Draw(image)

    draw_box(draw, (110, 80, 520, 230), "Clientes\nPortal de citas", fill="#eef5fb", title=True)
    draw_box(draw, (110, 310, 520, 460), "Empleados\nOperación clínica", fill="#eef5fb", title=True)
    draw_box(draw, (110, 540, 520, 690), "Administrador\nConfiguración y auditoría", fill="#eef5fb", title=True)

    draw_box(draw, (700, 200, 1110, 420), "React + Vite\nInterfaz web\nRutas por rol", fill="#f7f7f7", title=True)
    draw_box(draw, (700, 600, 1110, 820), "Node.js + Express\nAPI REST\nValidación y autorización", fill="#f7f7f7", title=True)
    draw_box(draw, (1280, 310, 1690, 600), "SQL Server\nVeterinariaDB\nDatos clínicos, citas,\ninventario y auditoría", fill="#f7f7f7", title=True)

    arrows = [
        ((520, 155), (700, 270)),
        ((520, 385), (700, 310)),
        ((520, 615), (700, 360)),
        ((905, 420), (905, 600)),
        ((1110, 710), (1280, 510)),
    ]
    for start, end in arrows:
        draw.line([start, end], fill="#222222", width=5)
        draw.polygon([(end[0], end[1]), (end[0] - 20, end[1] - 12), (end[0] - 20, end[1] + 12)], fill="#222222")

    note = "Comunicación HTTPS. Control de acceso por roles, sesiones seguras, validación de datos y auditoría."
    centered_text(draw, (170, 895, 1630, 980), note, font(26))
    image.save(ARCHITECTURE)


def create_data_model_diagram() -> None:
    image = Image.new("RGB", (1800, 1120), "white")
    draw = ImageDraw.Draw(image)
    boxes = [
        ((100, 80, 470, 260), "Roles y usuarios\nRoles, permisos, usuarios"),
        ((700, 80, 1070, 260), "Clientes y mascotas\nClientes, mascotas, especies, razas"),
        ((1330, 80, 1700, 260), "Citas y triaje\nCitas, niveles de riesgo, horarios"),
        ((260, 470, 630, 650), "Historia clínica\nHistoriales, tratamientos, vacunas"),
        ((850, 470, 1220, 650), "Inventario y ventas\nProductos, movimientos, ventas, pagos"),
        ((1430, 470, 1760, 650), "Control y soporte\nAuditoría, notificaciones, configuración"),
    ]
    for box, label in boxes:
        draw_box(draw, box, label, fill="#f7f7f7", title=True)

    arrows = [
        ((470, 170), (700, 170)),
        ((1070, 170), (1330, 170)),
        ((885, 260), (445, 470)),
        ((1515, 260), (1035, 470)),
        ((1515, 260), (1595, 470)),
        ((630, 560), (850, 560)),
        ((1220, 560), (1430, 560)),
    ]
    for start, end in arrows:
        draw.line([start, end], fill="#222222", width=5)
        draw.polygon([(end[0], end[1]), (end[0] - 18, end[1] - 10), (end[0] - 18, end[1] + 10)], fill="#222222")

    centered_text(
        draw,
        (130, 835, 1670, 1000),
        "Modelo lógico del sistema: las relaciones se implementan con claves primarias y foráneas,\nconsultas parametrizadas y transacciones para operaciones críticas.",
        font(28),
    )
    image.save(DATA_MODEL)


def set_run_font(run, size: float = 12, bold=None, italic=None):
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def format_body(paragraph, first_line: bool = True):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    paragraph.paragraph_format.line_spacing = 2
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.first_line_indent = Inches(0.5) if first_line else Inches(0)


def format_heading(paragraph, level: int):
    paragraph.paragraph_format.space_before = Pt(12 if level == 1 else 6)
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.line_spacing = 1
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if level == 1 else WD_ALIGN_PARAGRAPH.LEFT
    for run in paragraph.runs:
        set_run_font(run, 12, bold=True, italic=(level == 3))


def set_cell(cell, text, bold: bool = False, width=None):
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1
    run = paragraph.add_run(str(text))
    set_run_font(run, 10.5, bold=bold)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    if width is not None:
        cell.width = Inches(width)


def set_cell_shading(cell, color: str):
    props = cell._tc.get_or_add_tcPr()
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), color)
    props.append(shading)


def apply_table_layout(table, rows, widths):
    table.style = "Table Grid"
    table.autofit = False
    for row_index, row_values in enumerate(rows):
        for column_index, value in enumerate(row_values):
            cell = table.cell(row_index, column_index)
            set_cell(cell, value, bold=(row_index == 0), width=widths[column_index])
            if row_index == 0:
                set_cell_shading(cell, "EDEDED")


def build_document() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    copy2(SOURCE, OUTPUT)
    create_architecture_diagram()
    create_data_model_diagram()

    document = Document(str(OUTPUT))
    start = next(p for p in document.paragraphs if "Capítulo III" in p.text)
    anchor = next(p for p in document.paragraphs if p.text.strip() == "Anexos")
    body = document.element.body
    removing = False
    for child in list(body):
        if child is start._p:
            removing = True
        if child is anchor._p:
            break
        if removing:
            body.remove(child)

    def place(element):
        anchor._p.addprevious(element)

    def paragraph(text="", style="Normal", body=True):
        item = document.add_paragraph(style=style)
        if text:
            run = item.add_run(text)
            set_run_font(run)
        if style == "Normal" and body:
            format_body(item)
        elif style == "Heading 1":
            format_heading(item, 1)
        elif style == "Heading 2":
            format_heading(item, 2)
        elif style == "Heading 3":
            format_heading(item, 3)
        place(item._p)
        return item

    def heading(text, level):
        return paragraph(text, f"Heading {level}", body=False)

    def caption(label, title):
        number = paragraph(label, "Caption", body=False)
        number.paragraph_format.space_after = Pt(0)
        for run in number.runs:
            set_run_font(run, 12, bold=True)
        title_p = paragraph(title)
        title_p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        title_p.paragraph_format.first_line_indent = Inches(0)
        for run in title_p.runs:
            run.italic = True
        return number, title_p

    def note(text):
        item = paragraph("", body=False)
        item.alignment = WD_ALIGN_PARAGRAPH.LEFT
        item.paragraph_format.line_spacing = 2
        item.paragraph_format.space_after = Pt(0)
        first = item.add_run("Nota. ")
        set_run_font(first, bold=True)
        rest = item.add_run(text)
        set_run_font(rest)
        return item

    def table(rows, widths):
        item = document.add_table(rows=len(rows), cols=len(rows[0]))
        apply_table_layout(item, rows, widths)
        place(item._tbl)
        return item

    def picture(path, width=6.2):
        item = document.add_paragraph()
        item.alignment = WD_ALIGN_PARAGRAPH.CENTER
        item.add_run().add_picture(str(path), width=Inches(width))
        place(item._p)
        return item

    paragraph("", body=False).add_run().add_break(WD_BREAK.PAGE)
    heading("Capítulo III - Marco Metodológico", 1)
    paragraph(
        "Este capítulo describe el proceso metodológico, funcional y técnico utilizado para "
        "desarrollar el sistema web de gestión de citas y tratamientos para la clínica veterinaria "
        "El Ganadero, ubicada en la zona 18 de la Ciudad de Guatemala. La propuesta se formula a "
        "partir del levantamiento de información, los resultados de la encuesta, los procesos "
        "observados y los requerimientos validados con la clínica."
    )

    heading("3.1 Antecedentes", 2)
    paragraph(
        "La clínica veterinaria El Ganadero evolucionó de una farmacia a un establecimiento de "
        "atención veterinaria. Sus procesos de programación de citas, registro de pacientes, "
        "tratamientos, vacunas y control administrativo se realizaban principalmente por WhatsApp, "
        "agendas físicas y documentos dispersos. Esta situación dificultaba consultar la disponibilidad, "
        "mantener un historial clínico ordenado y obtener información para la toma de decisiones."
    )
    paragraph(
        "Como parte del diagnóstico se aplicó una encuesta de escala Likert a 30 personas: cinco "
        "vinculadas directamente con la clínica y veinticinco participantes de clínicas con procesos "
        "similares. El resultado preliminar fue de 990 puntos, ubicado en el rango de respuesta "
        "neutral con tendencia favorable hacia la automatización. Estos hallazgos respaldan la "
        "necesidad de centralizar los registros y mejorar la organización de las citas."
    )

    heading("3.2 Impacto", 2)
    paragraph(
        "El impacto esperado se evalúa en la eficiencia operativa y en la calidad de atención. La "
        "variable independiente corresponde al desarrollo e implementación del sistema web; la "
        "variable dependiente corresponde al desempeño de los procesos administrativos y clínicos. "
        "La evaluación compara, antes y después de la implementación, el tiempo para agendar una "
        "cita, el tiempo para localizar un expediente, los errores administrativos, las citas "
        "duplicadas y la satisfacción de los usuarios."
    )
    paragraph(
        "La evidencia se registrará en el módulo de Evaluación del sistema. Para cada fase se "
        "recomienda registrar al menos diez operaciones comparables, capacitar al personal y "
        "mantener condiciones equivalentes de atención. Los resultados se analizarán mediante "
        "reducción porcentual de tiempos, errores y duplicidades, así como variación de la "
        "satisfacción promedio."
    )

    heading("3.3 Beneficios", 2)
    benefits = [
        "Centralización de clientes, mascotas, citas, historiales clínicos, tratamientos y vacunas.",
        "Reducción de consultas manuales y de errores por duplicidad, pérdida o ilegibilidad de registros.",
        "Priorización de citas mediante niveles de riesgo y consulta rápida de disponibilidad.",
        "Acceso separado para clientes, empleados y administración, con permisos según el rol.",
        "Generación de reportes para apoyar el control de inventario, ventas y atención clínica.",
        "Trazabilidad de acciones sensibles mediante auditoría y recuperación de contraseñas con token de un solo uso.",
    ]
    for value in benefits:
        item = paragraph("", "List Paragraph", body=False)
        item.paragraph_format.line_spacing = 2
        item.paragraph_format.space_after = Pt(0)
        run = item.add_run(value)
        set_run_font(run)

    heading("3.4 Referencias", 2)
    paragraph(
        "Los documentos y medios que respaldan la operación actual de la clínica se utilizaron para "
        "identificar datos, responsables y movimientos que deben registrarse en el sistema. Los "
        "formatos de encuesta y las evidencias de aplicación se conservan en los anexos."
    )
    caption("Tabla 6", "Documentos y medios de referencia de la operación actual")
    table(
        [
            ["Tipo", "Referencia", "Uso en el sistema", "Disponibilidad"],
            ["Agenda física", "Registro manual de citas", "Fecha, hora, cliente, mascota y estado de la cita", "Durante el levantamiento"],
            ["Mensajería", "WhatsApp de la clínica", "Solicitud, confirmación y seguimiento de citas", "Durante el levantamiento"],
            ["Expediente", "Historial clínico de mascotas", "Antecedentes, diagnósticos, tratamientos y vacunas", "Según atención"],
            ["Control administrativo", "Comprobantes, inventario y ventas", "Movimientos de productos, pagos y reportes", "Según operación"],
        ],
        [1.05, 1.6, 3.25, 1.1],
    )
    note("La información se utiliza exclusivamente para el análisis, la configuración y la validación del sistema propuesto.")

    heading("3.5 Descripción del Problema", 2)
    caption("Tabla 7", "Descripción del problema y propuesta de solución")
    table(
        [
            ["Situación identificada", "Consecuencia", "Propuesta de solución"],
            ["Citas gestionadas por mensajes y agenda física", "Conflictos de horario, demoras y registros incompletos", "Calendario digital con disponibilidad, estados y portal de citas"],
            ["Expedientes y tratamientos no centralizados", "Búsqueda lenta e información clínica dispersa", "Historial clínico por mascota con tratamientos, vacunas y notas"],
            ["Control manual de inventario y ventas", "Diferencias de existencias y menor trazabilidad", "Movimientos de inventario, productos, ventas y reportes"],
            ["Accesos sin segregación formal", "Riesgo de acceso indebido a datos clínicos y administrativos", "Portales separados, roles, permisos, auditoría y recuperación segura"],
        ],
        [2.05, 2.05, 2.9],
    )

    heading("3.6 Funcionalidades Requeridas", 2)
    paragraph(
        "Los requerimientos se definieron a partir de las necesidades de clientes, personal clínico y "
        "administración. Se priorizan las funciones que permiten registrar, consultar y controlar la "
        "información de la clínica de manera segura."
    )
    heading("3.6.1 Requerimientos de autenticación y acceso", 3)
    caption("Tabla 8", "Requerimientos de autenticación de usuarios")
    table(
        [
            ["ID", "Requerimiento", "Criterio de aceptación"],
            ["RF-01", "Acceso de clientes, empleados y administradores por URL separada", "Cada portal admite únicamente el rol autorizado"],
            ["RF-02", "Registro de clientes", "No se permite correo ni usuario duplicado"],
            ["RF-03", "Inicio de sesión", "Valida credenciales, rol y estado de la cuenta"],
            ["RF-04", "Bloqueo progresivo", "Después de cinco fallos aplica bloqueos de 10 a 120 minutos"],
            ["RF-05", "Recuperación de contraseña", "Envía token de un solo uso con vigencia de 30 minutos"],
            ["RF-06", "Auditoría", "Registra inicio, cierre y operaciones sensibles"],
        ],
        [0.8, 2.85, 3.35],
    )
    heading("3.6.2 Requerimientos de gestión clínica", 3)
    caption("Tabla 9", "Requerimientos funcionales de módulos clínicos y administrativos")
    table(
        [
            ["Módulo", "Funciones principales", "Usuarios autorizados"],
            ["Clientes y mascotas", "Registrar, actualizar y consultar propietarios, especies, razas y mascotas", "Empleado y administrador; cliente para sus mascotas"],
            ["Citas y triaje", "Programar, confirmar, reprogramar, clasificar nivel de riesgo y actualizar estado", "Cliente, empleado y administrador según permiso"],
            ["Historia clínica", "Registrar consultas, diagnósticos, tratamientos, vacunas y observaciones", "Empleado y administrador"],
            ["Inventario y ventas", "Gestionar productos, movimientos, servicios, ventas y pagos", "Empleado y administrador"],
            ["Configuración", "Administrar usuarios, roles, permisos, horarios y reglas de triaje", "Administrador"],
        ],
        [1.35, 3.65, 2.0],
    )
    heading("3.6.3 Requerimientos de reportería y evaluación", 3)
    caption("Tabla 10", "Requerimientos de reportería y medición de impacto")
    table(
        [
            ["ID", "Requerimiento", "Resultado esperado"],
            ["RF-07", "Reporte operativo", "Consultar clientes, citas, historial, inventario y ventas"],
            ["RF-08", "Ticket de venta", "Generar comprobante de una venta registrada"],
            ["RF-09", "Evaluación pre y post", "Registrar tiempos, errores, duplicados y satisfacción"],
            ["RF-10", "Resumen de impacto", "Calcular comparaciones al existir datos de ambas fases"],
        ],
        [0.8, 2.65, 3.55],
    )

    heading("3.7 Limitaciones y Restricciones", 2)
    limits = [
        "La calidad de los resultados depende de que el personal registre las operaciones y mantenga actualizada la información clínica.",
        "La clasificación de triaje apoya la priorización administrativa; no sustituye el criterio del médico veterinario.",
        "La recuperación de contraseña requiere una cuenta institucional de correo y una configuración SMTP válida.",
        "El sistema necesita conexión de red, un navegador actualizado y una instancia SQL Server disponible.",
        "La publicación en Internet requiere dominio, certificados TLS, copias de seguridad y un servidor administrado por la empresa.",
    ]
    for value in limits:
        item = paragraph("", "List Paragraph", body=False)
        item.paragraph_format.line_spacing = 2
        item.paragraph_format.space_after = Pt(0)
        run = item.add_run(value)
        set_run_font(run)

    heading("3.8 Requerimientos No Funcionales", 2)
    caption("Tabla 11", "Descripción de requerimientos no funcionales")
    table(
        [
            ["Categoría", "Requerimiento", "Criterio verificable"],
            ["Seguridad", "Contraseñas con hash, sesiones seguras y permisos por rol", "Acceso rechazado al intentar usar una función no autorizada"],
            ["Disponibilidad", "Persistencia en SQL Server y copias de seguridad programadas", "Restauración comprobada en ambiente de prueba"],
            ["Rendimiento", "Respuesta ágil para operaciones de consulta y registro", "Medición de salud y pruebas de carga básicas"],
            ["Usabilidad", "Interfaz clara, responsive y separada por tipo de usuario", "Navegación sin desbordamiento en escritorio y móvil"],
            ["Mantenibilidad", "Arquitectura cliente, API y base de datos desacopladas", "Cambios controlados mediante código, validación y pruebas"],
        ],
        [1.2, 3.2, 2.6],
    )

    heading("3.9 Análisis de Solución Propuesta", 2)
    paragraph(
        "La solución propuesta es una aplicación web compuesta por un cliente React, una API REST "
        "con Node.js y Express, y una base de datos Microsoft SQL Server. El análisis, diseño y "
        "desarrollo se organizan mediante Rational Unified Process (RUP), en las fases de inicio, "
        "elaboración, construcción y transición. Este enfoque permite documentar los requerimientos, "
        "diseñar el modelo de datos, implementar los módulos y validar la operación con los usuarios."
    )
    paragraph(
        "La propuesta reemplaza la gestión aislada por un repositorio central que registra la información "
        "relacionada con clientes, mascotas, citas, historial clínico, tratamientos, inventario y ventas. "
        "Las operaciones críticas de citas, inventario y ventas se controlan con validaciones y transacciones "
        "para preservar la consistencia de la información."
    )

    heading("3.10 Alcance", 2)
    scope = [
        "Portal de clientes para registro, autenticación, mascotas y solicitud de citas.",
        "Portal de empleados para atención clínica, agenda, triaje, historiales, tratamientos, vacunas, inventario y ventas.",
        "Portal administrativo para usuarios, roles, configuración, auditoría, reportería y evaluación de impacto.",
        "Base de datos relacional para almacenar la información operacional y clínica.",
        "Pruebas unitarias, de integración, compilación y postdespliegue como evidencia técnica.",
    ]
    for value in scope:
        item = paragraph("", "List Paragraph", body=False)
        item.paragraph_format.line_spacing = 2
        item.paragraph_format.space_after = Pt(0)
        run = item.add_run(value)
        set_run_font(run)

    heading("3.11 Diseño General del Desarrollo", 2)
    paragraph(
        "El diseño general define las interacciones de los usuarios, la estructura de los datos y los "
        "componentes de la solución. Se prioriza una interfaz orientada a tareas frecuentes, una API "
        "con validación de entradas y una base de datos con integridad referencial."
    )
    heading("3.11.1 Casos de Uso", 3)
    caption("Tabla 12", "Especificación resumida de casos de uso")
    table(
        [
            ["ID", "Caso de uso", "Actor", "Flujo principal"],
            ["CU-01", "Solicitar cita", "Cliente", "Inicia sesión, selecciona mascota, fecha, hora y motivo; el sistema valida disponibilidad y registra la cita"],
            ["CU-02", "Gestionar atención clínica", "Empleado", "Consulta agenda, clasifica riesgo, registra historial, tratamiento o vacuna y actualiza el estado"],
            ["CU-03", "Administrar acceso", "Administrador", "Crea usuarios, asigna roles y revisa auditoría de operaciones"],
            ["CU-04", "Restablecer contraseña", "Usuario", "Solicita recuperación, recibe enlace temporal y define una nueva contraseña"],
        ],
        [0.75, 1.45, 1.1, 3.7],
    )
    heading("3.11.2 Base de Datos", 3)
    paragraph(
        "El modelo relacional se organiza alrededor de usuarios, clientes, mascotas y citas. Los registros "
        "clínicos se relacionan con tratamientos y vacunas; las operaciones administrativas se conectan "
        "con inventario, ventas, pagos, auditoría, horarios y configuración. Las relaciones se implementan "
        "mediante claves primarias, claves foráneas, índices y consultas parametrizadas."
    )
    caption("Ilustración 6", "Modelo lógico de datos de la solución propuesta")
    picture(DATA_MODEL, 6.2)
    note("El diagrama resume los grupos principales de entidades; el modelo físico completo se implementa en la base de datos VeterinariaDB.")

    heading("3.12 Diseño de Elementos", 2)
    paragraph(
        "Las pantallas se diseñan para facilitar el registro y la consulta de información en tareas recurrentes. "
        "La interfaz utiliza campos validados, tablas de datos, controles de estado y mensajes de error que "
        "permiten al usuario identificar una acción incompleta o no autorizada."
    )
    caption("Tabla 13", "Descripción de elementos de la pantalla de autenticación")
    table(
        [
            ["Elemento", "Tipo", "Comportamiento"],
            ["Usuario o correo", "Campo de entrada", "Valida identificador de cuenta existente"],
            ["Contraseña", "Campo protegido", "Oculta caracteres y valida la política de seguridad"],
            ["Iniciar sesión", "Botón de acción", "Autentica la cuenta y verifica que corresponda al portal"],
            ["Olvidé mi clave", "Enlace", "Solicita un token de recuperación de un solo uso"],
            ["Registro", "Formulario", "Disponible únicamente para el portal de clientes"],
        ],
        [1.65, 1.55, 3.8],
    )

    heading("3.13 Arquitectura del Software", 2)
    paragraph(
        "La arquitectura separa la experiencia de usuario, las reglas de negocio y la persistencia de datos. "
        "React administra la interfaz y los portales; Node.js y Express exponen servicios REST, validan datos "
        "y aplican permisos; SQL Server conserva la información clínica y administrativa. Esta separación "
        "facilita el mantenimiento, las pruebas y la escalabilidad del sistema."
    )
    caption("Ilustración 7", "Arquitectura de la solución web")
    picture(ARCHITECTURE, 6.2)
    note("La aplicación utiliza comunicación HTTPS en producción y conserva la separación entre clientes, API y base de datos.")

    heading("3.14 Factibilidades del Proyecto", 2)
    paragraph(
        "La factibilidad se evaluó desde las dimensiones técnica, operativa, económica, legal y ambiental. "
        "La disponibilidad de herramientas, el apoyo del personal y la posibilidad de desplegar la solución "
        "en infraestructura local o en nube permiten considerar viable la implementación gradual del sistema."
    )
    heading("3.14.1 Factibilidad Técnica", 3)
    caption("Tabla 14", "Resumen de factibilidades de software")
    table(
        [
            ["Componente", "Uso en el proyecto", "Justificación"],
            ["Node.js y Express", "API REST y reglas de negocio", "Manejo de servicios web, validación y operaciones asíncronas"],
            ["React y Vite", "Interfaz de usuario", "Componentes reutilizables y navegación por rol"],
            ["Microsoft SQL Server", "Persistencia de datos", "Integridad relacional, transacciones y auditoría"],
            ["ODBC Driver y SSMS", "Conexión y administración", "Gestión técnica de la instancia de base de datos"],
            ["Correo SMTP", "Recuperación de contraseña", "Entrega de enlaces temporales de restablecimiento"],
        ],
        [1.65, 2.25, 3.1],
    )
    caption("Tabla 15", "Resumen de factibilidades de hardware e infraestructura")
    table(
        [
            ["Recurso", "Requisito mínimo", "Uso"],
            ["Computadora", "Procesador moderno, 8 GB RAM y almacenamiento disponible", "Administración, desarrollo y operación"],
            ["Red e Internet", "Conectividad estable", "Acceso local, respaldo y publicación en nube"],
            ["Servidor o nube", "Instancia para Node.js y SQL Server", "Despliegue controlado de la aplicación"],
            ["Impresora", "Impresión de comprobantes cuando aplique", "Apoyo administrativo"],
        ],
        [1.5, 2.8, 2.7],
    )
    heading("3.14.2 Factibilidad Operativa", 3)
    paragraph(
        "La solución es operativamente viable porque responde a tareas que el personal ya realiza: registrar "
        "citas, consultar mascotas, documentar tratamientos, controlar inventario y atender ventas. La adopción "
        "requiere capacitación inicial, definición de responsables y registro constante de la información. El "
        "diseño por roles limita cada pantalla a las funciones necesarias para el puesto de trabajo."
    )
    heading("3.14.3 Factibilidad Económica", 3)
    paragraph(
        "El desarrollo se realiza como trabajo de graduación, por lo que no se asigna un costo de personal de "
        "desarrollo a la clínica. El presupuesto recoge los recursos de operación, conectividad, impresión, "
        "pruebas y despliegue previstos para la implementación inicial."
    )
    caption("Tabla 16", "Presupuesto estimado para la implementación inicial")
    table(
        [
            ["Cantidad", "Recurso", "Descripción", "Costo"],
            ["1", "Computadora o laptop", "Equipo disponible para administración y pruebas", "Disponible"],
            ["1", "Impresora", "Comprobantes y documentos administrativos", "Q50.00"],
            ["1", "Router WiFi", "Conectividad del equipo local", "Q250.00"],
            ["5", "Puntos de acceso", "Conectividad con QoS limitado a 10 Mbps", "Q150.00"],
            ["-", "Servicio en la nube", "Hosting de API y base de datos administrada", "Q80.00"],
            ["1", "Impresora multifuncional", "Impresión, copia y escaneo", "Q50.00"],
            ["100", "Papel bond carta", "Documentación y apoyo administrativo", "Q200.00"],
            ["-", "Electricidad e Internet", "Energía y conectividad del proyecto", "Q500.00"],
            ["-", "Datos móviles", "Investigación y respaldos", "Q100.00"],
            ["-", "Análisis y pruebas", "Validación funcional del software", "Q100.00"],
            ["", "Total estimado", "", "Q1,480.00"],
        ],
        [0.65, 1.5, 3.35, 1.5],
    )
    note("El total se corrigió de acuerdo con la suma de los rubros detallados en la tabla.")
    heading("3.14.4 Factibilidad Legal", 3)
    paragraph(
        "El sistema debe apoyar el cumplimiento de los procedimientos internos de la clínica y el resguardo "
        "responsable de datos de propietarios y mascotas. El acceso restringido, la auditoría y la trazabilidad "
        "de tratamientos e inventario contribuyen a mantener controles verificables. La operación veterinaria "
        "debe mantenerse alineada con la normativa aplicable de bienestar animal y con los requerimientos de "
        "la autoridad competente."
    )
    heading("3.14.4.1 Licenciamientos de software", 3)
    paragraph(
        "Las herramientas de desarrollo utilizadas disponen de licencias compatibles con el propósito académico "
        "o con las ediciones autorizadas por la empresa. La versión de SQL Server utilizada en producción deberá "
        "contar con una licencia o modalidad de uso válida, y las dependencias de código abierto conservarán sus "
        "licencias y avisos correspondientes."
    )
    heading("3.14.4.2 Acuerdos de entrega y soporte", 3)
    paragraph(
        "La entrega comprende la instalación, las credenciales iniciales, la configuración de la base de datos, "
        "la capacitación al personal y la evidencia de pruebas. Se contempla un período inicial de treinta días "
        "para correcciones y ajustes posteriores a la entrega; cualquier mantenimiento adicional deberá acordarse "
        "entre el propietario de la clínica y el responsable técnico."
    )
    heading("3.14.5 Factibilidad Ambiental", 3)
    paragraph(
        "La digitalización reduce el uso de agendas físicas, formularios repetidos y copias de expedientes. La "
        "clínica puede conservar únicamente los documentos que requiera por razones operativas o normativas, "
        "mientras que el sistema mantiene consultas, reportes y trazabilidad en formato digital."
    )

    heading("3.15 Recursos del Proyecto", 2)
    caption("Tabla 17", "Recursos disponibles")
    table(
        [
            ["Cantidad", "Recurso", "Característica o uso"],
            ["1", "Computadora de escritorio o laptop", "Registro de operaciones y administración"],
            ["1", "Conexión a Internet", "Acceso al sistema y comunicación operativa"],
            ["1", "Impresora", "Comprobantes y documentación cuando aplique"],
            ["-", "Personal de clínica", "Validación de procesos y capacitación"],
        ],
        [0.9, 2.5, 3.6],
    )
    caption("Tabla 18", "Recursos sugeridos para crecimiento")
    table(
        [
            ["Cantidad", "Recurso", "Finalidad"],
            ["1", "Servidor administrado o servicio en nube", "Alojamiento seguro de la aplicación y respaldos"],
            ["1", "Router WiFi", "Conectividad inalámbrica controlada"],
            ["1", "Impresora multifuncional", "Impresión y digitalización de documentos"],
            ["1", "Dominio y certificado TLS", "Publicación segura de los portales"],
        ],
        [0.9, 2.7, 3.4],
    )

    heading("3.16 Cronograma de Actividades del Proyecto", 2)
    paragraph(
        "El cronograma presenta la secuencia prevista desde el anteproyecto y el levantamiento de información "
        "hasta el desarrollo, las pruebas, la implementación y la defensa del proyecto."
    )
    caption("Ilustración 8", "Cronograma de actividades del proyecto")
    picture(GANTT, 6.35)
    note("El cronograma se mantiene como referencia de planificación de Proyecto de Graduación I y II.")
    paragraph("", body=False).add_run().add_break(WD_BREAK.PAGE)

    settings = document.settings.element
    update_fields = settings.find(qn("w:updateFields"))
    if update_fields is None:
        update_fields = OxmlElement("w:updateFields")
        settings.append(update_fields)
    update_fields.set(qn("w:val"), "true")

    document.save(str(OUTPUT))


if __name__ == "__main__":
    build_document()
