import { Navigate, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import PasswordResetPage from '../pages/PasswordResetPage';

const configuredHosts = {
  cliente: import.meta.env.VITE_CLIENT_HOST,
  empleado: import.meta.env.VITE_EMPLOYEE_HOST,
  admin: import.meta.env.VITE_ADMIN_HOST,
};

const prefixes = {
  citas: 'cliente',
  cliente: 'cliente',
  clientes: 'cliente',
  personal: 'empleado',
  empleado: 'empleado',
  empleados: 'empleado',
  admin: 'empleado',
};

const hostPortal = () => {
  const hostname = window.location.hostname.toLowerCase();
  const configured = Object.entries(configuredHosts)
    .find(([, host]) => host && host.toLowerCase() === hostname);
  if (configured) return { portal: configured[0] === 'admin' ? 'empleado' : configured[0], enforced: true };

  const portal = prefixes[hostname.split('.')[0]];
  return portal ? { portal, enforced: true } : { portal: 'cliente', enforced: false };
};

export function PortalEntryRoute() {
  const { portal } = hostPortal();
  return <Navigate to={`/${portal}/acceso`} replace />;
}

export function PortalLoginRoute({ portal }) {
  if (portal === 'admin') return <Navigate to="/empleado/acceso" replace />;
  const host = hostPortal();
  if (host.enforced && host.portal !== portal) {
    return <Navigate to={`/${host.portal}/acceso`} replace />;
  }
  return <LoginPage portal={portal} />;
}

export function PortalPasswordResetRoute({ portal }) {
  const location = useLocation();
  if (portal === 'admin') return <Navigate to={`/empleado/restablecer${location.search}`} replace />;
  const host = hostPortal();
  if (host.enforced && host.portal !== portal) {
    return <Navigate to={`/${host.portal}/acceso`} replace />;
  }
  return <PasswordResetPage portal={portal} />;
}
