import { createBrowserRouter, redirect } from 'react-router';

// Layouts
import AuthLayout from '@/components/layout/auth-layout';
import DashboardLayout from '@/components/layout/dashboard-layout';

// Pages
import Login from '@/pages/auth/login';
import NotFound from '@/pages/not-found';
import Parking from '@/pages/dashboard/Parking';
import Index from '@/pages/dashboard/Index';
import Residents from '@/pages/dashboard/Residents';
import Config from '@/pages/dashboard/Config';
import Reports from '@/pages/dashboard/Reports';
import PrivateRoute from '@/components/PrivateRoute';
import { PublicRoute } from '@/components/PublicRoute';
import Unauthorized from '@/pages/unauthorized';

const router = createBrowserRouter([
  {
    path: '/',
    loader: () => redirect('/login'),
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <PublicRoute>
          <Login />
        </PublicRoute>
      </AuthLayout>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <PrivateRoute roles={['admin']}>
        <DashboardLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: 'parking',
        element: <Parking />,
      },
      {
        path: 'residents',
        element: <Residents />,
      },
      {
        path: 'config',
        element: <Config />,
      },
      {
        path: 'reports',
        element: <Reports />,
      },
    ],
  },
  {
    path: '/unauthorized',
    element: (
      <PrivateRoute>
        <Unauthorized />
      </PrivateRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
