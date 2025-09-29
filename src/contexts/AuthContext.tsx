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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedToken) setToken(savedToken);
  }, []);

  return <AuthContext.Provider value={{ user, token }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth phải được dùng trong AuthProvider');
  }
  return context;
}
