import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
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


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoanAnalyserPage() {
  const [apiLoans, setApiLoans] = useState<ApiAccount[]>([]);
  const [selectedId, setSelectedId] = useState<number>(0);

  // Core inputs
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [emiAmount, setEmiAmount] = useState<number>(0);
  const [loanTenure, setLoanTenure] = useState<number>(0);

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

  const coreValid = loanAmount > 0 && interestRate > 0 && emiAmount > 0 && loanTenure > 0;
  const monthlyRate = interestRate / 12 / 100;
  const emiTooLow = coreValid && emiAmount <= loanAmount * monthlyRate;

  const schedule = useMemo(() =>
    coreValid ? computeAmortization(loanAmount, interestRate, emiAmount, loanTenure) : [],
    [loanAmount, interestRate, emiAmount, loanTenure, coreValid]
  );
  const totalInterest = useMemo(() => schedule.reduce((s, r) => s + r.interest, 0), [schedule]);

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
          {/* Portfolio summary */}
          {apiLoans.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Loans</CardDescription>
                  <CardTitle className="text-3xl">{apiLoans.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Loan Amount</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatINR(apiLoans.reduce((s, l) => s + (l.invested_amount ?? 0), 0))}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Monthly EMI</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatINR(apiLoans.reduce((s, l) => s + (l.emi_amount ?? 0), 0))}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Loan selector */}
          {apiLoans.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium shrink-0">Select loan:</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value={0}>— choose a loan —</option>
                {apiLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}{l.institution ? ` — ${l.institution}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Loan details */}
          {selectedId > 0 && (() => {
            const loan = apiLoans.find((l) => l.id === selectedId);
            if (!loan) return null;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{loan.name}</CardTitle>
                      {loan.institution && <CardDescription>{loan.institution}</CardDescription>}
                    </div>
                    <Badge className="text-xs bg-green-600 text-white">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-md bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Loan Amount</p>
                      <p className="text-lg font-bold">{formatINR(loan.invested_amount ?? 0)}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Interest Rate</p>
                      <p className="text-lg font-bold">{loan.interest_rate?.toFixed(2) ?? "—"}% p.a.</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Monthly EMI</p>
                      <p className="text-lg font-bold">{formatINR(loan.emi_amount ?? 0)}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Tenure</p>
                      <p className="text-lg font-bold">{loan.tenure_months ? formatTenure(loan.tenure_months) : "—"}</p>
                    </div>
                  </div>
                  {emiTooLow && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      EMI is too low — loan may never close. Minimum to cover interest: {formatINR(loanAmount * monthlyRate + 1)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {coreValid && !emiTooLow ? (
            <div className="space-y-5 pb-8">
              <TrueCost loanAmount={loanAmount} emiAmount={emiAmount} loanTenure={loanTenure} />
              <AmortizationSchedule schedule={schedule} loanTenure={loanTenure} totalInterest={totalInterest} />
              <PayoffDate schedule={schedule} />
            </div>
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
