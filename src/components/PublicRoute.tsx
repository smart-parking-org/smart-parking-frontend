import { useAuth } from '@/contexts/AuthContext';
import type { JSX } from 'react';
import { Navigate } from 'react-router';

export function PublicRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? <Navigate to="/dashboard" replace /> : children;
}
