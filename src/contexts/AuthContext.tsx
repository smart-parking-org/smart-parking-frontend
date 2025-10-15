import { authApi } from '@/config/axios';
import { ACCESS_TOKEN_KEY } from '@/config/constants';
import type { LoginPayload, LoginResponse, MeResponse } from '@/types/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
  user: MeResponse | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    if (!token) return;
    try {
      const { data } = await authApi.get<MeResponse>('/auth/me');
      setUser(data);
    } catch {
      // logout();
    }
  };

  const login = async (payload: LoginPayload) => {
    const { data } = await authApi.post<LoginResponse>('/auth/login', payload);
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    await fetchUserProfile();
  };

  const logout = async () => {
    try {
      await authApi.post('/auth/logout');
    } catch {
      /* empty */
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    (async () => {
      if (token) await fetchUserProfile();
      setLoading(false);
    })();
  }, [token]);

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
}
