import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import type { JSX } from 'react';

export default function PrivateRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}
