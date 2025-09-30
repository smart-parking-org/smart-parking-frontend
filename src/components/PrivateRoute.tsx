import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import type { JSX } from 'react';

interface PrivateRouteProps {
  children: JSX.Element;
  roles?: string[];
}

export default function PrivateRoute({ children, roles }: PrivateRouteProps) {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
