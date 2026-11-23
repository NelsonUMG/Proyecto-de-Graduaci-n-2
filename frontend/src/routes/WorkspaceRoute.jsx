import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homeForUser, portalAllowsRole } from './rolePaths';

export default function WorkspaceRoute() {
  const { workspace } = useParams();
  const { user } = useAuth();

  if (!['cliente', 'empleado', 'admin'].includes(workspace)) {
    return <Navigate to={homeForUser(user)} replace />;
  }

  return portalAllowsRole(workspace, user?.rol)
    ? <Outlet />
    : <Navigate to={homeForUser(user)} replace />;
}
