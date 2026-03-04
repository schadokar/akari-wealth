import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";

// --- Types matching backend responses ---

interface DashboardData {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  asset_distribution: Record<string, number>;
  month_over_month?: {
    previous_net_worth: number;
    change: number;
    change_percent: number;
  };
}

interface MonthlySummary {
  month: string;
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  equity_amount: number;
  debt_amount: number;
  commodity_amount: number;
  hybrid_amount: number;
  cash_amount: number;
}

interface Account {
  id: number;
  name: string;
  category: string;
  asset_class: string;
  institution?: string;
  is_active: boolean;
  current_amount?: number;
}

const chartConfig = {
  net_worth: {
    label: "Net Worth",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

const ASSET_CLASS_LABELS: Record<string, string> = {
  equity: "Equity",
  debt: "Debt",
  commodity: "Commodity",
  hybrid: "Hybrid",
  cash: "Cash",
};

// Build "from" month: 6 months ago in YYYY-MM format
function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fromDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
  return { from, to };
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [trendData, setTrendData] = useState<{ month: string; net_worth: number }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsOpen, setAccountsOpen] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8080/api/dashboard")
      .then((res) => res.json())
      .then((data: DashboardData) => setDashboard(data));

    const { from, to } = getMonthRange();
    fetch(`http://localhost:8080/api/summary?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data: MonthlySummary[]) => {
        setTrendData(
          (data ?? []).map((s) => ({
            month: s.month,
            net_worth: s.net_worth,
          }))
        );
      });

    fetch("http://localhost:8080/api/accounts?is_active=true")
      .then((res) => res.json())
      .then((data: Account[]) => setAccounts(data ?? []));
  }, []);

  const totalAssets = dashboard?.total_assets ?? 0;
  const totalLiabilities = dashboard?.total_liabilities ?? 0;
  const netWorth = dashboard?.net_worth ?? 0;
  const mom = dashboard?.month_over_month;
  const assetDist = dashboard?.asset_distribution ?? {};

  // Filter out zero-value asset classes for display
  const assetDistEntries = Object.entries(assetDist).filter(([, v]) => v > 0);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
              S
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-6">
          {/* Net Worth Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <AreaChart data={trendData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    dataKey="net_worth"
                    type="natural"
                    fill="var(--color-primary)"
                    fillOpacity={0.1}
                    stroke="var(--color-primary)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Total Assets</CardDescription>
                <CardTitle className="text-2xl">{formatINR(totalAssets)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Liabilities</CardDescription>
                <CardTitle className="text-2xl">{formatINR(totalLiabilities)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className={netWorth >= 0
              ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-red-500/40 bg-red-50/50 dark:bg-red-950/20"
            }>
              <CardHeader>
                <CardDescription>Net Worth</CardDescription>
                <CardTitle className={`text-2xl ${netWorth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatINR(netWorth)}
                </CardTitle>
                {mom && (
                  <p className={`text-xs ${mom.change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {mom.change >= 0 ? "+" : ""}{formatINR(mom.change)} ({mom.change_percent.toFixed(1)}%) vs last month
                  </p>
                )}
              </CardHeader>
            </Card>
          </div>

          {/* Asset Distribution */}
          {assetDistEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Asset Distribution</CardTitle>
                <CardDescription>Breakdown by asset class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {assetDistEntries.map(([key, value]) => (
                    <Card key={key}>
                      <CardHeader>
                        <CardDescription>{ASSET_CLASS_LABELS[key] ?? key}</CardDescription>
                        <CardTitle className="text-xl">{formatINR(value)}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accounts Section */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setAccountsOpen((prev) => !prev)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Accounts</CardTitle>
                  <CardDescription>{accounts.length} active account{accounts.length !== 1 ? "s" : ""}</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${accountsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            {accountsOpen && (
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {accounts.filter((a) => a.asset_class !== "liability").map((account) => (
                    <Card key={account.id}>
                      <CardHeader>
                        <CardDescription>{account.name}</CardDescription>
                        {account.current_amount !== undefined && (
                          <CardTitle className="text-xl">{formatINR(account.current_amount)}</CardTitle>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="secondary">{account.category}</Badge>
                          <Badge variant="outline">{account.asset_class}</Badge>
                        </div>
                        {account.institution && (
                          <p className="text-xs text-muted-foreground">{account.institution}</p>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                {accounts.some((a) => a.asset_class === "liability") && (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">Liabilities</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {accounts.filter((a) => a.asset_class === "liability").map((account) => (
                        <Card key={account.id} className="border-red-500/40 bg-red-50/50 dark:bg-red-950/20">
                          <CardHeader>
                            <CardDescription>{account.name}</CardDescription>
                            {account.current_amount !== undefined && (
                              <CardTitle className="text-xl text-red-600 dark:text-red-400">{formatINR(account.current_amount)}</CardTitle>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                              <Badge variant="secondary">{account.category}</Badge>
                            </div>
                            {account.institution && (
                              <p className="text-xs text-muted-foreground">{account.institution}</p>
                            )}
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
