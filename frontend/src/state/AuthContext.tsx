import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { Session, User } from '../api';
import { secure } from './storage';

const TOKEN_KEY = 'odtc_token';
const USER_KEY = 'odtc_user';

type AuthState = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<Session>;
  signUp: (p: { name: string; email: string; password: string }) => Promise<Session>;
  signUpCourier: (p: { name: string; email: string; password: string; phone: string }) => Promise<Session>;
  signOut: () => Promise<void>;
  refresh: () => Promise<User | null>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const clear = useCallback(async () => {
    api.setAuthToken(null);
    setUser(null);
    await secure.del(TOKEN_KEY);
    await secure.del(USER_KEY);
  }, []);

  const persist = useCallback(async (s: Session) => {
    api.setAuthToken(s.token);
    setUser(s.user);
    await secure.set(TOKEN_KEY, s.token);
    await secure.set(USER_KEY, JSON.stringify(s.user));
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      clear();
    });
    return () => api.setUnauthorizedHandler(null);
  }, [clear]);

  // Restore the saved session when the app opens.
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await secure.get(TOKEN_KEY);
      if (token) {
        api.setAuthToken(token);
        const cached = await secure.get(USER_KEY);
        if (cached && alive) {
          try {
            setUser(JSON.parse(cached));
          } catch {
            /* ignore */
          }
        }
        try {
          const fresh = await api.me();
          if (alive) {
            setUser(fresh);
            await secure.set(USER_KEY, JSON.stringify(fresh));
          }
        } catch (e: any) {
          // Only a rejected token ends the session. A network error keeps the cached user.
          if (e?.status === 401) await clear();
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [clear]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      signIn: async (email, password) => {
        const s = await api.login(email.trim(), password);
        await persist(s);
        return s;
      },
      signUp: async (p) => {
        const s = await api.register({ ...p, email: p.email.trim(), name: p.name.trim() });
        await persist(s);
        return s;
      },
      signUpCourier: async (p) => {
        const s = await api.registerCourier({ ...p, email: p.email.trim(), name: p.name.trim() });
        await persist(s);
        return s;
      },
      signOut: async () => {
        await api.logout();
        await clear();
      },
      refresh: async () => {
        try {
          const fresh = await api.me();
          setUser(fresh);
          await secure.set(USER_KEY, JSON.stringify(fresh));
          return fresh;
        } catch {
          return null;
        }
      },
    }),
    [user, ready, persist, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
