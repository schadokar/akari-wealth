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
import { formatINR } from "@/lib/formatINR";

// --- Mock Data ---

interface AccountSummaryByKind {
  kind: string;
  total: number;
  invested_total: number;
}


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
  InvestedAmount: number;
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summaryByKind, setSummaryByKind] = useState<AccountSummaryByKind[]>([]);
  const [accountsOpen, setAccountsOpen] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8080/accounts")
      .then((res) => res.json())
      .then((data: Account[]) =>
        setAccounts((data ?? []).filter((a) => a.Amount > 0))
      );
    fetch("http://localhost:8080/accounts/summary/kind")
      .then((res) => res.json())
      .then((data: AccountSummaryByKind[]) => setSummaryByKind(data ?? []));
  }, []);

  const assetSummary = summaryByKind.find((s) => s.kind === "ASSET");
  const liabilitySummary = summaryByKind.find((s) => s.kind === "LIABILITY");
  const totalAsset = assetSummary?.total ?? 0;
  const totalLiability = liabilitySummary?.total ?? 0;
  const investedAsset = assetSummary?.invested_total ?? 0;
  const investedLiability = liabilitySummary?.invested_total ?? 0;

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

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Total Assets</CardDescription>
                <CardTitle className="text-2xl">{formatINR(totalAsset)}</CardTitle>
                <p className="text-xs text-muted-foreground">Invested: {formatINR(investedAsset)}</p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Liabilities</CardDescription>
                <CardTitle className="text-2xl">{formatINR(totalLiability)}</CardTitle>
                <p className="text-xs text-muted-foreground">Invested: {formatINR(investedLiability)}</p>
              </CardHeader>
            </Card>
            <Card className={totalAsset - totalLiability >= 0
              ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-red-500/40 bg-red-50/50 dark:bg-red-950/20"
            }>
              <CardHeader>
                <CardDescription>Net Worth</CardDescription>
                <CardTitle className={`text-2xl ${totalAsset - totalLiability >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatINR(totalAsset - totalLiability)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Accounts Section */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setAccountsOpen((prev) => !prev)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Accounts</CardTitle>
                  <CardDescription>Current value across accounts</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${accountsOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
            {accountsOpen && (
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {accounts.map((account) => (
                    <Card key={account.ID}>
                      <CardHeader>
                        <CardDescription>{account.Name}</CardDescription>
                        <CardTitle className="text-xl">
                          {formatINR(account.Amount)}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Invested: {formatINR(account.InvestedAmount)}</p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
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
