const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const clinicClock = require('../utils/clinicClock');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const columns = [
  { title: 'Realizado por', width: 116 },
  { title: 'Accion', width: 120 },
  { title: 'Detalle', width: 166 },
  { title: 'Fecha y hora', width: TABLE_WIDTH - 402 },
];
const colors = {
  green: rgb(0.09, 0.43, 0.26),
  dark: rgb(0.10, 0.16, 0.22),
  muted: rgb(0.39, 0.45, 0.51),
  pale: rgb(0.92, 0.97, 0.94),
  stripe: rgb(0.97, 0.98, 0.98),
  line: rgb(0.83, 0.88, 0.87),
  white: rgb(1, 1, 1),
};

const safeText = (value, font) => Array.from(String(value ?? '').replace(/\s+/g, ' ').trim())
  .map((character) => {
    try { font.encodeText(character); return character; } catch (_error) { return '?'; }
  }).join('');

const wrapText = (value, font, size, width) => {
  const words = safeText(value, font).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const character of word) {
      if (line && font.widthOfTextAtSize(line + character, size) > width) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

const formatAuditDateTime = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}:${values.second}`;
};

const auditActor = (row) => row.usuario
  ? `${row.usuario}${row.rol ? ` (${row.rol})` : ''}`
  : 'No identificado';

const createAuditPdf = async (audit, company) => {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Reporte de auditoria');
  pdf.setCreator(company.nombreClinica || 'Clinica veterinaria');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = [];
  const generated = clinicClock();
  let page;
  let y;

  const drawTableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 22, width: TABLE_WIDTH, height: 24, color: colors.pale });
    let x = MARGIN;
    for (const column of columns) {
      page.drawText(column.title, { x: x + 6, y: y - 14, size: 8, font: bold, color: colors.dark });
      x += column.width;
    }
    y -= 26;
  };

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 56, width: PAGE_WIDTH, height: 56, color: colors.green });
    page.drawText(safeText(company.nombreClinica || 'Clinica veterinaria', bold), {
      x: MARGIN, y: PAGE_HEIGHT - 32, size: 12, font: bold, color: colors.white,
      maxWidth: TABLE_WIDTH,
    });
    page.drawText('REPORTE DE AUDITORIA', {
      x: MARGIN, y: PAGE_HEIGHT - 83, size: 16, font: bold, color: colors.dark,
    });
    page.drawText(`Generado: ${generated.date} ${generated.time} (Guatemala)`, {
      x: MARGIN, y: PAGE_HEIGHT - 100, size: 9, font: regular, color: colors.muted,
    });
    page.drawText(`Registros: ${audit.length}`, {
      x: MARGIN, y: PAGE_HEIGHT - 115, size: 9, font: regular, color: colors.muted,
    });
    y = PAGE_HEIGHT - 136;
    drawTableHeader();
  };

  newPage();
  if (!audit.length) {
    page.drawText('Sin registros de auditoria.', {
      x: MARGIN + 6, y: y - 14, size: 9, font: regular, color: colors.muted,
    });
  }

  audit.forEach((row, index) => {
    const values = [auditActor(row), row.accion || '-', row.detalle || '-', formatAuditDateTime(row.creadoEn)];
    const lines = values.map((value, cellIndex) => wrapText(value, regular, 8, columns[cellIndex].width - 12));
    while (lines.some((cell) => cell.length)) {
      if (y - 22 < MARGIN + 16) newPage();
      const availableLines = Math.max(1, Math.floor((y - (MARGIN + 16) - 8) / 10));
      const lineCount = Math.min(Math.max(...lines.map((cell) => cell.length)), availableLines);
      const rowHeight = Math.max(22, lineCount * 10 + 8);
      if (index % 2 === 1) {
        page.drawRectangle({ x: MARGIN, y: y - rowHeight + 2, width: TABLE_WIDTH, height: rowHeight, color: colors.stripe });
      }
      let x = MARGIN;
      lines.forEach((cell, cellIndex) => {
        cell.splice(0, lineCount).forEach((line, lineIndex) => {
          page.drawText(line, { x: x + 6, y: y - 10 - lineIndex * 10, size: 8, font: regular, color: colors.dark });
        });
        x += columns[cellIndex].width;
      });
      y -= rowHeight;
      page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 2 }, thickness: 0.35, color: colors.line });
    }
  });

  pages.forEach((sheet, index) => {
    const footer = `Pagina ${index + 1} de ${pages.length}`;
    sheet.drawText(footer, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(footer, 8),
      y: 24, size: 8, font: regular, color: colors.muted,
    });
  });
  return Buffer.from(await pdf.save());
};

module.exports = { createAuditPdf, formatAuditDateTime, auditActor, PAGE_WIDTH, PAGE_HEIGHT };
