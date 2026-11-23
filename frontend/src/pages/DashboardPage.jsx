import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  ClipboardPlus,
  Dna,
  PawPrint,
  PackageCheck,
  ShoppingCart,
  Stethoscope,
  Users,
  UserRoundCog,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import SimpleChart from '../components/SimpleChart';
import DonutChart from '../components/DonutChart';
import DataTable from '../components/DataTable';
import { RiskBadge, StatusBadge } from '../components/Badges';
import { api, getApiError } from '../services/api';

const metricIcons = {
  usuarios: UserRoundCog,
  clientes: Users,
  mascotas: PawPrint,
  citasHoy: CalendarCheck,
  tratamientosActivos: Stethoscope,
  productosServicios: PackageCheck,
  ventas: ShoppingCart,
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .dashboard()
      .then(setDashboard)
      .catch((requestError) => setError(getApiError(requestError)));
  }, []);

  if (error) {
    return <div className="notice danger">{error}</div>;
  }

  if (!dashboard) {
    return <div className="notice">Cargando dashboard...</div>;
  }

  const metrics = [
    ['usuarios', 'Usuarios', 'purple'],
    ['clientes', 'Clientes', 'blue'],
    ['mascotas', 'Mascotas', 'green'],
    ['citasHoy', 'Citas de hoy', 'orange'],
    ['tratamientosActivos', 'Tratamientos activos', 'red'],
    ['productosServicios', 'Productos/servicios', 'blue'],
    ['ventas', 'Ventas', 'purple'],
  ];

  return (
    <div className="page-stack">
      <section className="metrics-grid">
        {metrics.map(([key, label, tone]) => (
          <MetricCard
            key={key}
            icon={metricIcons[key]}
            label={label}
            value={dashboard.resumen[key]}
            tone={tone}
          />
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid-featured">
        <DonutChart title="Especies" data={dashboard.graficas.mascotasPorEspecie} icon={Dna} />
        <DonutChart title="Mascotas por sexo" data={dashboard.graficas.mascotasPorSexo} icon={PawPrint} />
        <SimpleChart title="Citas por estado" data={dashboard.graficas.citasPorEstado} />
        <SimpleChart title="Servicios mas solicitados" data={dashboard.graficas.serviciosSolicitados} />
        <SimpleChart title="Demanda por fecha" data={dashboard.graficas.demandaPorFecha} />
      </section>

      <section className="content-grid">
        <article className="panel span-2">
          <div className="section-title">
            <h2>Agenda de hoy</h2>
            <span>{dashboard.citasHoy.length} registros</span>
          </div>
          <DataTable
            rows={dashboard.citasHoy}
            columns={[
              { key: 'hora', label: 'Hora' },
              { key: 'cliente', label: 'Cliente' },
              { key: 'mascota', label: 'Mascota' },
              { key: 'motivo', label: 'Motivo' },
              { key: 'riesgo', label: 'Riesgo', render: (row) => <RiskBadge risk={row.riesgo} /> },
              { key: 'estado', label: 'Estado', render: (row) => <StatusBadge value={row.estado} /> },
            ]}
          />
        </article>

        <article className="panel">
          <div className="section-title">
            <h2>Alertas</h2>
            <ClipboardPlus size={18} />
          </div>
          <div className="alert-list">
            {dashboard.alertas.stockBajo.map((product) => (
              <div key={product.id} className="alert-item">
                <strong>{product.nombre}</strong>
                <span>Stock {product.stock} / minimo {product.stockMinimo}</span>
              </div>
            ))}
            {dashboard.alertas.productosPorVencer.map((product) => (
              <div key={`vence-${product.id}`} className="alert-item warning">
                <strong>{product.nombre}</strong>
                <span>Vence {product.fechaVencimiento}</span>
              </div>
            ))}
            {dashboard.alertas.productosVencidos?.map((product) => (
              <div key={`vencido-${product.id}`} className="alert-item danger">
                <strong>{product.nombre}</strong>
                <span>Vencido desde {product.fechaVencimiento}. Venta bloqueada.</span>
              </div>
            ))}
            {dashboard.alertas.proximasVacunas.map((vaccine) => (
              <div key={`vacuna-${vaccine.id}`} className="alert-item info-box">
                <strong>{vaccine.nombreVacuna}</strong>
                <span>Proxima dosis {vaccine.proximaDosis}</span>
              </div>
            ))}
            <div className="alert-item success">
              <strong>Ventas registradas</strong>
              <span>{dashboard.resumen.ventas} ventas</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
