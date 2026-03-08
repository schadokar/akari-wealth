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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  InfoIcon,
  WalletIcon,
  HeartPulseIcon,
  ShieldCheckIcon,
  ActivityIcon,
  CreditCardIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
} from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// --- Types (Wealth Health) ---

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

// --- Types (Safety Net) ---

interface Account {
  id: number;
  name: string;
  category: string;
  institution?: string;
  emi_amount?: number;
  is_active: boolean;
  current_amount?: number;
  invested_amount?: number;
}

interface Insurance {
  id: number;
  policy_type: string;
  insurer: string;
  policy_number?: string;
  sum_assured: number;
  premium_amount: number;
  premium_frequency: string;
  start_date: string;
  end_date?: string;
  nominees?: string;
  is_employer_provided: boolean;
  is_active: boolean;
  notes?: string;
}

interface Employment {
  id: number;
  employer_name: string;
  end_date?: string;
}

interface Payslip {
  id: number;
  pay_month: string;
  basic_salary: number;
  hra?: number;
  conveyance_allowance?: number;
  medical_allowance?: number;
  lta?: number;
  special_allowance?: number;
  flexible_pay?: number;
  meal_allowance?: number;
  mobile_allowance?: number;
  internet_allowance?: number;
  differential_allowance?: number;
  statutory_bonus?: number;
  performance_pay?: number;
  advance_bonus?: number;
  other_allowance?: number;
  epf?: number;
  vpf?: number;
  nps?: number;
  professional_tax?: number;
  tds?: number;
  lwf?: number;
  esi_employee?: number;
  meal_coupon_deduction?: number;
  loan_recovery?: number;
  other_deduction?: number;
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

const cashFlowChartConfig = {
  bankDelta: { label: "Bank Inflow", color: "var(--color-chart-2)" },
  investDelta: { label: "Invested", color: "var(--color-chart-1)" },
  debtPaydown: { label: "Debt Paydown", color: "var(--color-chart-4)" },
  surplus: { label: "Surplus", color: "var(--color-primary)" },
} satisfies ChartConfig;

const surplusChartConfig = {
  surplus: { label: "Surplus", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

// --- Helpers (Wealth Health) ---

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

// --- Helpers (Safety Net) ---

function grossFromPayslip(p: Payslip): number {
  return (
    (p.basic_salary ?? 0) +
    (p.hra ?? 0) +
    (p.conveyance_allowance ?? 0) +
    (p.medical_allowance ?? 0) +
    (p.lta ?? 0) +
    (p.special_allowance ?? 0) +
    (p.flexible_pay ?? 0) +
    (p.meal_allowance ?? 0) +
    (p.mobile_allowance ?? 0) +
    (p.internet_allowance ?? 0) +
    (p.differential_allowance ?? 0) +
    (p.statutory_bonus ?? 0) +
    (p.performance_pay ?? 0) +
    (p.advance_bonus ?? 0) +
    (p.other_allowance ?? 0)
  );
}

function netFromPayslip(p: Payslip): number {
  const deductions =
    (p.epf ?? 0) + (p.vpf ?? 0) + (p.nps ?? 0) +
    (p.professional_tax ?? 0) + (p.tds ?? 0) + (p.lwf ?? 0) +
    (p.esi_employee ?? 0) + (p.meal_coupon_deduction ?? 0) +
    (p.loan_recovery ?? 0) + (p.other_deduction ?? 0);
  return grossFromPayslip(p) - deductions;
}

function annualPremium(ins: Insurance): number {
  if (ins.premium_frequency === "monthly") return ins.premium_amount * 12;
  if (ins.premium_frequency === "quarterly") return ins.premium_amount * 4;
  return ins.premium_amount;
}

type Status = "good" | "warning" | "critical";

// --- Sub-components (Wealth Health) ---

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

// --- Sub-components (Safety Net) ---

function StatusBadge({ status }: { status: Status }) {
  if (status === "good")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        <CheckCircle2Icon className="mr-1 size-3" />
        Secured
      </Badge>
    );
  if (status === "warning")
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        <AlertTriangleIcon className="mr-1 size-3" />
        Partial
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
      <XCircleIcon className="mr-1 size-3" />
      Missing
    </Badge>
  );
}

function ProgressBar({
  value,
  max,
  status,
}: {
  value: number;
  max: number;
  status: Status;
}) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  const colorClass =
    status === "good"
      ? "bg-emerald-500"
      : status === "warning"
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={`h-2 rounded-full transition-all ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  status,
  children,
}: {
  icon: React.ElementType;
  title: string;
  status: Status;
  children: React.ReactNode;
}) {
  const borderColor =
    status === "good"
      ? "border-l-emerald-500"
      : status === "warning"
      ? "border-l-amber-500"
      : "border-l-red-500";
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2 border border-amber-100">
      💡 {text}
    </p>
  );
}

function PolicyRow({ ins }: { ins: Insurance }) {
  return (
    <div className="flex items-center justify-between text-sm bg-muted/40 rounded-md px-3 py-2">
      <div>
        <p className="font-medium">{ins.insurer}</p>
        <p className="text-xs text-muted-foreground">
          {ins.policy_number ?? "No policy no."}
          {ins.nominees ? ` · Nominees: ${ins.nominees}` : ""}
          {ins.notes ? ` · ${ins.notes}` : ""}
        </p>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className="font-medium">{formatINR(ins.sum_assured)}</p>
        <p className="text-xs text-muted-foreground">
          {formatINR(annualPremium(ins))}/yr
        </p>
      </div>
    </div>
  );
}

// --- Component ---

export default function HealthPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [latestPayslip, setLatestPayslip] = useState<Payslip | null>(null);
  const [allPayslips, setAllPayslips] = useState<Payslip[]>([]);

  useEffect(() => {
    apiFetch("/api/dashboard")
      .then((res) => res.json())
      .then((data: DashboardData) => setDashboard(data));

    const { from, to } = getMonthRange(12);
    apiFetch(`/api/summary?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data: MonthlySummary[]) => setSummaries(data ?? []));

    async function loadSafetyNet() {
      try {
        const [accts, insrs, emps] = await Promise.all([
          apiFetch("/api/accounts").then((r) => r.json()),
          apiFetch("/api/insurances").then((r) => r.json()),
          apiFetch("/api/employments").then((r) => r.json()),
        ]);
        setAccounts(accts ?? []);
        setInsurances(insrs ?? []);
        const currentEmp = (emps ?? []).find((e: Employment) => !e.end_date);
        if (currentEmp) {
          const payslips: Payslip[] = await apiFetch(
            `/api/employments/${currentEmp.id}/payslips`
          ).then((r) => r.json());
          const sorted = [...(payslips ?? [])].sort((a, b) =>
            b.pay_month.localeCompare(a.pay_month)
          );
          setLatestPayslip(sorted[0] ?? null);
          setAllPayslips(payslips ?? []);
        }
      } catch {
        toast.error("Failed to load safety net data");
      }
    }
    loadSafetyNet();
  }, []);

  // --- Derived Data (Wealth Health) ---

  const netWorth = dashboard?.net_worth ?? 0;
  const totalAssets = dashboard?.total_assets ?? 0;
  const totalLiabilities = dashboard?.total_liabilities ?? 0;
  const mom = dashboard?.month_over_month;
  const assetDist = dashboard?.asset_distribution ?? {};

  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const solvencyRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : Infinity;

  const burnRate = useMemo(() => {
    if (summaries.length < 2) return 0;
    const latest = summaries[summaries.length - 1];
    const prev = summaries[summaries.length - 2];
    return latest.total_assets - prev.total_assets;
  }, [summaries]);

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

  const allocationData = useMemo(() => {
    return Object.entries(assetDist)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: key,
        value,
        fill: `var(--color-${key})`,
      }));
  }, [assetDist]);

  const debtTrend = useMemo(
    () =>
      summaries.map((s) => ({
        month: formatMonth(s.month),
        total_liabilities: s.total_liabilities,
        debt_to_asset: s.total_assets > 0 ? Number(((s.total_liabilities / s.total_assets) * 100).toFixed(1)) : 0,
      })),
    [summaries]
  );

  const waterfallData = useMemo(() => {
    if (summaries.length < 2) return [];
    const data: { name: string; value: number; fill: string; start: number; end: number }[] = [];
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

  const healthScore = useMemo(() => {
    let score = 0;
    if (netWorth > 0) score += 30;
    if (debtToAssetRatio < 50) score += 25;
    else if (debtToAssetRatio < 75) score += 15;
    if (mom && mom.change > 0) score += 25;
    else if (mom && mom.change === 0) score += 10;
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

  // --- Derived Data (Cash Flow) ---

  const payslipsByMonth = useMemo(() => {
    const map: Record<string, Payslip> = {};
    for (const p of allPayslips) map[p.pay_month] = p;
    return map;
  }, [allPayslips]);

  const cashFlowData = useMemo(() => {
    if (summaries.length === 0) return [];
    const sorted = [...summaries].sort((a, b) => a.month.localeCompare(b.month));
    return sorted.map((s, i) => {
      const prev = i > 0 ? sorted[i - 1] : null;
      const investBalance = s.equity_amount + s.debt_amount + s.commodity_amount + s.hybrid_amount;
      const prevInvestBalance = prev
        ? prev.equity_amount + prev.debt_amount + prev.commodity_amount + prev.hybrid_amount
        : 0;
      const bankDelta = prev ? s.cash_amount - prev.cash_amount : 0;
      const investDelta = prev ? Math.max(0, investBalance - prevInvestBalance) : 0;
      const liabilityDelta = prev ? s.total_liabilities - prev.total_liabilities : 0;
      const debtPaydown = Math.max(0, -liabilityDelta);
      const surplus = bankDelta - investDelta - debtPaydown;
      const payslip = payslipsByMonth[s.month];
      const netSalary = payslip ? netFromPayslip(payslip) : 0;
      return {
        month: formatMonth(s.month),
        rawMonth: s.month,
        bankBalance: s.cash_amount,
        investBalance,
        liabilityBalance: s.total_liabilities,
        bankDelta,
        investDelta,
        debtPaydown,
        surplus,
        netSalary,
      };
    });
  }, [summaries, payslipsByMonth]);

  const avgSurplus = useMemo(() => {
    const months = cashFlowData.slice(1);
    if (months.length === 0) return 0;
    return months.reduce((s, m) => s + m.surplus, 0) / months.length;
  }, [cashFlowData]);

  const avgSavingsRate = useMemo(() => {
    const months = cashFlowData.slice(1).filter((m) => m.bankDelta > 0);
    if (months.length === 0) return 0;
    const totalInvest = months.reduce((s, m) => s + m.investDelta, 0);
    const totalInflow = months.reduce((s, m) => s + m.bankDelta, 0);
    return totalInflow > 0 ? (totalInvest / totalInflow) * 100 : 0;
  }, [cashFlowData]);

  const liabilityTrend = useMemo(() => {
    if (cashFlowData.length < 2) return 0;
    return cashFlowData[cashFlowData.length - 1].liabilityBalance - cashFlowData[0].liabilityBalance;
  }, [cashFlowData]);

  const totalInvestedPeriod = useMemo(
    () => cashFlowData.slice(1).reduce((s, m) => s + m.investDelta, 0),
    [cashFlowData]
  );

  const scoreLabel =
    healthScore >= 80 ? "Excellent" : healthScore >= 50 ? "Good" : "Needs Attention";

  // --- Derived Data (Safety Net) ---

  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.category === "bank" && a.is_active),
    [accounts]
  );
  const loanAccounts = useMemo(
    () => accounts.filter((a) => a.category === "loan" && a.is_active),
    [accounts]
  );
  const creditCards = useMemo(
    () => accounts.filter((a) => a.category === "credit_card" && a.is_active),
    [accounts]
  );

  const activeIns = useMemo(
    () => insurances.filter((i) => i.is_active),
    [insurances]
  );
  const healthPolicies = useMemo(
    () => activeIns.filter((i) => i.policy_type === "health"),
    [activeIns]
  );
  const termLifePolicies = useMemo(
    () => activeIns.filter((i) => i.policy_type === "term_life"),
    [activeIns]
  );
  const ciPolicies = useMemo(
    () =>
      activeIns.filter(
        (i) =>
          i.policy_type === "critical_illness" ||
          i.policy_type === "disability"
      ),
    [activeIns]
  );

  const monthlyGross = latestPayslip ? grossFromPayslip(latestPayslip) : 0;
  const annualGross = monthlyGross * 12;
  const bankBalance = bankAccounts.reduce((s, a) => s + (a.current_amount ?? 0), 0);
  const emergencyTarget = monthlyGross * 6;
  const monthsCovered = monthlyGross > 0 ? bankBalance / monthlyGross : 0;
  const totalHealthCoverage = healthPolicies.reduce((s, i) => s + i.sum_assured, 0);
  const totalLifeCoverage = termLifePolicies.reduce((s, i) => s + i.sum_assured, 0);
  const recommendedLifeCoverage = annualGross * 10;
  const totalEMI = loanAccounts.reduce((s, a) => s + (a.emi_amount ?? 0), 0);
  const ccOutstanding = creditCards.reduce((s, a) => s + (a.current_amount ?? 0), 0);
  const emiRatio = monthlyGross > 0 ? totalEMI / monthlyGross : 0;

  const emergencyStatus: Status =
    monthlyGross === 0
      ? "warning"
      : monthsCovered >= 6
      ? "good"
      : monthsCovered >= 3
      ? "warning"
      : "critical";

  const healthInsuranceStatus: Status =
    totalHealthCoverage >= 500000
      ? "good"
      : healthPolicies.length > 0
      ? "warning"
      : "critical";

  const lifeStatus: Status =
    termLifePolicies.length === 0
      ? "critical"
      : totalLifeCoverage >= recommendedLifeCoverage || annualGross === 0
      ? "good"
      : "warning";

  const ciStatus: Status = ciPolicies.length > 0 ? "good" : "critical";

  const debtStatus: Status =
    monthlyGross === 0 || emiRatio <= 0.3
      ? "good"
      : emiRatio <= 0.4
      ? "warning"
      : "critical";

  const allSafetyStatuses = [emergencyStatus, healthInsuranceStatus, lifeStatus, ciStatus, debtStatus];
  const safetyScore = allSafetyStatuses.filter((s) => s === "good").length;
  const scoreBg =
    safetyScore >= 4
      ? "bg-emerald-50 border-emerald-200"
      : safetyScore >= 2
      ? "bg-amber-50 border-amber-200"
      : "bg-red-50 border-red-200";
  const safetyScoreColor =
    safetyScore >= 4
      ? "text-emerald-700"
      : safetyScore >= 2
      ? "text-amber-700"
      : "text-red-700";

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

        <Tabs defaultValue="health" className="flex-1">
          <div className="border-b px-6">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              <TabsTrigger value="health" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-0">
                Overall Health
              </TabsTrigger>
              <TabsTrigger value="safety-net" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-0">
                Safety Net
                <span className={`ml-2 text-xs font-bold ${safetyScoreColor}`}>{safetyScore}/5</span>
              </TabsTrigger>
              <TabsTrigger value="cash-flow" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-0">
                Cash Flow
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="health" className="space-y-6 p-6 mt-0">
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
          </TabsContent>

          <TabsContent value="safety-net" className="space-y-4 p-6 mt-0 max-w-3xl">

          {/* Overall Safety Score */}
          <div className={`rounded-lg border px-5 py-4 flex items-center justify-between ${scoreBg}`}>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Safety Score</p>
              <p className={`text-3xl font-bold ${safetyScoreColor}`}>
                {safetyScore}
                <span className="text-lg font-normal text-muted-foreground"> / 5 elements secured</span>
              </p>
            </div>
            <div className="flex gap-2">
              {allSafetyStatuses.map((s, i) => (
                <div
                  key={i}
                  className={`size-3 rounded-full ${
                    s === "good" ? "bg-emerald-500" : s === "warning" ? "bg-amber-500" : "bg-red-500"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {/* 1. Emergency Fund */}
            <SectionCard
              icon={WalletIcon}
              title="Emergency Fund"
              status={emergencyStatus}
            >
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bank / liquid balance</span>
                  <span className="font-medium">{formatINR(bankBalance)}</span>
                </div>
                {monthlyGross > 0 ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target (6× monthly gross)</span>
                      <span className="font-medium">{formatINR(emergencyTarget)}</span>
                    </div>
                    <ProgressBar value={bankBalance} max={emergencyTarget} status={emergencyStatus} />
                    <p className="text-sm text-muted-foreground">
                      Covers <strong>{monthsCovered.toFixed(1)} months</strong> of income
                    </p>
                    {emergencyStatus !== "good" && (
                      <Tip text={`Build up ${formatINR(Math.max(0, emergencyTarget - bankBalance))} more in liquid savings to reach a 6-month buffer.`} />
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Add a payslip to calculate how many months your balance covers.
                  </p>
                )}
                {bankAccounts.length > 0 && (
                  <div className="pt-1 space-y-1">
                    {bankAccounts.map((a) => (
                      <div key={a.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{a.name}</span>
                        <span>{formatINR(a.current_amount ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* 2. Health Insurance */}
            <SectionCard
              icon={HeartPulseIcon}
              title="Health Insurance"
              status={healthInsuranceStatus}
            >
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total sum assured</span>
                  <span className="font-medium">{formatINR(totalHealthCoverage)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recommended minimum</span>
                  <span className="font-medium">₹5,00,000</span>
                </div>
                {healthPolicies.length > 0 ? (
                  <div className="space-y-2">
                    {healthPolicies.map((ins) => (
                      <PolicyRow key={ins.id} ins={ins} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active health policies.</p>
                )}
                {healthInsuranceStatus !== "good" && (
                  <Tip
                    text={
                      healthPolicies.length === 0
                        ? "Get at least ₹5L individual health cover. A family floater plan is cost-effective if you have dependents."
                        : `Your health cover (${formatINR(totalHealthCoverage)}) is below ₹5L. Add a super top-up plan to boost coverage at low cost.`
                    }
                  />
                )}
              </div>
            </SectionCard>

            {/* 3. Term Life Insurance */}
            <SectionCard
              icon={ShieldCheckIcon}
              title="Term Life Insurance"
              status={lifeStatus}
            >
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total sum assured</span>
                  <span className="font-medium">{formatINR(totalLifeCoverage)}</span>
                </div>
                {annualGross > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recommended (10× annual gross)</span>
                    <span className="font-medium">{formatINR(recommendedLifeCoverage)}</span>
                  </div>
                )}
                {termLifePolicies.length > 0 ? (
                  <div className="space-y-2">
                    {termLifePolicies.map((ins) => (
                      <PolicyRow key={ins.id} ins={ins} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active term life policies.</p>
                )}
                {lifeStatus !== "good" && (
                  <Tip
                    text={
                      termLifePolicies.length === 0
                        ? "Get a pure term plan. Avoid ULIPs. Cover should be at least 10× your annual income to protect dependents."
                        : `Your cover (${formatINR(totalLifeCoverage)}) is below the recommended ${formatINR(recommendedLifeCoverage)}. Consider adding another term plan.`
                    }
                  />
                )}
              </div>
            </SectionCard>

            {/* 4. Critical Illness / Disability */}
            <SectionCard
              icon={ActivityIcon}
              title="Critical Illness / Disability"
              status={ciStatus}
            >
              <div className="space-y-3">
                {ciPolicies.length > 0 ? (
                  <div className="space-y-2">
                    {ciPolicies.map((ins) => (
                      <PolicyRow key={ins.id} ins={ins} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No critical illness or disability policies.</p>
                )}
                {ciStatus !== "good" && (
                  <Tip text="Get a standalone critical illness policy (36+ conditions) or add a CI/waiver-of-premium rider to your term plan. This replaces income if you're unable to work." />
                )}
              </div>
            </SectionCard>

            {/* 5. Debt Under Control */}
            <SectionCard
              icon={CreditCardIcon}
              title="Debt Under Control"
              status={debtStatus}
            >
              <div className="space-y-3">
                {monthlyGross > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">EMI / monthly income</span>
                      <span
                        className={`font-semibold ${
                          debtStatus === "good"
                            ? "text-emerald-600"
                            : debtStatus === "warning"
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {(emiRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar value={emiRatio * 100} max={40} status={debtStatus} />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="text-emerald-600">Safe &lt; 30%</span>
                      <span className="text-amber-600">Caution 30–40%</span>
                      <span className="text-red-600">Danger &gt; 40%</span>
                    </div>
                  </>
                )}
                {loanAccounts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active Loans</p>
                    {loanAccounts.map((a) => (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <div className="text-right">
                          <span className="font-medium">{formatINR(a.emi_amount ?? 0)}/mo</span>
                          {a.current_amount !== undefined && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({formatINR(a.current_amount)} outstanding)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm border-t pt-1.5 font-medium">
                      <span>Total EMI</span>
                      <span>{formatINR(totalEMI)}/mo</span>
                    </div>
                  </div>
                )}
                {creditCards.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Credit Card Outstanding</p>
                    {creditCards.map((a) => (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span>{a.name}</span>
                        <span
                          className={`font-medium ${
                            (a.current_amount ?? 0) > 0 ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {formatINR(a.current_amount ?? 0)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm border-t pt-1.5 font-medium">
                      <span>Total Outstanding</span>
                      <span className={ccOutstanding > 0 ? "text-red-600" : "text-emerald-600"}>
                        {formatINR(ccOutstanding)}
                      </span>
                    </div>
                  </div>
                )}
                {debtStatus !== "good" && monthlyGross > 0 && (
                  <Tip
                    text={
                      emiRatio > 0.4
                        ? `Your EMI-to-income ratio is ${(emiRatio * 100).toFixed(0)}% — dangerously high. Prioritise loan prepayment and avoid new borrowing.`
                        : `Your EMI-to-income ratio is ${(emiRatio * 100).toFixed(0)}%. Aim to bring it below 30% by prepaying high-interest loans first.`
                    }
                  />
                )}
              </div>
            </SectionCard>
          </div>
          </TabsContent>

          <TabsContent value="cash-flow" className="space-y-6 p-6 mt-0">
            {/* KPI Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Monthly Surplus</CardDescription>
                  <CardTitle className={`text-2xl font-bold ${avgSurplus >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCompact(avgSurplus)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {avgSurplus >= 0 ? "Positive cash flow" : "Spending more than saving"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Savings Rate</CardDescription>
                  <CardTitle className={`text-2xl font-bold ${avgSavingsRate >= 20 ? "text-emerald-600" : avgSavingsRate >= 10 ? "text-amber-600" : "text-red-600"}`}>
                    {avgSavingsRate.toFixed(1)}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Investments / bank inflow</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Invested (Period)</CardDescription>
                  <CardTitle className="text-2xl font-bold text-chart-1">
                    {formatCompact(totalInvestedPeriod)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Net new investments deployed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Liability Trend</CardDescription>
                  <CardTitle className={`text-2xl font-bold ${liabilityTrend <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {liabilityTrend <= 0 ? "↓ " : "↑ "}{formatCompact(Math.abs(liabilityTrend))}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {liabilityTrend <= 0 ? "Debt reducing" : "Debt increasing"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Cash Flow Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
                <CardDescription>
                  Bank inflow vs investments deployed vs debt paydown — surplus is what remains
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cashFlowData.length > 1 ? (
                  <ChartContainer config={cashFlowChartConfig} className="h-64 w-full">
                    <ComposedChart data={cashFlowData.slice(1)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} width={50} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => [formatINR(Number(value)), cashFlowChartConfig[name as keyof typeof cashFlowChartConfig]?.label ?? name]}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="bankDelta" stackId="flows" fill="var(--color-bankDelta)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="investDelta" stackId="out" fill="var(--color-investDelta)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="debtPaydown" stackId="out" fill="var(--color-debtPaydown)" radius={[2, 2, 0, 0]} />
                      <Line dataKey="surplus" type="monotone" stroke="var(--color-surplus)" strokeWidth={2} dot={{ r: 3 }} />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    </ComposedChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Need at least 2 months of data</p>
                )}
              </CardContent>
            </Card>

            {/* Surplus Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Surplus Trend</CardTitle>
                <CardDescription>Month-over-month free cash after investing and debt paydown</CardDescription>
              </CardHeader>
              <CardContent>
                {cashFlowData.length > 1 ? (
                  <ChartContainer config={surplusChartConfig} className="h-48 w-full">
                    <AreaChart data={cashFlowData.slice(1)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} width={50} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [formatINR(Number(value)), "Surplus"]}
                          />
                        }
                      />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" />
                      <Area
                        dataKey="surplus"
                        type="monotone"
                        fill="var(--color-surplus)"
                        fillOpacity={0.2}
                        stroke="var(--color-surplus)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Need at least 2 months of data</p>
                )}
              </CardContent>
            </Card>

            {/* Monthly Breakdown Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">Month</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Bank Balance</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Bank Δ</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Invested</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Liabilities</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Debt Paydown</th>
                        <th className="px-4 py-2 text-right font-medium text-muted-foreground">Surplus</th>
                        {cashFlowData.some((m) => m.netSalary > 0) && (
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">Net Salary</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlowData.map((row, i) => (
                        <tr key={row.rawMonth} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-2 font-medium">{row.month}</td>
                          <td className="px-4 py-2 text-right">{formatCompact(row.bankBalance)}</td>
                          <td className={`px-4 py-2 text-right ${i === 0 ? "text-muted-foreground" : row.bankDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {i === 0 ? "—" : (row.bankDelta >= 0 ? "+" : "") + formatCompact(row.bankDelta)}
                          </td>
                          <td className="px-4 py-2 text-right">{i === 0 ? "—" : formatCompact(row.investDelta)}</td>
                          <td className="px-4 py-2 text-right text-red-600">{formatCompact(row.liabilityBalance)}</td>
                          <td className={`px-4 py-2 text-right ${row.debtPaydown > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {i === 0 ? "—" : row.debtPaydown > 0 ? formatCompact(row.debtPaydown) : "—"}
                          </td>
                          <td className={`px-4 py-2 text-right font-medium ${i === 0 ? "text-muted-foreground" : row.surplus >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {i === 0 ? "—" : (row.surplus >= 0 ? "+" : "") + formatCompact(row.surplus)}
                          </td>
                          {cashFlowData.some((m) => m.netSalary > 0) && (
                            <td className="px-4 py-2 text-right text-muted-foreground">
                              {row.netSalary > 0 ? formatCompact(row.netSalary) : "—"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}
