import { createBrowserRouter, redirect } from 'react-router';

// Layouts
import AuthLayout from '@/components/layout/auth-layout';
import DashboardLayout from '@/components/layout/dashboard-layout';

// Pages
import Login from '@/pages/auth/login';
import NotFound from '@/pages/not-found';
import Parking from '@/pages/dashboard/parking';
import Config from '@/pages/dashboard/config';
import Residents from '@/pages/dashboard/residents';
import Reports from '@/pages/dashboard/reports';
import Index from '@/pages/dashboard';

const router = createBrowserRouter([
  {
    path: '/',
    loader: () => redirect('/login'),
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <Login />
      </AuthLayout>
    ),
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
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
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
