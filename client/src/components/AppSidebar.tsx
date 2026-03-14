import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboardIcon,
  LandmarkIcon,
  TrendingUpIcon,
  ClipboardCheckIcon,
  HeartPulseIcon,
  BanknoteIcon,
  CalculatorIcon,
  LogOutIcon,
  BriefcaseIcon,
  ReceiptIcon,
  FlagIcon,
  ShieldIcon,
  SunIcon,
  MoonIcon,
  WalletIcon,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Accounts", href: "/accounts", icon: LandmarkIcon },
  { title: "Check In", href: "/checkin", icon: ClipboardCheckIcon },
  { title: "Wealth Health", href: "/health", icon: HeartPulseIcon },
  { title: "Loan Analyser", href: "/loans", icon: BanknoteIcon },
  { title: "Loan Calculator", href: "/loan-calculator", icon: CalculatorIcon },
  { title: "Holdings", href: "/holdings", icon: TrendingUpIcon },
  { title: "Goals", href: "/goals", icon: FlagIcon },
  { title: "Insurance", href: "/insurance", icon: ShieldIcon },
  { title: "Expenses", href: "/expenses", icon: WalletIcon },
  { title: "Salary", href: "/salary", icon: BriefcaseIcon },
  { title: "Taxation", href: "/taxation", icon: ReceiptIcon },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const username = localStorage.getItem("username") ?? "User";
  const { dark, toggle } = useTheme();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  }

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
      <SidebarSeparator />
      <SidebarFooter className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
            {username[0]}
          </div>
          <span className="truncate text-sm font-medium">{username}</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggle}
              className="text-muted-foreground hover:text-foreground"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
              title="Sign out"
            >
              <LogOutIcon className="size-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
