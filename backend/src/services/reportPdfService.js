const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const clinicClock = require('../utils/clinicClock');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
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
    if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
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

const money = (value) => `Q ${Number(value || 0).toFixed(2)}`;
const dateText = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const createReportPdf = async (report, company) => {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Reporte general de la clinica');
  pdf.setCreator(company.nombreClinica);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = [];
  let page;
  let y;
  const generated = clinicClock();

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 57, width: PAGE_WIDTH, height: 57, color: colors.green });
    page.drawText(safeText(company.nombreClinica, bold), {
      x: MARGIN, y: PAGE_HEIGHT - 30, size: 12, font: bold, color: colors.white,
      maxWidth: CONTENT_WIDTH,
    });
    page.drawText('REPORTE GENERAL', { x: MARGIN, y: PAGE_HEIGHT - 83, size: 16, font: bold, color: colors.dark });
    page.drawText(`Generado: ${generated.date} ${generated.time} (Guatemala)`, {
      x: MARGIN, y: PAGE_HEIGHT - 101, size: 9, font: regular, color: colors.muted,
    });
    y = PAGE_HEIGHT - 124;
  };

  const ensureSpace = (height) => { if (y - height < MARGIN + 18) newPage(); };
  const section = (title, rows, columns) => {
    ensureSpace(56);
    y -= 14;
    page.drawText(safeText(title, bold), { x: MARGIN, y, size: 11, font: bold, color: colors.green });
    y -= 10;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.8, color: colors.line });
    y -= 10;

    const drawHeading = () => {
      ensureSpace(25);
      page.drawRectangle({ x: MARGIN, y: y - 17, width: CONTENT_WIDTH, height: 19, color: colors.pale });
      let x = MARGIN;
      for (const column of columns) {
        page.drawText(safeText(column.label, bold), { x: x + 7, y: y - 10, size: 8, font: bold, color: colors.dark });
        x += CONTENT_WIDTH * column.part;
      }
      y -= 22;
    };
    drawHeading();
    const values = rows.length ? rows : [{ __empty: true }];
    values.forEach((row, index) => {
      const cells = row.__empty
        ? [wrapText('Sin registros', regular, 8, CONTENT_WIDTH - 14)]
        : columns.map((column) => wrapText(column.value(row), regular, 8, CONTENT_WIDTH * column.part - 14));
      const rowHeight = Math.max(21, Math.max(...cells.map((lines) => lines.length)) * 10 + 8);
      if (y - rowHeight < MARGIN + 18) { newPage(); drawHeading(); }
      if (index % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - rowHeight + 2, width: CONTENT_WIDTH, height: rowHeight, color: colors.stripe });
      let x = MARGIN;
      cells.forEach((lines, cellIndex) => {
        lines.forEach((line, lineIndex) => {
          page.drawText(line, { x: x + 7, y: y - 10 - lineIndex * 10, size: 8, font: regular, color: colors.dark });
        });
        x += CONTENT_WIDTH * (columns[cellIndex]?.part || 1);
      });
      y -= rowHeight;
      page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 2 }, thickness: 0.35, color: colors.line });
    });
    y -= 7;
  };

  const pairRows = (data) => Object.entries(data || {}).map(([label, value]) => ({ label, value }));
  const pairColumns = [
    { label: 'Concepto', part: 0.75, value: (row) => row.label },
    { label: 'Cantidad', part: 0.25, value: (row) => String(row.value) },
  ];
  const productColumns = [
    { label: 'Producto', part: 0.56, value: (row) => row.nombre },
    { label: 'Lote', part: 0.22, value: (row) => row.lote || '-' },
    { label: 'Vence', part: 0.22, value: (row) => dateText(row.fechaVencimiento) },
  ];
  const sales = report.ventas || [];
  newPage();
  section('Indicadores', [
    { label: 'Clientes atendidos', value: report.clientesAtendidos },
    { label: 'Mascotas atendidas', value: report.mascotasAtendidas },
    { label: 'Tratamientos realizados', value: report.tratamientosRealizados },
    { label: 'Inasistencias', value: report.inasistencias },
    { label: 'Ventas registradas', value: sales.length },
    { label: 'Total vendido', value: money(sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)) },
  ], pairColumns);
  section('Citas por estado', pairRows(report.citasPorEstado), pairColumns);
  section('Citas por fecha', pairRows(report.citasPorFecha), pairColumns);
  section('Servicios solicitados', pairRows(report.serviciosMasSolicitados), pairColumns);
  section('Stock bajo', report.productosBajoStock || [], [
    { label: 'Producto', part: 0.68, value: (row) => row.nombre },
    { label: 'Stock', part: 0.16, value: (row) => String(row.stock) },
    { label: 'Minimo', part: 0.16, value: (row) => String(row.stockMinimo) },
  ]);
  section('Productos por vencer', report.productosPorVencer || [], productColumns);
  section('Productos vencidos', report.productosVencidos || [], productColumns);
  section('Ventas registradas', sales, [
    { label: 'No.', part: 0.12, value: (row) => String(row.id) },
    { label: 'Fecha', part: 0.27, value: (row) => dateText(row.creadoEn) },
    { label: 'Pago', part: 0.35, value: (row) => row.metodoPago },
    { label: 'Total', part: 0.26, value: (row) => money(row.total) },
  ]);

  pages.forEach((sheet, index) => {
    const footer = `Pagina ${index + 1} de ${pages.length}`;
    const width = regular.widthOfTextAtSize(footer, 8);
    sheet.drawText(footer, { x: PAGE_WIDTH - MARGIN - width, y: 24, size: 8, font: regular, color: colors.muted });
  });
  return Buffer.from(await pdf.save());
};

module.exports = { createReportPdf, PAGE_WIDTH, PAGE_HEIGHT };
