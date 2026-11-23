import { Printer } from 'lucide-react';

const palette = ['#5faf3f', '#078fa7', '#ec701c', '#cfeebb', '#176d40'];

const printChart = (title, entries, total) => {
  const rows = entries
    .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
    .join('');
  const popup = window.open('', '_blank', 'width=720,height=640');

  if (!popup) {
    window.print();
    return;
  }

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #172554; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          p { color: #475569; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; border-bottom: 1px solid #dbe3ef; padding: 10px; }
          th { background: #f1f5f9; }
          strong { display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Clinica Veterinaria El Ganadero</p>
        <table>
          <thead><tr><th>Categoria</th><th>Total</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2">Sin datos disponibles</td></tr>'}</tbody>
        </table>
        <strong>Total general: ${total}</strong>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};

export default function DonutChart({ title, data = {}, icon: Icon }) {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, value]) => sum + Number(value), 0) || 1;
  let cursor = 0;

  const gradient = entries
    .map(([, value], index) => {
      const start = cursor;
      const size = (Number(value) / total) * 100;
      cursor += size;
      return `${palette[index % palette.length]} ${start}% ${cursor}%`;
    })
    .join(', ');

  return (
    <section className="chart-panel donut-panel">
      <div className="section-title">
        <h3>{Icon ? <Icon size={22} /> : null}{title}</h3>
        <button className="print-chip" type="button" title="Imprimir reporte" onClick={() => printChart(title, entries, total)}>
          <Printer size={16} />
        </button>
      </div>
      <div className="donut-wrap">
        <div className="donut" style={{ background: `conic-gradient(${gradient || '#e2e8f0 0% 100%'})` }}>
          <div className="donut-hole">
            <strong>{total}</strong>
            <span>Total</span>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {entries.map(([label, value], index) => (
          <span key={label}>
            <i style={{ background: palette[index % palette.length] }} />
            {label} ({value})
          </span>
        ))}
      </div>
    </section>
  );
}
