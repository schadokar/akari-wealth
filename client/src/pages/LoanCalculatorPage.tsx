import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Lock,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
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
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiAccount {
  id: number;
  name: string;
  category: string;
  institution?: string;
  interest_rate?: number;
  emi_amount?: number;
  tenure_months?: number;
  invested_amount?: number;
}

interface AmortRow {
  month: number;
  interest: number;
  principal: number;
  balance: number;
}

interface MultiLoan {
  id: number;
  name: string;
  balance: number;
  rate: number;
  emi: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAmortization(
  principal: number,
  annualRate: number,
  emi: number,
  tenure: number
): AmortRow[] {
  const r = annualRate / 12 / 100;
  let rem = principal;
  const rows: AmortRow[] = [];
  for (let m = 1; m <= tenure; m++) {
    const interest = rem * r;
    const p = Math.min(Math.max(emi - interest, 0), rem);
    rem = Math.max(rem - p, 0);
    rows.push({ month: m, interest, principal: p, balance: rem });
    if (rem < 0.5) break;
  }
  return rows;
}

function formatTenure(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} months`;
  if (m === 0) return `${y} years`;
  return `${y} years ${m} months`;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function calcEMI(p: number, annualRate: number, tenure: number): number {
  if (annualRate === 0) return p / tenure;
  const r = annualRate / 12 / 100;
  return (p * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
}

// ─── Lock wrapper ─────────────────────────────────────────────────────────────

function LockedCard({ title, requires }: { title: string; requires: string[] }) {
  return (
    <Card className="opacity-60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline" className="text-xs">
            <Lock className="h-3 w-3 mr-1" />
            Locked
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Requires: {requires.join(", ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-20 rounded-md bg-muted/40 flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Lock className="h-4 w-4" />
          Provide missing inputs to unlock
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SVG Circular Progress ────────────────────────────────────────────────────

function CircularProgress({ pct, label }: { pct: number; label: string }) {
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={12} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="hsl(var(--primary))" strokeWidth={12}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 60 60)"
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={16} fontWeight="bold" fill="currentColor">
        {pct.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.65}>
        {label}
      </text>
    </svg>
  );
}

// ─── SVG Semi-Gauge ───────────────────────────────────────────────────────────

function SemiGauge({
  value,
  zones,
}: {
  value: number;
  zones: { max: number; color: string }[];
}) {
  const maxVal = zones[zones.length - 1].max;
  const pct = Math.min(value / maxVal, 1);
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cx = 100, cy = 95, r = 72;

  const arcD = (sp: number, ep: number) => {
    const sa = toRad(-180 + sp * 180);
    const ea = toRad(-180 + ep * 180);
    const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
    const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
    const large = ep - sp > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  let prev = 0;
  const arcs = zones.map((z) => {
    const end = z.max / maxVal;
    const el = (
      <path key={z.max} d={arcD(prev, end)} fill="none" stroke={z.color} strokeWidth={14} strokeLinecap="butt" />
    );
    prev = end;
    return el;
  });

  const nAngle = toRad(-180 + pct * 180);
  const nx = cx + (r - 12) * Math.cos(nAngle);
  const ny = cy + (r - 12) * Math.sin(nAngle);

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
      {arcs}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="currentColor" />
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize={15} fontWeight="bold" fill="currentColor">
        {value.toFixed(1)}%
      </text>
    </svg>
  );
}

// ─── Feature 1 — True Cost ────────────────────────────────────────────────────

function TrueCost({ loanAmount, emiAmount, loanTenure }: { loanAmount: number; emiAmount: number; loanTenure: number }) {
  const totalPayable = emiAmount * loanTenure;
  const totalInterest = totalPayable - loanAmount;
  const interestRatio = (totalInterest / loanAmount) * 100;
  const pPct = (loanAmount / totalPayable) * 100;
  const iPct = (totalInterest / totalPayable) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">True Cost of the Loan</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Total Payable</p>
            <p className="text-lg font-bold">{formatINR(totalPayable)}</p>
          </div>
          <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-3">
            <p className="text-xs text-muted-foreground">Total Interest</p>
            <p className="text-lg font-bold text-red-600">{formatINR(totalInterest)}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Interest % of Principal</p>
            <p className="text-lg font-bold">{interestRatio.toFixed(1)}%</p>
          </div>
        </div>
        {/* Stacked bar */}
        <div className="flex h-8 rounded-lg overflow-hidden text-xs font-medium">
          <div
            className="bg-green-500 flex items-center justify-center text-white overflow-hidden"
            style={{ width: `${pPct}%` }}
            title={`Principal: ${formatINR(loanAmount)}`}
          >
            {pPct > 20 ? "Principal" : ""}
          </div>
          <div
            className="bg-red-500 flex items-center justify-center text-white overflow-hidden"
            style={{ width: `${iPct}%` }}
            title={`Interest: ${formatINR(totalInterest)}`}
          >
            {iPct > 10 ? "Interest" : ""}
          </div>
        </div>
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-300">
          You pay <strong>{formatINR(totalInterest)}</strong> extra beyond the loan amount — that's{" "}
          <strong>{(totalInterest / loanAmount).toFixed(2)}×</strong> the principal.
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature 2 — Amortization ─────────────────────────────────────────────────

function AmortizationSchedule({
  schedule,
  loanTenure,
  totalInterest,
}: {
  schedule: AmortRow[];
  loanTenure: number;
  totalInterest: number;
}) {
  const [showTable, setShowTable] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE = 12;

  const breakEven = schedule.find((r) => r.principal >= r.interest)?.month ?? loanTenure;
  const q1End = Math.floor(loanTenure * 0.25);
  const q1Interest = schedule.slice(0, q1End).reduce((s, r) => s + r.interest, 0);
  const q1Pct = totalInterest > 0 ? (q1Interest / totalInterest) * 100 : 0;

  const step = Math.max(1, Math.floor(schedule.length / 72));
  const chartData = schedule
    .filter((_, i) => i % step === 0)
    .map((r) => ({ month: r.month, Interest: Math.round(r.interest), Principal: Math.round(r.principal) }));

  const pageRows = schedule.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(schedule.length / PAGE);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Amortization Schedule</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
        <CardDescription>Month-by-month principal vs interest split</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: "Month", position: "insideBottom", offset: -4, fontSize: 10 }} />
              <YAxis tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={48} />
              <RechartsTooltip
                formatter={(v: number, name: string) => [formatINR(v), name]}
                labelFormatter={(l: number) => `Month ${l}`}
              />
              <Legend verticalAlign="top" height={24} />
              <ReferenceLine
                x={breakEven}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `↑ Break-even`, fontSize: 9, fill: "#f59e0b", position: "top" }}
              />
              <Area type="monotone" dataKey="Interest" stackId="1" stroke="#ef4444" fill="#fee2e2" />
              <Area type="monotone" dataKey="Principal" stackId="1" stroke="#22c55e" fill="#dcfce7" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
          <p>More principal than interest paid from <strong>month {breakEven}</strong>.</p>
          <p>
            First 25% ({q1End} months): <strong>{formatINR(q1Interest)}</strong> interest —{" "}
            <strong>{q1Pct.toFixed(0)}%</strong> of total paid upfront.
          </p>
        </div>

        <button
          onClick={() => setShowTable((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showTable ? (
            <><ChevronUp className="h-4 w-4" /> Hide table</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> Show full schedule</>
          )}
        </button>

        {showTable && (
          <div className="space-y-2">
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left">Month</th>
                    <th className="px-3 py-2 text-right">EMI</th>
                    <th className="px-3 py-2 text-right text-green-700">Principal</th>
                    <th className="px-3 py-2 text-right text-red-600">Interest</th>
                    <th className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.month} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-1.5">{r.month}</td>
                      <td className="px-3 py-1.5 text-right">{formatINR(r.principal + r.interest)}</td>
                      <td className="px-3 py-1.5 text-right text-green-700">{formatINR(r.principal)}</td>
                      <td className="px-3 py-1.5 text-right text-red-600">{formatINR(r.interest)}</td>
                      <td className="px-3 py-1.5 text-right">{formatINR(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded border disabled:opacity-40">
                Previous
              </button>
              <span>Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded border disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Feature 3 — Payoff Date ──────────────────────────────────────────────────

function PayoffDate({ schedule }: { schedule: AmortRow[] }) {
  const today = new Date();
  const tenure = schedule.length;
  const payoff = addMonths(today, tenure);
  const milestones = [25, 50, 75, 100].map((pct) => ({
    pct,
    date: fmtDate(addMonths(today, Math.round((pct / 100) * tenure))),
    month: Math.round((pct / 100) * tenure),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Payoff Date & Debt-Free Milestone</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <CircularProgress pct={0} label="Progress" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Debt-Free Date</p>
              <p className="text-2xl font-bold">{fmtDate(payoff)}</p>
              <p className="text-sm text-muted-foreground">{formatTenure(tenure)} to freedom</p>
            </div>
            <div className="space-y-1.5">
              {milestones.map((m) => (
                <div key={m.pct} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="font-medium w-8">{m.pct}%</span>
                  <span className="text-muted-foreground">Month {m.month} — {m.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature 4 — EMI-to-Salary ────────────────────────────────────────────────

function EMIToSalary({ emiAmount, monthlySalary }: { emiAmount: number; monthlySalary: number | null }) {
  if (!monthlySalary) return <LockedCard title="EMI-to-Salary Ratio" requires={["Monthly Salary"]} />;

  const ratio = (emiAmount / monthlySalary) * 100;
  const { color, msg } =
    ratio < 20 ? { color: "#22c55e", msg: "Comfortable. Low strain on monthly cash flow." }
    : ratio < 35 ? { color: "#eab308", msg: "Moderate. Still manageable but watch expenses." }
    : ratio < 50 ? { color: "#f97316", msg: "High. Limited financial flexibility." }
    : { color: "#ef4444", msg: "Critical. This loan alone consumes most of your income." };

  const zones = [
    { max: 20, color: "#22c55e" },
    { max: 35, color: "#eab308" },
    { max: 50, color: "#f97316" },
    { max: 100, color: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">EMI-to-Salary Ratio</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <SemiGauge value={Math.min(ratio, 100)} zones={zones} />
          <div className="space-y-2">
            <p className="text-3xl font-bold" style={{ color }}>{ratio.toFixed(1)}%</p>
            <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
              <span>EMI: {formatINR(emiAmount)}</span>
              <span>Salary: {formatINR(monthlySalary)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-md p-3 text-sm" style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}>{msg}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature 5 — DTI Ratio ────────────────────────────────────────────────────

function DTIRatio({
  emiAmount,
  monthlySalary,
  otherEMIs,
}: {
  emiAmount: number;
  monthlySalary: number | null;
  otherEMIs: number | null;
}) {
  if (!monthlySalary) return <LockedCard title="Debt-to-Income (DTI) Ratio" requires={["Monthly Salary"]} />;

  const totalDebt = emiAmount + (otherEMIs ?? 0);
  const dti = (totalDebt / monthlySalary) * 100;
  const partial = otherEMIs === null;

  const { color, msg } =
    dti < 35 ? { color: "#22c55e", msg: "Healthy. You have strong borrowing capacity." }
    : dti < 50 ? { color: "#eab308", msg: "Risky. Vulnerable to income disruptions." }
    : { color: "#ef4444", msg: "Danger zone. Prioritize debt reduction immediately." };

  const barPct = Math.min(dti, 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">Debt-to-Income (DTI) Ratio</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
          {partial && <Badge variant="outline" className="text-xs">Single Loan DTI</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative h-6 rounded-full overflow-hidden bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: color }} />
          <div className="absolute inset-y-0 left-[35%] w-px bg-background/60" />
          <div className="absolute inset-y-0 left-[50%] w-px bg-background/60" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>0%</span><span>35%</span><span>50%</span><span>100%</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded bg-muted/40 p-2">
            <p className="text-muted-foreground">This EMI</p>
            <p className="font-medium">{formatINR(emiAmount)}</p>
          </div>
          <div className="rounded bg-muted/40 p-2">
            <p className="text-muted-foreground">Other EMIs</p>
            <p className="font-medium">{otherEMIs != null ? formatINR(otherEMIs) : "—"}</p>
          </div>
          <div className="rounded bg-muted/40 p-2">
            <p className="text-muted-foreground">DTI</p>
            <p className="font-medium text-base" style={{ color }}>{dti.toFixed(1)}%</p>
          </div>
        </div>
        {partial && (
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-2.5 text-xs text-blue-700 dark:text-blue-300">
            Add other EMIs for your full DTI picture.
          </div>
        )}
        <div className="rounded-md p-3 text-sm" style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}>Total debt is {dti.toFixed(1)}% of income. {msg}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature 6 — Prepayment Simulator ────────────────────────────────────────

function PrepaymentSim({
  loanAmount,
  interestRate,
  emiAmount,
  loanTenure,
  schedule,
  totalInterest,
  initPrepay,
}: {
  loanAmount: number;
  interestRate: number;
  emiAmount: number;
  loanTenure: number;
  schedule: AmortRow[];
  totalInterest: number;
  initPrepay: number | null;
}) {
  const [prepay, setPrepay] = useState<string>(initPrepay ? String(initPrepay) : "");
  const [prepayMonth, setPrepayMonth] = useState(1);

  const prepayNum = Number(prepay) || 0;

  const result = useMemo(() => {
    if (prepayNum <= 0) return null;
    const r = interestRate / 12 / 100;
    const preInterest = schedule.slice(0, prepayMonth - 1).reduce((s, row) => s + row.interest, 0);
    let rem = Math.max((schedule[prepayMonth - 1]?.balance ?? loanAmount) - prepayNum, 0);
    let modInt = 0;
    let months = prepayMonth;
    for (let m = 0; m < loanTenure; m++) {
      if (rem < 0.5) break;
      const int = rem * r;
      const p = Math.min(Math.max(emiAmount - int, 0), rem);
      modInt += int;
      rem = Math.max(rem - p, 0);
      months++;
    }
    const saved = totalInterest - (preInterest + modInt);
    const roi = saved > 0 && prepayNum > 0 ? (saved / prepayNum) * 100 : 0;
    return { saved, months, monthsSaved: schedule.length - months, roi };
  }, [prepayNum, prepayMonth, schedule, loanAmount, interestRate, emiAmount, loanTenure, totalInterest]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Prepayment Impact Simulator</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Prepayment Amount (₹)</label>
            <input
              type="number"
              value={prepay}
              onChange={(e) => setPrepay(e.target.value)}
              placeholder="Enter lump sum"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Apply at month: <strong>{prepayMonth}</strong>
            </label>
            <input
              type="range" min={1} max={loanTenure} value={prepayMonth}
              onChange={(e) => setPrepayMonth(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {result ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-md bg-muted/40 p-2 text-xs">
                <p className="text-muted-foreground">Original</p>
                <p className="font-medium">{formatTenure(schedule.length)}</p>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
                <p className="text-muted-foreground">New Tenure</p>
                <p className="font-medium text-green-700">{formatTenure(result.months)}</p>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
                <p className="text-muted-foreground">Interest Saved</p>
                <p className="font-medium text-green-700">{formatINR(result.saved)}</p>
              </div>
              <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
                <p className="text-muted-foreground">Months Saved</p>
                <p className="font-medium text-green-700">{result.monthsSaved}</p>
              </div>
            </div>
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-300">
              Paying <strong>{formatINR(prepayNum)}</strong> today saves{" "}
              <strong>{formatINR(result.saved)}</strong> in interest — a guaranteed return of{" "}
              <strong>{result.roi.toFixed(1)}%</strong> on that money.
            </div>
          </>
        ) : (
          <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground text-center">
            Enter a prepayment amount above to see the impact
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Feature 7 — Invest vs Prepay ────────────────────────────────────────────

function InvestVsPrepay({
  interestRate,
  loanTenure,
  totalInterest,
  loanAmount,
  prepaymentAmount,
  investmentReturn,
  taxBracket,
}: {
  interestRate: number;
  loanTenure: number;
  totalInterest: number;
  loanAmount: number;
  prepaymentAmount: number | null;
  investmentReturn: number | null;
  taxBracket: number | null;
}) {
  if (!investmentReturn || !prepaymentAmount) {
    return <LockedCard title="Invest vs. Prepay Decision" requires={["Investment Return %", "Prepayment Amount"]} />;
  }

  const yrs = loanTenure / 12;
  const taxOnGains = taxBracket ? investmentReturn * (taxBracket / 100) * 0.1 : 0;
  const postTaxReturn = investmentReturn - taxOnGains;
  const prepayReturn = interestRate;
  const verdict = prepayReturn > postTaxReturn ? "prepay" : "invest";

  const investWealth = prepaymentAmount * (Math.pow(1 + investmentReturn / 100, yrs) - 1);
  const prepayWealth = (prepaymentAmount / loanAmount) * totalInterest;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Invest vs. Prepay Decision</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-md p-3 space-y-1.5 border-2 ${verdict === "prepay" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-muted"}`}>
            <p className="text-xs font-semibold">If you PREPAY</p>
            <p className="text-xl font-bold text-green-700">{prepayReturn.toFixed(1)}% p.a.</p>
            <p className="text-xs text-muted-foreground">Guaranteed return</p>
            <p className="text-sm font-medium">{formatINR(prepayWealth)} saved</p>
          </div>
          <div className={`rounded-md p-3 space-y-1.5 border-2 ${verdict === "invest" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-muted"}`}>
            <p className="text-xs font-semibold">If you INVEST</p>
            <p className="text-xl font-bold text-blue-700">{postTaxReturn.toFixed(1)}% p.a.</p>
            <p className="text-xs text-muted-foreground">Post-tax return {taxBracket ? "(est.)" : "(pre-tax)"}</p>
            <p className="text-sm font-medium">{formatINR(investWealth)} gained</p>
          </div>
        </div>
        <div className={`rounded-md p-3 text-sm font-medium ${verdict === "prepay" ? "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300" : "bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300"}`}>
          {verdict === "prepay"
            ? "PREPAY — guaranteed saving beats post-tax investment return."
            : "INVEST — your investment return outpaces loan cost."}
        </div>
        {!taxBracket && (
          <p className="text-xs text-muted-foreground">Add your tax bracket for a more accurate post-tax comparison.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Prepayment return is guaranteed. Investment returns are market-linked and may vary.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Feature 8 — Tax Benefit ──────────────────────────────────────────────────

function TaxBenefit({
  schedule,
  loanAmount,
  interestRate,
  taxBracket,
  loanType,
}: {
  schedule: AmortRow[];
  loanAmount: number;
  interestRate: number;
  taxBracket: number | null;
  loanType: "home" | "personal" | null;
}) {
  if (!taxBracket || !loanType) {
    return <LockedCard title="Tax Benefit — Effective Interest Rate" requires={["Tax Bracket", "Loan Type"]} />;
  }
  if (loanType !== "home") {
    return (
      <Card className="opacity-70">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tax Benefit — Effective Interest Rate</CardTitle>
          <CardDescription>Only applicable for home loans (Section 24b)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Personal loans do not qualify for interest deductions.</p>
        </CardContent>
      </Card>
    );
  }

  const yr1 = schedule.slice(0, 12);
  const annInt = yr1.reduce((s, r) => s + r.interest, 0);
  const annPrin = yr1.reduce((s, r) => s + r.principal, 0);
  const dedInt = Math.min(annInt, 200000);
  const dedPrin = Math.min(annPrin, 150000);
  const savedInt = dedInt * (taxBracket / 100);
  const savedPrin = dedPrin * (taxBracket / 100);
  const totalSaved = savedInt + savedPrin;
  const effectiveRate = ((annInt - savedInt) / loanAmount) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Tax Benefit — Effective Interest Rate</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <p className="text-muted-foreground">Stated Rate</p>
            <p className="font-bold text-base">{interestRate.toFixed(2)}%</p>
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
            <p className="text-muted-foreground">Effective Rate</p>
            <p className="font-bold text-base text-green-700">{effectiveRate.toFixed(2)}%</p>
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
            <p className="text-muted-foreground">Annual Tax Saved</p>
            <p className="font-bold text-base text-green-700">{formatINR(totalSaved)}</p>
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground border rounded-md p-3">
          <div className="flex justify-between">
            <span>Sec 24(b) — Interest deduction (up to ₹2L)</span>
            <span className="text-green-700">{formatINR(savedInt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Sec 80C — Principal deduction (up to ₹1.5L)</span>
            <span className="text-green-700">{formatINR(savedPrin)}</span>
          </div>
        </div>
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-300">
          Your home loan effectively costs <strong>{effectiveRate.toFixed(2)}%</strong> — not{" "}
          <strong>{interestRate.toFixed(2)}%</strong> — after tax benefits.
        </div>
        <p className="text-xs text-muted-foreground">Assumes old tax regime. Consult a tax advisor.</p>
      </CardContent>
    </Card>
  );
}

// ─── Feature 9 — Multi-Loan Prioritization ───────────────────────────────────

function runMultiStrategy(sorted: MultiLoan[]) {
  const state = sorted.map((l) => ({ ...l, rem: l.balance, closed: false }));
  let totalInt = 0, month = 0;
  const order: string[] = [];
  while (state.some((s) => !s.closed) && month < 1200) {
    month++;
    let extraPool = state.filter((s) => s.closed).reduce((sum, s) => sum + s.emi, 0);
    for (let i = 0; i < state.length; i++) {
      const s = state[i];
      if (s.closed) continue;
      const r = s.rate / 12 / 100;
      const int = s.rem * r;
      totalInt += int;
      const isTarget = i === state.findIndex((x) => !x.closed);
      const payment = Math.min(s.emi + (isTarget ? extraPool : 0), s.rem + int);
      if (isTarget) extraPool = 0;
      const prin = Math.max(payment - int, 0);
      s.rem = Math.max(s.rem - prin, 0);
      if (s.rem < 0.5) {
        s.closed = true;
        order.push(s.name || `Loan ${i + 1}`);
      }
    }
  }
  return { totalInt, months: month, order };
}

function MultiLoanPriority({ seedLoan }: { seedLoan: { loanAmount: number; interestRate: number; emiAmount: number } | null }) {
  const [loans, setLoans] = useState<MultiLoan[]>([
    ...(seedLoan ? [{ id: 1, name: "Current Loan", balance: seedLoan.loanAmount, rate: seedLoan.interestRate, emi: seedLoan.emiAmount }] : []),
    { id: 2, name: "", balance: 0, rate: 0, emi: 0 },
  ]);

  const add = () => setLoans((p) => [...p, { id: Date.now(), name: "", balance: 0, rate: 0, emi: 0 }]);
  const remove = (id: number) => setLoans((p) => p.filter((l) => l.id !== id));
  const update = (id: number, f: keyof MultiLoan, v: string | number) =>
    setLoans((p) => p.map((l) => (l.id === id ? { ...l, [f]: v } : l)));

  const valid = loans.filter((l) => l.balance > 0 && l.rate > 0 && l.emi > 0);

  const avalanche = useMemo(
    () => valid.length >= 2 ? runMultiStrategy([...valid].sort((a, b) => b.rate - a.rate)) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loans]
  );
  const snowball = useMemo(
    () => valid.length >= 2 ? runMultiStrategy([...valid].sort((a, b) => a.balance - b.balance)) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loans]
  );

  const inputRows = (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5 text-xs text-muted-foreground font-medium px-1">
        <span>Name</span><span>Balance (₹)</span><span>Rate (%)</span><span>EMI (₹)</span>
      </div>
      {loans.map((loan) => (
        <div key={loan.id} className="grid grid-cols-4 gap-1.5">
          <input placeholder="Loan name" value={loan.name} onChange={(e) => update(loan.id, "name", e.target.value)}
            className="h-8 rounded border border-input bg-transparent px-2 text-xs" />
          <input type="number" placeholder="Balance" value={loan.balance || ""} onChange={(e) => update(loan.id, "balance", Number(e.target.value))}
            className="h-8 rounded border border-input bg-transparent px-2 text-xs" />
          <input type="number" placeholder="Rate" value={loan.rate || ""} onChange={(e) => update(loan.id, "rate", Number(e.target.value))}
            className="h-8 rounded border border-input bg-transparent px-2 text-xs" />
          <div className="flex gap-1">
            <input type="number" placeholder="EMI" value={loan.emi || ""} onChange={(e) => update(loan.id, "emi", Number(e.target.value))}
              className="flex-1 h-8 rounded border border-input bg-transparent px-2 text-xs" />
            {loans.length > 1 && (
              <button onClick={() => remove(loan.id)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
        <Plus className="h-3.5 w-3.5" /> Add another loan
      </button>
    </div>
  );

  if (valid.length < 2 || !avalanche || !snowball) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Multi-Loan Prioritization</CardTitle>
            <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />Needs 2+ loans</Badge>
          </div>
          <CardDescription>Add at least 2 valid loans to compare Avalanche vs Snowball</CardDescription>
        </CardHeader>
        <CardContent>{inputRows}</CardContent>
      </Card>
    );
  }

  const diff = snowball.totalInt - avalanche.totalInt;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Multi-Loan Prioritization</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
        <CardDescription>Avalanche (high rate first) vs Snowball (low balance first)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs font-semibold text-orange-600">AVALANCHE</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Interest</span><span className="font-medium">{formatINR(avalanche.totalInt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Months to free</span><span className="font-medium">{avalanche.months}</span></div>
              <div>
                <p className="text-muted-foreground mb-0.5">Payoff order</p>
                {avalanche.order.map((n, i) => <p key={i} className="font-medium">{i + 1}. {n}</p>)}
              </div>
            </div>
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-600">SNOWBALL</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Interest</span><span className="font-medium">{formatINR(snowball.totalInt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Months to free</span><span className="font-medium">{snowball.months}</span></div>
              <div>
                <p className="text-muted-foreground mb-0.5">Payoff order</p>
                {snowball.order.map((n, i) => <p key={i} className="font-medium">{i + 1}. {n}</p>)}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
          {diff > 0
            ? `Avalanche saves you ${formatINR(diff)} more than Snowball over the loan period.`
            : `Snowball saves you ${formatINR(Math.abs(diff))} — but Avalanche is usually mathematically optimal.`}
        </div>
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Manage loans</p>
          {inputRows}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature 10 — Refinancing ─────────────────────────────────────────────────

function RefinancingBreakEven({
  loanAmount,
  emiAmount,
  loanTenure,
  interestRate,
  totalInterest,
  newInterestRate,
  refinanceFee,
}: {
  loanAmount: number;
  emiAmount: number;
  loanTenure: number;
  interestRate: number;
  totalInterest: number;
  newInterestRate: number | null;
  refinanceFee: number | null;
}) {
  if (!newInterestRate) return <LockedCard title="Refinancing Break-Even Analysis" requires={["New Interest Rate offer"]} />;

  const fee = refinanceFee ?? 0;
  const newEMI = calcEMI(loanAmount, newInterestRate, loanTenure);
  const newSchedule = computeAmortization(loanAmount, newInterestRate, newEMI, loanTenure);
  const newTotalInt = newSchedule.reduce((s, r) => s + r.interest, 0);
  const gross = totalInterest - newTotalInt;
  const net = gross - fee;
  const monthlySaving = emiAmount - newEMI;
  const breakEven = monthlySaving > 0 ? Math.ceil(fee / monthlySaving) : Infinity;
  const worth = net > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Refinancing Break-Even Analysis</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!refinanceFee && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-2.5 text-xs text-amber-700 dark:text-amber-300">
            Refinancing fee not provided — assuming ₹0. Add it in Advanced Inputs for accurate break-even.
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <p className="text-muted-foreground">New EMI</p>
            <p className="font-bold text-sm">{formatINR(newEMI)}</p>
            <p className="text-muted-foreground mt-0.5">was {formatINR(emiAmount)}</p>
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
            <p className="text-muted-foreground">Monthly Saving</p>
            <p className="font-bold text-sm text-green-700">{formatINR(monthlySaving)}</p>
          </div>
          <div className={`rounded-md p-2 text-xs ${worth ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
            <p className="text-muted-foreground">Net Interest Saved</p>
            <p className={`font-bold text-sm ${worth ? "text-green-700" : "text-red-600"}`}>
              {formatINR(Math.abs(net))}{!worth && " (loss)"}
            </p>
          </div>
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <p className="text-muted-foreground">Break-even</p>
            <p className="font-bold text-sm">{isFinite(breakEven) ? `Month ${breakEven}` : "N/A"}</p>
          </div>
        </div>
        {isFinite(breakEven) && breakEven < loanTenure && (
          <>
            <div className="relative h-5 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-amber-400 rounded-full"
                style={{ width: `${(breakEven / loanTenure) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Now</span>
              <span>Break-even: month {breakEven}</span>
              <span>{interestRate}% → {newInterestRate}%</span>
            </div>
          </>
        )}
        <div className={`rounded-md p-3 text-sm ${worth ? "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400"}`}>
          {worth
            ? `You recover the switching cost in ${isFinite(breakEven) ? breakEven : "?"} months. After that, you save ${formatINR(net)}.`
            : `Not worth it — switching costs outweigh savings by ${formatINR(Math.abs(net))}.`}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature 11 — Inflation Adjusted Cost ────────────────────────────────────

function InflationAdjusted({ emiAmount, loanTenure, inflationRate }: { emiAmount: number; loanTenure: number; inflationRate: number }) {
  const nominal = emiAmount * loanTenure;
  const mi = inflationRate / 12 / 100;

  const { realTotal, chartData } = useMemo(() => {
    let real = 0;
    const data: { month: number; Nominal: number; Real: number }[] = [];
    const step = Math.max(1, Math.floor(loanTenure / 60));
    for (let m = 1; m <= loanTenure; m++) {
      const pv = emiAmount / Math.pow(1 + mi, m);
      real += pv;
      if (m % step === 0 || m === loanTenure) {
        data.push({ month: m, Nominal: Math.round(emiAmount), Real: Math.round(pv) });
      }
    }
    return { realTotal: real, chartData: data };
  }, [emiAmount, loanTenure, mi]);

  const discount = nominal - realTotal;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Inflation-Adjusted True Cost</CardTitle>
          <Badge className="text-xs bg-green-600 text-white">Active</Badge>
        </div>
        <CardDescription>At {inflationRate}% inflation, what each future EMI is worth in today's ₹</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted/40 p-2 text-xs">
            <p className="text-muted-foreground">Nominal Total</p>
            <p className="font-bold text-sm">{formatINR(nominal)}</p>
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
            <p className="text-muted-foreground">Real Total (today's ₹)</p>
            <p className="font-bold text-sm text-green-700">{formatINR(realTotal)}</p>
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 p-2 text-xs">
            <p className="text-muted-foreground">Inflation Discount</p>
            <p className="font-bold text-sm text-green-700">{formatINR(discount)}</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: "Month", position: "insideBottom", offset: -4, fontSize: 10 }} />
              <YAxis tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={48} />
              <RechartsTooltip formatter={(v: number, n: string) => [formatINR(v), n]} labelFormatter={(l: number) => `Month ${l}`} />
              <Legend verticalAlign="top" height={24} />
              <Line type="monotone" dataKey="Nominal" stroke="#94a3b8" name="Nominal EMI" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Real" stroke="#22c55e" name="Real EMI (today's ₹)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-300">
          In real terms, your loan costs <strong>{formatINR(discount)}</strong> less than it appears — inflation erodes the burden over time.
        </div>
        <p className="text-xs text-muted-foreground">
          This does NOT mean the loan is cheap. It means later payments hurt less than early ones.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "core" | "health" | "optimize";

export default function LoanAnalyserPage() {
  const [apiLoans, setApiLoans] = useState<ApiAccount[]>([]);
  const [selectedId, setSelectedId] = useState<number>(0);

  // Core inputs
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [emiAmount, setEmiAmount] = useState<number>(0);
  const [loanTenure, setLoanTenure] = useState<number>(0);

  // Optional inputs
  const [salary, setSalary] = useState("");
  const [otherEMIs, setOtherEMIs] = useState("");
  const [taxBracket, setTaxBracket] = useState("");
  const [loanType, setLoanType] = useState<"home" | "personal" | "">("");
  const [prepayAmt, setPrepayAmt] = useState("");
  const [investReturn, setInvestReturn] = useState("");
  const [newRate, setNewRate] = useState("");
  const [refieFee, setRefieFee] = useState("");
  const [inflation, setInflation] = useState("5.5");

  const [showAdv, setShowAdv] = useState(false);
  const [tab, setTab] = useState<Tab>("core");

  // Fetch loans from API
  useEffect(() => {
    apiFetch("/api/accounts?is_active=true")
      .then((r) => r.json())
      .then((data: ApiAccount[]) => setApiLoans((data ?? []).filter((a) => a.category === "loan")))
      .catch(() => {});
  }, []);

  // Pre-populate from selected loan
  useEffect(() => {
    const loan = apiLoans.find((l) => l.id === selectedId);
    if (!loan) return;
    setLoanAmount(loan.invested_amount ?? 0);
    setInterestRate(loan.interest_rate ?? 0);
    setEmiAmount(loan.emi_amount ?? 0);
    setLoanTenure(loan.tenure_months ?? 0);
  }, [selectedId, apiLoans]);

  // Parse optionals
  const salaryNum = salary ? Number(salary) || null : null;
  const otherEMIsNum = otherEMIs ? Number(otherEMIs) || null : null;
  const taxNum = taxBracket ? Number(taxBracket) || null : null;
  const prepayNum = prepayAmt ? Number(prepayAmt) || null : null;
  const investNum = investReturn ? Number(investReturn) || null : null;
  const newRateNum = newRate ? Number(newRate) || null : null;
  const refieFeeNum = refieFee ? Number(refieFee) || null : null;
  const inflationNum = Number(inflation) || 5.5;

  const coreValid = loanAmount > 0 && interestRate > 0 && emiAmount > 0 && loanTenure > 0;
  const monthlyRate = interestRate / 12 / 100;
  const emiTooLow = coreValid && emiAmount <= loanAmount * monthlyRate;

  const schedule = useMemo(() =>
    coreValid ? computeAmortization(loanAmount, interestRate, emiAmount, loanTenure) : [],
    [loanAmount, interestRate, emiAmount, loanTenure, coreValid]
  );
  const totalInterest = useMemo(() => schedule.reduce((s, r) => s + r.interest, 0), [schedule]);

  const tabStyle = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold">Loan Insights</h1>
        </header>

        <div className="flex-1 space-y-5 p-5">
          {/* Loan selector */}
          {apiLoans.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium shrink-0">Load from account:</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value={0}>— or enter manually below —</option>
                {apiLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}{l.institution ? ` — ${l.institution}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Input form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Loan Parameters</CardTitle>
              <CardDescription>Core fields are required. Advanced inputs unlock additional features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Loan Amount (₹) *", val: loanAmount, set: setLoanAmount, ph: "e.g. 50,00,000" },
                  { label: "Interest Rate (% p.a.) *", val: interestRate, set: setInterestRate, ph: "e.g. 8.5", step: "0.01" },
                  { label: "EMI Amount (₹/mo) *", val: emiAmount, set: setEmiAmount, ph: "e.g. 45,000" },
                  { label: "Loan Tenure (months) *", val: loanTenure, set: setLoanTenure, ph: "e.g. 240" },
                ].map(({ label, val, set, ph, step }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-xs font-medium">{label}</label>
                    <input
                      type="number"
                      step={step}
                      value={val || ""}
                      onChange={(e) => set(Number(e.target.value))}
                      placeholder={ph}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    />
                  </div>
                ))}
              </div>

              {emiTooLow && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  EMI is too low — loan may never close. Minimum to cover interest: {formatINR(loanAmount * monthlyRate + 1)}
                </div>
              )}

              <button onClick={() => setShowAdv((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                {showAdv ? <><ChevronUp className="h-4 w-4" /> Hide advanced inputs</> : <><ChevronDown className="h-4 w-4" /> Show advanced inputs (unlocks more features)</>}
              </button>

              {showAdv && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t">
                  {[
                    { label: "Monthly Salary (₹)", val: salary, set: setSalary, ph: "Take-home pay" },
                    { label: "Other EMIs (₹/mo)", val: otherEMIs, set: setOtherEMIs, ph: "All other loans" },
                    { label: "Tax Bracket (%)", val: taxBracket, set: setTaxBracket, ph: "e.g. 30" },
                    { label: "Prepayment Amount (₹)", val: prepayAmt, set: setPrepayAmt, ph: "Lump sum" },
                    { label: "Investment Return (% p.a.)", val: investReturn, set: setInvestReturn, ph: "e.g. 12" },
                    { label: "New Rate Offer (% p.a.)", val: newRate, set: setNewRate, ph: "Refinance offer" },
                    { label: "Refinancing Fee (₹)", val: refieFee, set: setRefieFee, ph: "Processing fee" },
                    { label: "Inflation Rate (%)", val: inflation, set: setInflation, ph: "Default 5.5" },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <input type="number" step="0.01" value={val} onChange={(e) => set(e.target.value)} placeholder={ph}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs" />
                    </div>
                  ))}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Loan Type</label>
                    <select value={loanType} onChange={(e) => setLoanType(e.target.value as "home" | "personal" | "")}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs">
                      <option value="">Select type</option>
                      <option value="home">Home Loan</option>
                      <option value="personal">Personal Loan</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {coreValid && !emiTooLow ? (
            <>
              {/* Tab nav */}
              <div className="flex gap-0 border-b">
                <button className={tabStyle("core")} onClick={() => setTab("core")}>Core Metrics</button>
                <button className={tabStyle("health")} onClick={() => setTab("health")}>Financial Health</button>
                <button className={tabStyle("optimize")} onClick={() => setTab("optimize")}>Optimization</button>
              </div>

              <div className="space-y-5 pb-8">
                {tab === "core" && (
                  <>
                    <TrueCost loanAmount={loanAmount} emiAmount={emiAmount} loanTenure={loanTenure} />
                    <AmortizationSchedule schedule={schedule} loanTenure={loanTenure} totalInterest={totalInterest} />
                    <PayoffDate schedule={schedule} />
                  </>
                )}

                {tab === "health" && (
                  <>
                    <EMIToSalary emiAmount={emiAmount} monthlySalary={salaryNum} />
                    <DTIRatio emiAmount={emiAmount} monthlySalary={salaryNum} otherEMIs={otherEMIsNum} />
                  </>
                )}

                {tab === "optimize" && (
                  <>
                    <PrepaymentSim
                      loanAmount={loanAmount} interestRate={interestRate}
                      emiAmount={emiAmount} loanTenure={loanTenure}
                      schedule={schedule} totalInterest={totalInterest} initPrepay={prepayNum}
                    />
                    <InvestVsPrepay
                      interestRate={interestRate} loanTenure={loanTenure}
                      totalInterest={totalInterest} loanAmount={loanAmount}
                      prepaymentAmount={prepayNum} investmentReturn={investNum} taxBracket={taxNum}
                    />
                    <TaxBenefit
                      schedule={schedule} loanAmount={loanAmount} interestRate={interestRate}
                      taxBracket={taxNum} loanType={loanType || null}
                    />
                    <MultiLoanPriority seedLoan={{ loanAmount, interestRate, emiAmount }} />
                    <RefinancingBreakEven
                      loanAmount={loanAmount} emiAmount={emiAmount} loanTenure={loanTenure}
                      interestRate={interestRate} totalInterest={totalInterest}
                      newInterestRate={newRateNum} refinanceFee={refieFeeNum}
                    />
                    <InflationAdjusted emiAmount={emiAmount} loanTenure={loanTenure} inflationRate={inflationNum} />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/20 p-10 text-center text-muted-foreground">
              <p className="text-sm">Fill in the four core loan parameters above to see insights.</p>
              <p className="text-xs mt-1 opacity-70">Loan Amount · Interest Rate · EMI · Tenure</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
