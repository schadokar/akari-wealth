import { useState, useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="ml-1 inline-flex align-middle text-muted-foreground hover:text-foreground transition-colors">
          <InfoIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left whitespace-pre-line">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// --- Types ---

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

// --- Chart Configs ---

const netWorthChartConfig = {
  total_assets: {
    label: "Assets",
    color: "var(--color-chart-2)",
  },
  total_liabilities: {
    label: "Liabilities",
    color: "var(--color-chart-5)",
  },
  net_worth: {
    label: "Net Worth",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

const assetAllocationConfig = {
  equity: { label: "Equity", color: "var(--color-chart-1)" },
  debt: { label: "Debt", color: "var(--color-chart-2)" },
  commodity: { label: "Commodity", color: "var(--color-chart-3)" },
  hybrid: { label: "Hybrid", color: "var(--color-chart-4)" },
  cash: { label: "Cash", color: "var(--color-chart-5)" },
} satisfies ChartConfig;

const debtChartConfig = {
  total_liabilities: {
    label: "Total Liabilities",
    color: "var(--color-chart-5)",
  },
  debt_to_asset: {
    label: "Debt-to-Asset %",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

const waterfallConfig = {
  value: { label: "Change", color: "var(--color-primary)" },
} satisfies ChartConfig;

// --- Helpers ---

function getMonthRange(months: number): { from: string; to: string } {
  const now = new Date();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fromDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const from = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, "0")}`;
  return { from, to };
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString("default", { month: "short", year: "2-digit" });
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

// --- Component ---

export default function HealthPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/dashboard")
      .then((res) => res.json())
      .then((data: DashboardData) => setDashboard(data));

    const { from, to } = getMonthRange(12);
    fetch(`http://localhost:8080/api/summary?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data: MonthlySummary[]) => setSummaries(data ?? []));
  }, []);

  // --- Derived Data ---

  const netWorth = dashboard?.net_worth ?? 0;
  const totalAssets = dashboard?.total_assets ?? 0;
  const totalLiabilities = dashboard?.total_liabilities ?? 0;
  const mom = dashboard?.month_over_month;
  const assetDist = dashboard?.asset_distribution ?? {};

  // Debt-to-Asset ratio
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Solvency ratio (assets / liabilities)
  const solvencyRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : Infinity;

  // Burn rate: average monthly liability change
  const burnRate = useMemo(() => {
    if (summaries.length < 2) return 0;
    const latest = summaries[summaries.length - 1];
    const prev = summaries[summaries.length - 2];
    return latest.total_assets - prev.total_assets;
  }, [summaries]);

  // Net worth trend data for area chart
  const netWorthTrend = useMemo(
    () =>
      summaries.map((s) => ({
        month: formatMonth(s.month),
        total_assets: s.total_assets,
        total_liabilities: s.total_liabilities,
        net_worth: s.net_worth,
      })),
    [summaries]
  );

  // Asset allocation for doughnut chart
  const allocationData = useMemo(() => {
    return Object.entries(assetDist)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: key,
        value,
        fill: `var(--color-${key})`,
      }));
  }, [assetDist]);

  // Debt trend with debt-to-asset ratio for combo chart
  const debtTrend = useMemo(
    () =>
      summaries.map((s) => ({
        month: formatMonth(s.month),
        total_liabilities: s.total_liabilities,
        debt_to_asset: s.total_assets > 0 ? Number(((s.total_liabilities / s.total_assets) * 100).toFixed(1)) : 0,
      })),
    [summaries]
  );

  // Waterfall data for month-to-month changes
  const waterfallData = useMemo(() => {
    if (summaries.length < 2) return [];
    const data: { name: string; value: number; fill: string; start: number; end: number }[] = [];
    // Start with previous month's net worth
    const recent = summaries.slice(-6);
    if (recent.length < 2) return [];

    let running = recent[0].net_worth;
    data.push({
      name: formatMonth(recent[0].month),
      value: running,
      fill: "var(--color-chart-2)",
      start: 0,
      end: running,
    });

    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].net_worth - recent[i - 1].net_worth;
      const start = running;
      running += change;
      data.push({
        name: formatMonth(recent[i].month),
        value: change,
        fill: change >= 0 ? "var(--color-chart-2)" : "var(--color-chart-5)",
        start: Math.min(start, running),
        end: Math.max(start, running),
      });
    }
    return data;
  }, [summaries]);

  // Score calculation
  const healthScore = useMemo(() => {
    let score = 0;
    // Net worth positive: +30
    if (netWorth > 0) score += 30;
    // Debt-to-asset below 50%: +25
    if (debtToAssetRatio < 50) score += 25;
    else if (debtToAssetRatio < 75) score += 15;
    // Month-over-month growth: +25
    if (mom && mom.change > 0) score += 25;
    else if (mom && mom.change === 0) score += 10;
    // Solvency ratio > 2: +20
    if (solvencyRatio > 2) score += 20;
    else if (solvencyRatio > 1) score += 10;
    return score;
  }, [netWorth, debtToAssetRatio, mom, solvencyRatio]);

  const scoreColor =
    healthScore >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : healthScore >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const scoreLabel =
    healthScore >= 80 ? "Excellent" : healthScore >= 50 ? "Good" : "Needs Attention";

  return (
    <TooltipProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Wealth Health</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
              S
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-6">
          {/* Health Score + KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2">
              <CardHeader>
                <CardDescription>Wealth Health Score<InfoTip text={"A composite score (0-100) based on your net worth, debt ratio, monthly growth, and solvency.\n\n80-100: Excellent\n50-79: Good\nBelow 50: Needs Attention"} /></CardDescription>
                <CardTitle className={`text-4xl ${scoreColor}`}>
                  {healthScore}
                  <span className="text-lg text-muted-foreground">/100</span>
                </CardTitle>
                <Badge
                  variant={healthScore >= 80 ? "default" : "secondary"}
                  className="w-fit"
                >
                  {scoreLabel}
                </Badge>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Debt-to-Asset Ratio<InfoTip text={"(Total Liabilities / Total Assets) x 100\n\nShows what % of your assets are financed by debt.\n\nBelow 36%: Healthy\n36-50%: Moderate\nAbove 50%: High risk\n\nExample: Assets of 10L and loans of 3L = 30% (Healthy)"} /></CardDescription>
                <CardTitle className="text-2xl">
                  {debtToAssetRatio.toFixed(1)}%
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {debtToAssetRatio < 36 ? "Healthy" : debtToAssetRatio < 50 ? "Moderate" : "High"} leverage
                </p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Solvency Ratio<InfoTip text={"Total Assets / Total Liabilities\n\nMeasures your ability to cover all debts.\n\nAbove 2.0x: Strong solvency\n1.0-2.0x: Adequate\nBelow 1.0x: Liabilities exceed assets\n\nExample: Assets 20L / Liabilities 5L = 4.0x (Strong)"} /></CardDescription>
                <CardTitle className="text-2xl">
                  {solvencyRatio === Infinity ? "No Debt" : `${solvencyRatio.toFixed(1)}x`}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Assets / Liabilities
                </p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Monthly Asset Change<InfoTip text={"Change in total asset value compared to the previous month.\n\nPositive (green): Your assets grew - savings, investments, or market gains.\nNegative (red): Assets shrank - withdrawals or market losses.\n\nConsistently positive is ideal."} /></CardDescription>
                <CardTitle className={`text-2xl ${burnRate >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {burnRate >= 0 ? "+" : ""}{formatINR(burnRate)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  vs previous month
                </p>
              </CardHeader>
            </Card>
          </div>

          {/* Big Picture: Net Worth + Liabilities + Assets */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className={netWorth >= 0
              ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
              : "border-red-500/40 bg-red-50/50 dark:bg-red-950/20"
            }>
              <CardHeader>
                <CardDescription>Net Worth<InfoTip text={"Total Assets - Total Liabilities\n\nThe single most important number in personal finance. A positive and growing net worth means you're building wealth.\n\nExample: Assets 25L - Liabilities 5L = 20L net worth"} /></CardDescription>
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
            <Card>
              <CardHeader>
                <CardDescription>Total Assets<InfoTip text={"Sum of everything you own: bank balances, stocks, mutual funds, FDs, PPF, NPS, gold, etc.\n\nA steadily growing total is a sign of good financial discipline."} /></CardDescription>
                <CardTitle className="text-2xl">{formatINR(totalAssets)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Liabilities<InfoTip text={"Sum of everything you owe: loans, credit card balances, EMIs, etc.\n\nA declining trend means you're paying off debt effectively. Zero liabilities is the ideal goal."} /></CardDescription>
                <CardTitle className="text-2xl text-red-600 dark:text-red-400">{formatINR(totalLiabilities)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Net Worth Growth - Stacked Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Growth<InfoTip text={"Your total wealth trajectory over 12 months.\n\nThe shaded area shows total assets, and the dashed line is net worth (assets minus liabilities).\n\nIdeal: The gap between assets and net worth (i.e. liabilities) should shrink over time."} /></CardTitle>
              <CardDescription>
                Assets vs Liabilities over 12 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={netWorthChartConfig} className="h-72 w-full">
                <AreaChart data={netWorthTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompact}
                    width={50}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="total_assets"
                    type="monotone"
                    fill="var(--color-total_assets)"
                    fillOpacity={0.2}
                    stroke="var(--color-total_assets)"
                    strokeWidth={2}
                    stackId="a"
                  />
                  <Area
                    dataKey="net_worth"
                    type="monotone"
                    fill="var(--color-net_worth)"
                    fillOpacity={0.1}
                    stroke="var(--color-net_worth)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Asset Allocation - Doughnut Chart */}
            {allocationData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Asset Allocation<InfoTip text={"How your money is distributed across asset classes (Equity, Debt, Commodity, Hybrid, Cash).\n\nA well-diversified portfolio reduces risk.\n\nExample of balanced allocation:\n40% Equity, 30% Debt, 15% Cash, 10% Commodity, 5% Hybrid\n\nAvoid being too heavy in a single class."} /></CardTitle>
                  <CardDescription>
                    Distribution by asset class
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={assetAllocationConfig} className="mx-auto h-64 w-full max-w-xs">
                    <PieChart>
                      <ChartTooltip
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        strokeWidth={2}
                      >
                        {allocationData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {allocationData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="capitalize">{assetAllocationConfig[item.name as keyof typeof assetAllocationConfig]?.label ?? item.name}</span>
                        <span className="font-medium">{formatINR(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Debt Reduction & Solvency - Combo Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Debt & Solvency Trend<InfoTip text={"Bars show total liabilities over time. The line shows your Debt-to-Asset ratio (%).\n\nThe dashed line at 36% is the threshold lenders consider healthy (DTI ratio).\n\nIdeal: Bars shrinking (paying off debt) and line staying below 36%."} /></CardTitle>
                <CardDescription>
                  Liabilities (bars) vs Debt-to-Asset ratio (line)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={debtChartConfig} className="h-64 w-full">
                  <ComposedChart data={debtTrend}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatCompact}
                      width={50}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                      width={45}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      yAxisId="left"
                      dataKey="total_liabilities"
                      fill="var(--color-total_liabilities)"
                      radius={[4, 4, 0, 0]}
                      opacity={0.7}
                    />
                    <Line
                      yAxisId="right"
                      dataKey="debt_to_asset"
                      type="monotone"
                      stroke="var(--color-debt_to_asset)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <ReferenceLine
                      yAxisId="right"
                      y={36}
                      stroke="var(--color-chart-3)"
                      strokeDasharray="3 3"
                      label={{ value: "36% threshold", position: "insideTopRight", fontSize: 10 }}
                    />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Waterfall Chart - Month-to-Month Changes */}
          {waterfallData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Net Worth Waterfall<InfoTip text={"Shows exactly why your net worth changed month to month.\n\nFirst bar is the starting net worth. Green bars are gains, red bars are losses.\n\nHelps you pinpoint which months drove growth or decline in your wealth."} /></CardTitle>
                <CardDescription>
                  Month-to-month changes explaining how your net worth evolved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={waterfallConfig} className="h-64 w-full">
                  <BarChart data={waterfallData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatCompact}
                      width={50}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, _name, item) => {
                            const idx = waterfallData.indexOf(item.payload);
                            if (idx === 0) return formatINR(Number(value));
                            const v = Number(value);
                            return `${v >= 0 ? "+" : ""}${formatINR(v)}`;
                          }}
                        />
                      }
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {waterfallData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Asset Class Trend Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Class Breakdown Over Time<InfoTip text={"Stacked view of how your asset allocation has shifted month by month.\n\nIdeal: Gradual, intentional shifts - not sudden swings. Growing equity portion over time is generally good for long-term wealth building."} /></CardTitle>
              <CardDescription>
                How your allocation has shifted month by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={assetAllocationConfig} className="h-64 w-full">
                <AreaChart
                  data={summaries.map((s) => ({
                    month: formatMonth(s.month),
                    equity: s.equity_amount,
                    debt: s.debt_amount,
                    commodity: s.commodity_amount,
                    hybrid: s.hybrid_amount,
                    cash: s.cash_amount,
                  }))}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompact}
                    width={50}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="equity"
                    type="monotone"
                    fill="var(--color-equity)"
                    fillOpacity={0.3}
                    stroke="var(--color-equity)"
                    stackId="1"
                  />
                  <Area
                    dataKey="debt"
                    type="monotone"
                    fill="var(--color-debt)"
                    fillOpacity={0.3}
                    stroke="var(--color-debt)"
                    stackId="1"
                  />
                  <Area
                    dataKey="commodity"
                    type="monotone"
                    fill="var(--color-commodity)"
                    fillOpacity={0.3}
                    stroke="var(--color-commodity)"
                    stackId="1"
                  />
                  <Area
                    dataKey="hybrid"
                    type="monotone"
                    fill="var(--color-hybrid)"
                    fillOpacity={0.3}
                    stroke="var(--color-hybrid)"
                    stackId="1"
                  />
                  <Area
                    dataKey="cash"
                    type="monotone"
                    fill="var(--color-cash)"
                    fillOpacity={0.3}
                    stroke="var(--color-cash)"
                    stackId="1"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}
