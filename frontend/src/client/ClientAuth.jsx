import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AppLoader from '../components/AppLoader';
import * as api from '../api';

const Ctx = createContext(null);
export const useClient = () => useContext(Ctx);

// Where each kind of account lands after signing in.
export const homeFor = (user, application) => {
  if (!user) return '/signin';
  if (user.role === 'ADMIN') return '/admin';
  if (user.role === 'COURIER' || application) return '/courier/dashboard';
  return '/account';
};

// One session for every role. Pending courier applicants are CLIENT accounts that have an application, and they are treated as riders.
export function ClientProvider({ children }) {
  const [user, setUser] = useState(null);
  const [application, setApplication] = useState(null);
  const [ready, setReady] = useState(false);

  const hydrate = useCallback(async (u) => {
    setUser(u);
    let app = null;
    if (u && u.role === 'CLIENT') { try { app = await api.courierApplication(); } catch { app = null; } }
    setApplication(app);
    return { user: u, application: app };
  }, []);

  useEffect(() => {
    if (!api.hasClientSession()) { setReady(true); return; }
    api.clientMe().then(hydrate).catch(() => { setUser(null); setApplication(null); }).finally(() => setReady(true));
  }, [hydrate]);

  const refresh = useCallback(async () => (await hydrate(await api.clientMe())).user, [hydrate]);
  const login = useCallback(async (email, password) => { const r = await hydrate(await api.clientLogin(email, password)); return homeFor(r.user, r.application); }, [hydrate]);
  const register = useCallback(async (f) => { const r = await hydrate(await api.clientRegister(f)); return homeFor(r.user, r.application); }, [hydrate]);
  const google = useCallback(async (idToken) => { const r = await hydrate(await api.clientGoogle(idToken)); return homeFor(r.user, r.application); }, [hydrate]);
  const adopt = useCallback(async (u, app) => { setUser(u); setApplication(app || null); }, []);
  const logout = useCallback(async () => { await api.clientLogout(); setUser(null); setApplication(null); }, []);

  const value = useMemo(() => ({
    user, application, ready, login, register, google, logout, refresh, adopt, setApplication,
    isRider: !!user && (user.role === 'COURIER' || !!application),
    home: homeFor(user, application),
  }), [user, application, ready, login, register, google, logout, refresh, adopt]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// role: the only role allowed here. Anyone else is sent to their own dashboard.
export function RequireClient({ children, role }) {
  const { user, ready, home } = useClient();
  const loc = useLocation();
  if (!ready) return <AppLoader inline label="Checking your session" />;
  if (!user) return <Navigate to="/signin" replace state={{ from: loc.pathname }} />;
  if (role === 'COURIER' && !(user.role === 'COURIER' || home === '/courier/dashboard')) return <Navigate to={home} replace />;
  if (role === 'CLIENT' && home !== '/account') return <Navigate to={home} replace />;
  return children;
}
