import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Package,
  PawPrint,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Users,
  UserRound,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { accessForUser } from '../routes/rolePaths';

const navItems = [
  { path: '', label: 'Dashboard', icon: Home, permission: 'dashboard.ver' },
  { path: 'portal', label: 'Mi portal', icon: UserRound, permission: 'portal.citas' },
  { path: 'clientes', label: 'Clientes', icon: Users, permission: 'clientes.gestionar' },
  { path: 'mascotas', label: 'Mascotas', icon: PawPrint, permission: 'mascotas.gestionar' },
  { path: 'citas', label: 'Citas', icon: CalendarDays, permission: 'citas.gestionar' },
  { path: 'clinica', label: 'Clinica', icon: Stethoscope, permission: 'historial.gestionar' },
  { path: 'inventario', label: 'Inventario', icon: Package, permission: 'inventario.gestionar' },
  { path: 'ventas', label: 'Ventas', icon: ShoppingCart, permission: 'ventas.gestionar' },
  { path: 'reportes', label: 'Reportes', icon: BarChart3, permission: 'reportes.ver' },
  { path: 'usuarios', label: 'Usuarios', icon: ShieldCheck, permission: 'usuarios.gestionar' },
  { path: 'configuracion', label: 'Empresa', icon: Settings, permission: 'configuracion.gestionar' },
];

export default function AppLayout() {
  const { user, logout, can } = useAuth();
  const { workspace } = useParams();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const basePath = `/${workspace}`;
  const visibleItems = navItems.filter((item) => can(item.permission) && (item.path !== 'portal' || user?.rol === 'Cliente'));

  useEffect(() => {
    const showError = (event) => setActionError(event.detail || 'No se pudo completar la operacion.');
    window.addEventListener('vet-api-error', showError);
    return () => window.removeEventListener('vet-api-error', showError);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate(accessForUser(user), { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <img src="/brand/ganadero-logo.png" alt="" aria-hidden="true" />
          </div>
          <div>
            <strong>EL GANADERO<span>2026</span></strong>
            <small>El Ganadero</small>
          </div>
        </div>

        <nav>
          {visibleItems.map((item) => (
            <NavLink key={item.path} to={item.path ? `${basePath}/${item.path}` : basePath} end={!item.path} onClick={() => setMenuOpen(false)}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-logout" type="button" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="mobile-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <div>
            <span className="eyebrow">Clinica Veterinaria El Ganadero</span>
            <h1>{workspace === 'cliente' ? 'Portal del Cliente' : workspace === 'admin' ? 'Administración' : 'Operación Clínica'}</h1>
          </div>
          <div className="user-chip">
            <ClipboardList size={18} />
            <div>
              <strong>{user?.nombre}</strong>
              <span>{user?.rol}</span>
            </div>
          </div>
        </header>
        {actionError ? <div className="notice danger" role="alert">{actionError}<button className="notice-dismiss" type="button" onClick={() => setActionError('')} aria-label="Cerrar aviso">×</button></div> : null}
        <Outlet />
      </main>
    </div>
  );
}
