export default function SimpleChart({ title, data = {} }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, value]) => Number(value)), 1);

  return (
    <section className="chart-panel">
      <div className="section-title">
        <h3>{title}</h3>
      </div>
      <div className="bars">
        {entries.length === 0 ? <p className="empty">Sin datos disponibles</p> : null}
        {entries.map(([label, value]) => (
          <div className="bar-row" key={label}>
            <span>{label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(Number(value) / max) * 100}%` }} />
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
