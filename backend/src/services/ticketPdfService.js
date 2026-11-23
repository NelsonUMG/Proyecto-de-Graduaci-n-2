const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const MM_TO_POINTS = 72 / 25.4;
const PAGE_WIDTH = 80 * MM_TO_POINTS;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ink = rgb(0.08, 0.1, 0.13);
const money = (value) => `Q ${Number(value || 0).toFixed(2)}`;

const printable = (value, font) => Array.from(String(value ?? '').replace(/\s+/g, ' ').trim())
  .map((character) => {
    try {
      font.encodeText(character);
      return character;
    } catch (_error) {
      return '?';
    }
  }).join('');

const wrap = (value, font, size, maxWidth) => {
  const words = printable(value, font).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const character of word) {
      if (font.widthOfTextAtSize(line + character, size) > maxWidth && line) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

const createTicketPdf = async (ticket) => {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Ticket #${ticket.venta.id}`);
  pdf.setCreator('Clinica Veterinaria El Ganadero');
  const regular = await pdf.embedFont(StandardFonts.Courier);
  const bold = await pdf.embedFont(StandardFonts.CourierBold);
  const rows = [];
  const add = (value, { font = regular, size = 8, height = 10, align = 'left', width = CONTENT_WIDTH } = {}) => {
    for (const text of wrap(value, font, size, width)) rows.push({ type: 'text', text, font, size, height, align });
  };
  const gap = (height = 3) => rows.push({ type: 'gap', height });
  const rule = () => { gap(3); rows.push({ type: 'rule', height: 1 }); gap(4); };

  add(ticket.empresa?.nombreClinica || 'Veterinaria', { font: bold, size: 10, height: 13, align: 'center' });
  add(`NIT: ${ticket.empresa?.nit || 'CF'}`, { size: 8, align: 'center' });
  gap(4);
  add(`Ticket interno #${ticket.venta.id}`);
  add(`Cliente: ${ticket.cliente?.nombre || 'Consumidor final'}`);
  add(`Pago: ${ticket.venta.metodoPago || 'No especificado'}`);
  rule();
  for (const detail of ticket.venta.detalles || []) {
    const description = wrap(`${detail.cantidad} x ${detail.descripcion}`, regular, 8, CONTENT_WIDTH - 54);
    rows.push({ type: 'item', text: description[0], amount: money(detail.total), height: 10 });
    for (const extra of description.slice(1)) rows.push({ type: 'text', text: extra, font: regular, size: 8, height: 10, align: 'left' });
    gap(2);
  }
  rule();
  add(`Subtotal: ${money(ticket.venta.subtotal)}`);
  add(`IVA: ${money(ticket.venta.iva)}`);
  add(`Total: ${money(ticket.venta.total)}`, { font: bold, size: 9, height: 12 });
  gap(5);
  add(`Vendedor: ${ticket.vendedor?.nombre || 'Usuario no disponible'}`, { size: 7, height: 9, align: 'center' });
  add('Gracias por su compra', { size: 8, align: 'center' });

  const height = Math.max(110, MARGIN * 2 + rows.reduce((sum, row) => sum + row.height, 0));
  const page = pdf.addPage([PAGE_WIDTH, height]);
  let y = height - MARGIN;
  for (const row of rows) {
    if (row.type === 'gap') { y -= row.height; continue; }
    if (row.type === 'rule') {
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: ink });
      y -= row.height;
      continue;
    }
    y -= row.height;
    if (row.type === 'item') {
      page.drawText(row.text, { x: MARGIN, y: y + 2, size: 8, font: regular, color: ink });
      page.drawText(row.amount, {
        x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(row.amount, 8), y: y + 2,
        size: 8, font: regular, color: ink,
      });
      continue;
    }
    const width = row.font.widthOfTextAtSize(row.text, row.size);
    const x = row.align === 'center' ? (PAGE_WIDTH - width) / 2 : MARGIN;
    page.drawText(row.text, { x, y: y + 2, size: row.size, font: row.font, color: ink });
  }
  return Buffer.from(await pdf.save());
};

module.exports = { createTicketPdf, PAGE_WIDTH };
