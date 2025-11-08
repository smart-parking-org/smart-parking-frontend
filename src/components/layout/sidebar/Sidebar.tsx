import { Link, NavLink } from 'react-router';
import {
  Sidebar as SidebarUI,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Home, LayoutDashboard, Settings, Users, FileText, Car, Calendar, Ticket, AlertTriangle } from 'lucide-react';

export default function Sidebar() {
  return (
    <SidebarUI collapsible="icon" className="bg-sidebar h-full">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center px-2 py-1.5">
          <img src="../logo.svg" alt="" className="size-10" />
          <SidebarGroupLabel className="text-lg text-primary">Admin</SidebarGroupLabel>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="shrink-0" />
                    <span>Bảng điều khiển</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/parking" className="flex items-center gap-2">
                    <Home className="shrink-0" />
                    <span>Quản lý bãi</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/users" className="flex items-center gap-2">
                    <Users className="shrink-0" />
                    <span>Người dùng</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/vehicles" className="flex items-center gap-2">
                    <Car className="shrink-0" />
                    <span>Phương tiện</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/reservations" className="flex items-center gap-2">
                    <Calendar className="shrink-0" />
                    <span>Quản lý đặt chỗ</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/monthly-passes" className="flex items-center gap-2">
                    <Ticket className="shrink-0" />
                    <span>Vé tháng</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/violations" className="flex items-center gap-2">
                    <AlertTriangle className="shrink-0" />
                    <span>Vi phạm</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/reports" className="flex items-center gap-2">
                    <FileText className="shrink-0" />
                    <span>Báo cáo</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard/config" className="flex items-center gap-2">
                    <Settings className="shrink-0" />
                    <span>Cài đặt</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter>
        <div className="px-2 py-1.5 text-xs text-muted-foreground">© {new Date().getFullYear()}</div>
      </SidebarFooter>
      <SidebarRail />
    </SidebarUI>
  );
}
