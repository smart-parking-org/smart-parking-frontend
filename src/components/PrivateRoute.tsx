import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import type { JSX } from 'react';
import type { Role } from '@/types/auth';

interface PrivateRouteProps {
  children: JSX.Element;
  roles?: Role[];
}

export default function PrivateRoute({ children, roles }: PrivateRouteProps) {
  const { token, loading, user } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
