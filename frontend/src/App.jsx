import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import PermissionRoute from './routes/PermissionRoute';
import WorkspaceRoute from './routes/WorkspaceRoute';
import { PortalEntryRoute, PortalLoginRoute, PortalPasswordResetRoute } from './routes/PortalEntryRoute';
import DashboardPage from './pages/DashboardPage';
import ClientPortalPage from './pages/ClientPortalPage';
import { useAuth } from './hooks/useAuth';
import { homeForUser } from './routes/rolePaths';
import {
  AppointmentsPage,
  ClientsPage,
  ClinicalPage,
  InventoryPage,
  PetsPage,
  ReportsPage,
  SalesPage,
  SettingsPage,
  UsersPage,
} from './pages/ManagementPages';
import './App.css';

function IndexRoute() {
  const { can, user } = useAuth();
  if (can('dashboard.ver')) return <DashboardPage />;
  if (can('portal.citas')) return <Navigate to="/cliente/portal" replace />;
  return <Navigate to={homeForUser(user)} replace />;
}

function ClientOnlyRoute() {
  const { user } = useAuth();
  return user?.rol === 'Cliente' ? <ClientPortalPage /> : <Navigate to={homeForUser(user)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalEntryRoute />} />
          <Route path="/acceso" element={<PortalEntryRoute />} />
          <Route path="/login" element={<PortalEntryRoute />} />
          <Route path="/cliente/acceso" element={<PortalLoginRoute portal="cliente" />} />
          <Route path="/empleado/acceso" element={<PortalLoginRoute portal="empleado" />} />
          <Route path="/admin/acceso" element={<PortalLoginRoute portal="admin" />} />
          <Route path="/cliente/restablecer" element={<PortalPasswordResetRoute portal="cliente" />} />
          <Route path="/empleado/restablecer" element={<PortalPasswordResetRoute portal="empleado" />} />
          <Route path="/admin/restablecer" element={<PortalPasswordResetRoute portal="admin" />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<WorkspaceRoute />}>
              <Route path=":workspace" element={<AppLayout />}>
                <Route index element={<IndexRoute />} />
                <Route element={<PermissionRoute permission="portal.citas" />}>
                  <Route path="portal" element={<ClientOnlyRoute />} />
                </Route>
                <Route element={<PermissionRoute permission="clientes.gestionar" />}>
                  <Route path="clientes" element={<ClientsPage />} />
                </Route>
                <Route element={<PermissionRoute permission="mascotas.gestionar" />}>
                  <Route path="mascotas" element={<PetsPage />} />
                </Route>
                <Route element={<PermissionRoute permission="citas.gestionar" />}>
                  <Route path="citas" element={<AppointmentsPage />} />
                </Route>
                <Route element={<PermissionRoute permission="historial.gestionar" />}>
                  <Route path="clinica" element={<ClinicalPage />} />
                </Route>
                <Route element={<PermissionRoute permission="inventario.gestionar" />}>
                  <Route path="inventario" element={<InventoryPage />} />
                </Route>
                <Route element={<PermissionRoute permission="ventas.gestionar" />}>
                  <Route path="ventas" element={<SalesPage />} />
                </Route>
                <Route element={<PermissionRoute permission="reportes.ver" />}>
                  <Route path="reportes" element={<ReportsPage />} />
                </Route>
                <Route element={<PermissionRoute permission="usuarios.gestionar" />}>
                  <Route path="usuarios" element={<UsersPage />} />
                </Route>
                <Route element={<PermissionRoute permission="configuracion.gestionar" />}>
                  <Route path="configuracion" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/cliente/acceso" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
