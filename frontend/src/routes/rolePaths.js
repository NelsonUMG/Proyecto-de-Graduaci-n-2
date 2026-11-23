export const portalForRole = (role) => {
  if (role === 'Cliente') return 'cliente';
  if (role === 'Administrador') return 'admin';
  return 'empleado';
};

export const homeForUser = (user) => {
  const portal = portalForRole(user?.rol);
  return portal === 'cliente' ? '/cliente/portal' : `/${portal}`;
};

export const accessForUser = (user) => user?.rol === 'Cliente' ? '/cliente/acceso' : '/empleado/acceso';

export const portalAllowsRole = (portal, role) => {
  if (portal === 'cliente') return role === 'Cliente';
  if (portal === 'admin') return role === 'Administrador';
  return ['Empleado', 'Veterinario', 'Recepcion'].includes(role);
};
