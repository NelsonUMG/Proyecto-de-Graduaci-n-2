from __future__ import annotations

import hashlib
import re
from pathlib import Path
from zipfile import ZipFile

from docx import Document
from docx.oxml.ns import qn


SOURCE = Path(r"C:\Users\Nelson\Desktop\Proyecto de Graduación\MARCO DE ANEXOS.docx")
OUTPUT = Path(r"C:\Users\Nelson\Desktop\PAGINA WEB PROYECTO\output\MARCO_DE_ANEXOS_APA7_SANDOVAL_REVISION_VISUAL_FINAL.docx")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def body_blocks(path: Path) -> list[str]:
    document = Document(path)
    result = []
    for child in document.element.body:
        texts = [node.text or "" for node in child.iter(qn("w:t"))]
        result.append("".join(texts).strip())
    return result


def find_index(values: list[str], prefix: str) -> int:
    return next(index for index, value in enumerate(values) if value.startswith(prefix))


document = Document(OUTPUT)
all_text = "\n".join(
    [paragraph.text for paragraph in document.paragraphs]
    + [cell.text for table in document.tables for row in table.rows for cell in row.cells]
)

source_blocks = body_blocks(SOURCE)
output_blocks = body_blocks(OUTPUT)
source_chapter = find_index(source_blocks, "Capítulo III")
output_chapter = find_index(output_blocks, "Capítulo III")
source_annex = find_index(source_blocks, "Anexos")
output_annex = find_index(output_blocks, "Anexos")

with ZipFile(OUTPUT) as package:
    document_xml = package.read("word/document.xml").decode("utf-8")
    settings_xml = package.read("word/settings.xml").decode("utf-8")
    instructions = re.findall(r"<w:instrText[^>]*>(.*?)</w:instrText>", document_xml)
    simple_instructions = re.findall(r"<w:fldSimple[^>]*w:instr=\"([^\"]+)\"", document_xml)
    field_instructions = instructions + simple_instructions
    sequence_table = [value for value in field_instructions if "SEQ Tabla" in value]
    sequence_figure = [value for value in field_instructions if "SEQ Ilustración" in value or "SEQ Ilustraci&#243;n" in value]
    toc_fields = [value for value in field_instructions if value.strip().startswith("TOC")]
    dirty_begins = len(re.findall(r'w:fldCharType="begin"[^>]*w:dirty="true"', document_xml))
    update_fields = bool(re.search(r"<w:updateFields[^>]*w:val=\"true\"", settings_xml))
    alt_descriptions = re.findall(r"<wp:docPr[^>]*descr=\"([^\"]+)\"", document_xml)

required_ids = [f"REQ{number:03d}" for number in range(1, 32)]
use_case_ids = [f"CU{number:03d}" for number in range(1, 14)]
missing_requirements = [value for value in required_ids if value not in all_text]
missing_use_cases = [value for value in use_case_ids if value not in all_text]
forbidden_placeholders = [value for value in ("Tabla No.", "RF-01", "CU-01", "Modelo lógico de datos de la solución propuesta") if value in all_text]

new_tables = document.tables[5:67]
new_table_geometry_ok = True
new_table_headers_repeat = True
new_table_full_grid = True
new_table_rows_with_cant_split = 0
for table in new_tables:
    tbl_width = table._tbl.tblPr.find(qn("w:tblW"))
    tbl_indent = table._tbl.tblPr.find(qn("w:tblInd"))
    grid = [int(node.get(qn("w:w"))) for node in table._tbl.tblGrid]
    if tbl_width is None or tbl_width.get(qn("w:type")) != "dxa" or int(tbl_width.get(qn("w:w"))) != 9240:
        new_table_geometry_ok = False
    if tbl_indent is None or tbl_indent.get(qn("w:type")) != "dxa" or int(tbl_indent.get(qn("w:w"))) != 120:
        new_table_geometry_ok = False
    if sum(grid) != 9240:
        new_table_geometry_ok = False
    for row in table.rows:
        tr_properties = row._tr.trPr
        if tr_properties is not None and tr_properties.find(qn("w:cantSplit")) is not None:
            new_table_rows_with_cant_split += 1
        grid_position = 0
        for cell_xml in row._tr.findall(qn("w:tc")):
            cell_properties = cell_xml.find(qn("w:tcPr"))
            width_node = cell_properties.find(qn("w:tcW")) if cell_properties is not None else None
            span_node = cell_properties.find(qn("w:gridSpan")) if cell_properties is not None else None
            span = int(span_node.get(qn("w:val"))) if span_node is not None else 1
            expected_width = sum(grid[grid_position:grid_position + span])
            if width_node is None or int(width_node.get(qn("w:w"))) != expected_width:
                new_table_geometry_ok = False
            grid_position += span
        if grid_position != len(grid):
            new_table_geometry_ok = False
    header_properties = table.rows[0]._tr.trPr
    first_row_text = [cell.text.strip() for cell in table.rows[0].cells]
    is_problem_matrix = first_row_text[:1] == ["¿Cuál es el problema?"]
    is_requirement_fiche = first_row_text[:1] == ["Id. Requerimiento"]
    if not (is_problem_matrix or is_requirement_fiche) and (header_properties is None or header_properties.find(qn("w:tblHeader")) is None):
        new_table_headers_repeat = False
    borders = table._tbl.tblPr.find(qn("w:tblBorders"))
    for edge in ("top", "bottom", "left", "right", "insideH", "insideV"):
        node = borders.find(qn(f"w:{edge}")) if borders is not None else None
        if node is None or node.get(qn("w:val")) != "single":
            new_table_full_grid = False

