import { useAuth } from '@/contexts/AuthContext';
import type { JSX } from 'react';
import { Navigate } from 'react-router';

export function PublicRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
}
