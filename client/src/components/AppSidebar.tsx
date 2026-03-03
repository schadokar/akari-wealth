import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboardIcon,
  LandmarkIcon,
  TrendingUpIcon,
  WalletIcon,
  IndianRupeeIcon,
  BarChart3Icon,
  SettingsIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Accounts", href: "/accounts", icon: LandmarkIcon },
  { title: "Investments", href: "/investments", icon: TrendingUpIcon },
  { title: "Expenses", href: "/expenses", icon: WalletIcon },
  { title: "Earnings", href: "/earnings", icon: IndianRupeeIcon },
  { title: "Reports", href: "/reports", icon: BarChart3Icon },
  { title: "Settings", href: "/settings", icon: SettingsIcon },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Akari <span className="text-muted-foreground">明かり</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link to={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