requirement_fiches = [
    table for table in new_tables
    if table.rows and table.rows[0].cells[0].text.strip() == "Id. Requerimiento"
]
use_case_fiches = [
    table for table in new_tables
    if len(table.rows) == 4 and [cell.text.strip() for cell in table.rows[0].cells] == ["ID", table.rows[0].cells[1].text.strip()]
    and table.rows[0].cells[1].text.strip().startswith("CU")
]
screen_field_tables = [
    table for table in new_tables
    if [cell.text.strip() for cell in table.rows[0].cells]
    == ["Campo", "Valor por defecto", "Tipo de campo", "Observación"]
]

required_chapter_headings = [
    "Capítulo III – Análisis de Requerimientos",
    "3.1 Antecedentes",
    "3.2 Impacto",
    "3.3 Beneficios",
    "3.4 Referencias",
    "3.5 Descripción del Problema",
    "3.6 Funcionalidades Requeridas",
    "3.7 Limitaciones y Restricciones",
    "3.8 Requerimientos No Funcionales",
    "3.9 Análisis de Solución Propuesta",
    "3.10 Alcance",
    "3.11 Diseño General del Desarrollo",
    "3.11.1 Casos de Uso",
    "3.11.2 Base de Datos",
    "3.12 Diseño de Elementos",
    "3.13 Arquitectura del Software",
    "3.14 Factibilidades del Proyecto",
    "3.14.1 Factibilidad Técnica",
    "3.14.2 Factibilidad Operativa",
    "3.14.3 Factibilidad Económica",
    "3.14.4 Factibilidad Legal",
    "3.14.4.1 Licenciamientos de Softwares para el Desarrollo del Proyecto",
    "3.14.4.2 Régimen Legal Nacional",
    "3.14.4.3 Acuerdos de Entrega del Proyecto",
    "3.14.5 Factibilidad Ambiental",
    "3.14.5.1 Reducción de hojas de papel",
    "3.15 Recursos del Proyecto",
    "3.16 Cronograma de Actividades del Proyecto",
]
chapter_headings = []
inside_chapter = False
for paragraph in document.paragraphs:
    text = paragraph.text.strip()
    if text.startswith("Capítulo III"):
        inside_chapter = True
    if text == "Anexos":
        break
    if inside_chapter and paragraph.style.name.startswith("Heading"):
        chapter_headings.append(text)

chapter_started = False
active_page_breaks_before = []
for paragraph in document.paragraphs:
    text = paragraph.text.strip()
    if text.startswith("Capítulo III"):
        chapter_started = True
    if text == "Anexos":
        chapter_started = False
    if not chapter_started or paragraph._p.pPr is None:
        continue
    page_break = paragraph._p.pPr.find(qn("w:pageBreakBefore"))
    if page_break is not None and page_break.get(qn("w:val"), "true") not in ("0", "false", "off"):
        active_page_breaks_before.append(text)

print(f"source_sha256={sha256(SOURCE)}")
print(f"output_size={OUTPUT.stat().st_size}")
print(f"sections={len(document.sections)}")
print(f"tables_total={len(document.tables)}")
print(f"tables_new_audited={len(new_tables)}")
print(f"new_table_geometry_ok={new_table_geometry_ok}")
print(f"new_table_headers_repeat={new_table_headers_repeat}")
print(f"new_table_full_grid={new_table_full_grid}")
print(f"new_table_rows_with_cant_split={new_table_rows_with_cant_split}")
print(f"active_page_breaks_before_in_chapter={active_page_breaks_before}")
print(f"requirement_fiches={len(requirement_fiches)}")
print(f"use_case_fiches={len(use_case_fiches)}")
print(f"screen_field_tables={len(screen_field_tables)}")
print(f"chapter_headings_match={chapter_headings == required_chapter_headings}")
print(f"inline_shapes={len(document.inline_shapes)}")
print(f"seq_table_fields={len(sequence_table)}")
print(f"seq_illustration_fields={len(sequence_figure)}")
print(f"toc_fields={len(toc_fields)}")
print(f"dirty_field_begins={dirty_begins}")
print(f"update_fields={update_fields}")
print(f"alt_descriptions={len(alt_descriptions)}")
print(f"missing_requirements={missing_requirements}")
print(f"missing_use_cases={missing_use_cases}")
print(f"forbidden_placeholders={forbidden_placeholders}")
print(f"prefix_preserved={source_blocks[:source_chapter] == output_blocks[:output_chapter]}")
print(f"annexes_preserved={source_blocks[source_annex:] == output_blocks[output_annex:]}")

assert sha256(SOURCE) == "6EC8680D2C9F8154AD6E1F5A73A56D2368FB114D681B895428658A48EC8B2FDA"
assert len(document.sections) == 6
assert len(document.tables) == 69
assert len(new_tables) == 62
assert new_table_geometry_ok
assert new_table_headers_repeat
assert new_table_full_grid
assert new_table_rows_with_cant_split == 0
assert not active_page_breaks_before
assert len(requirement_fiches) == 31
assert len(use_case_fiches) == 13
assert len(screen_field_tables) == 5
assert chapter_headings == required_chapter_headings
assert len(document.inline_shapes) == 62
assert len(sequence_table) == 67
assert len(sequence_figure) == 34
assert len(toc_fields) == 3
assert dirty_begins == 167
assert update_fields
assert len(alt_descriptions) >= 42
assert not missing_requirements
assert not missing_use_cases
assert not forbidden_placeholders
assert source_blocks[:source_chapter] == output_blocks[:output_chapter]
assert source_blocks[source_annex:] == output_blocks[output_annex:]
