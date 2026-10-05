import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { adminLogin, adminLogout, adminMe } from '../api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

function Provider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    adminMe()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    setAdmin(await adminLogin(email, password));
  }, []);

  const logout = useCallback(async () => {
    await adminLogout().catch(() => {});
    setAdmin(null);
  }, []);

  return <Ctx.Provider value={{ admin, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function AdminShell() {
  return (
    <Provider>
      <Outlet />
    </Provider>
  );
}

export function RequireAdmin({ children }) {
  const { admin, ready } = useAuth();
  const loc = useLocation();
  if (!ready) {
    return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  return children;
}