import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { authReady, isAuthenticated } = useAuth();
  const location = useLocation();
  if (!authReady) return <main className="route-loading">Validando sesion...</main>;
  if (isAuthenticated) return <Outlet />;

  const requestedPortal = location.pathname.split('/')[1];
  const accessPath = requestedPortal === 'cliente' ? '/cliente/acceso' : '/empleado/acceso';
  return <Navigate to={accessPath} replace />;
}
