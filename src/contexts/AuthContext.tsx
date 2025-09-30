import { ACCESS_TOKEN_KEY } from '@/config/constants';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  setLoading: (value: boolean) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedToken) setToken(savedToken);
  }, []);

  const login = (user: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    setUser(user);
    setToken(accessToken);
  };

  return <AuthContext.Provider value={{ user, token, loading, setLoading, login }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
}
