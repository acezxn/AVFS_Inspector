import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LoginResult } from '@avfs/shared';
import { api, ApiError } from '../api/client';

interface SessionValue {
  session: LoginResult | null;
  login: (token: string, serverUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Called by the api layer on a 401 to lock the desktop. */
  expire: () => void;
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<LoginResult | null>(null);

  const value = useMemo<SessionValue>(() => ({
    session,
    login: async (token, serverUrl) => {
      const result = await api.login({ token, serverUrl });
      setSession(result);
    },
    logout: async () => {
      try { await api.logout(); } catch { /* ignore */ }
      setSession(null);
    },
    expire: () => setSession(null),
  }), [session]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used within SessionProvider');
  return v;
}

export { ApiError };
