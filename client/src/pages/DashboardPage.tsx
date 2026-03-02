import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AppSidebar } from "@/components/AppSidebar";
import { KPICard } from "@/components/KPICard";
import { formatINR } from "@/lib/formatINR";

// --- Mock Data ---

const kpis = [
  { title: "Total Portfolio", value: 2845000, trend: "12.4%", trendUp: true },
  { title: "Total Earnings", value: 125000, trend: "8.2%", trendUp: true },
  { title: "Total Expenses", value: 48500, trend: "3.1%", trendUp: false },
  { title: "Net Worth", value: 3215000, trend: "10.6%", trendUp: true },
];


const transactions = [
  {
    date: "2026-02-28",
    type: "Credit",
    category: "Salary",
    amount: 125000,
  },
  {
    date: "2026-02-25",
    type: "Debit",
    category: "SIP — Mutual Fund",
    amount: -15000,
  },
  {
    date: "2026-02-20",
    type: "Debit",
    category: "Rent",
    amount: -18000,
  },
  {
    date: "2026-02-18",
    type: "Debit",
    category: "Groceries",
    amount: -5500,
  },
  {
    date: "2026-02-15",
    type: "Credit",
    category: "Freelance",
    amount: 25000,
  },
];

const portfolioTrend = [
  { month: "Sep", value: 2200000 },
  { month: "Oct", value: 2350000 },
  { month: "Nov", value: 2420000 },
  { month: "Dec", value: 2580000 },
  { month: "Jan", value: 2710000 },
  { month: "Feb", value: 2845000 },
];

const chartConfig = {
  value: {
    label: "Portfolio",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

// --- Page ---

interface Account {
  ID: number;
  Name: string;
  Amount: number;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    fetch("http://localhost:8080/accounts")
      .then((res) => res.json())
      .then((data: Account[]) =>
        setAccounts((data ?? []).filter((a) => a.Amount > 0))
      );
  }, []);

  const accountsTotal = accounts.reduce((sum, a) => sum + a.Amount, 0);

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
          {/* Portfolio Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Trend</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <AreaChart data={portfolioTrend}>
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
                    dataKey="value"
                    type="natural"
                    fill="var(--color-primary)"
                    fillOpacity={0.1}
                    stroke="var(--color-primary)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* KPI Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <KPICard key={kpi.title} {...kpi} />
            ))}
          </div>

          {/* Accounts Section */}
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Current value across accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {accounts.map((account) => (
                  <Card key={account.ID}>
                    <CardHeader>
                      <CardDescription>{account.Name}</CardDescription>
                      <CardTitle className="text-xl">
                        {formatINR(account.Amount)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <Separator />
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Total
                </span>
                <span className="text-lg font-bold">
                  {formatINR(accountsTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Last 5 entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, i) => (
                    <TableRow key={i}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "Credit" ? "default" : "secondary"
                          }
                        >
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.category}</TableCell>
                      <TableCell className="text-right font-medium">
                        {tx.amount > 0 ? "+" : ""}
                        {formatINR(Math.abs(tx.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
