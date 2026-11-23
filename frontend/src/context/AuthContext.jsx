import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthContext from './auth-context';
import { api } from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    localStorage.removeItem('vet_token');
    localStorage.removeItem('vet_user');
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true));
  }, []);

  const login = useCallback(async (credentials, portal) => {
    const result = await api.login(credentials, portal);
    setUser(result.user);
    return result.user;
  }, []);

  const registerClient = useCallback(async (payload) => {
    const result = await api.registerClient(payload);
    setUser(result.user);
    return result.user;
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await api.me();
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (user) {
        await api.logout();
      }
    } finally {
      setUser(null);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      authReady,
      login,
      registerClient,
      refreshUser,
      logout,
      isAuthenticated: Boolean(user),
      can: (permission) => user?.permisos?.includes('*') || user?.permisos?.includes(permission),
    }),
    [user, authReady, login, registerClient, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
