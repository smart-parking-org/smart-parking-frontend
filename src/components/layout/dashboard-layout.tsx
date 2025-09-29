import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import { Outlet } from 'react-router';

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
