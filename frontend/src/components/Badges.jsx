const statusMap = {
  Pendiente: 'warning',
  Confirmada: 'success',
  'En espera': 'info',
  'En atencion': 'info',
  Atendida: 'neutral',
  Finalizada: 'neutral',
  Cancelada: 'danger',
  'No asistio': 'danger',
  Activo: 'success',
  Finalizado: 'neutral',
  Suspendido: 'danger',
};

const riskMap = {
  Roja: 'risk-red',
  Naranja: 'risk-orange',
  Amarilla: 'risk-yellow',
  Verde: 'risk-green',
  Azul: 'risk-blue',
};

export function StatusBadge({ value }) {
  return <span className={`badge ${statusMap[value] || 'neutral'}`}>{value || 'Sin estado'}</span>;
}

export function RiskBadge({ risk }) {
  const label = typeof risk === 'string' ? risk : risk?.nombre;
  const color = typeof risk === 'string' ? null : risk?.color;
  const dynamicStyle = /^#[0-9a-f]{6}$/i.test(color || '')
    ? { color, background: `${color}1f` }
    : undefined;
  return <span className={`badge ${dynamicStyle ? '' : riskMap[label] || 'neutral'}`} style={dynamicStyle}>{label || 'Sin riesgo'}</span>;
}
