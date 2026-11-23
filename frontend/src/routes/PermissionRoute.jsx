import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homeForUser } from './rolePaths';

export default function PermissionRoute({ permission }) {
  const { can, user } = useAuth();

  if (can(permission)) {
    return <Outlet />;
  }

  return <Navigate to={homeForUser(user)} replace />;
}
