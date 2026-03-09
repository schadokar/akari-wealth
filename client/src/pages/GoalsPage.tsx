import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  FlagIcon,
  CheckCircle2Icon,
  CirclePauseIcon,
  CircleDotIcon,
  TrophyIcon,
  TargetIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
} from "lucide-react";

// --- Types ---

interface GoalMapping {
  id: number;
  goal_id: number;
  asset_table: "account" | "holding";
  asset_type: string;
  asset_id: number;
  allocation_weight: number;
}

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  status: "active" | "achieved" | "paused";
  priority: number;
  target_date?: string;
  notes?: string;
  mappings: GoalMapping[];
  created_at: string;
  updated_at: string;
}

interface Account {
  id: number;
  name: string;
  category: string;
  asset_class: string;
  current_amount?: number;
  invested_amount?: number;
}

interface Holding {
  id: number;
  name: string;
  instrument_type: string; // "stock" | "mutual_fund"
  asset_class?: string;
  is_active: boolean;
}

interface GoalMonthPoint {
  month: string;
  current: number;
}

interface GoalAnalytics {
  goal_id: number;
  current_amount: number;
  invested_amount: number;
  unrealized_gain: number;
  return_pct: number;
  asset_breakdown: Record<string, number>;
  monthly_history: GoalMonthPoint[];
  goal_age_months: number;
  est_months_left?: number;
}

interface GoalSuggestion {
  name: string;
  priority: number;
  notes?: string;
}

interface MappingRow {
  asset_table: "account" | "holding";
  asset_id: string;
  weight: string;
}

// --- Helpers ---

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function timeRemaining(targetDate: string): { label: string; urgent: boolean } | null {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, urgent: true };
  if (diffDays === 0) return { label: "Due today", urgent: true };
  if (diffDays < 30) return { label: `${diffDays}d left`, urgent: diffDays < 7 };
  const months = Math.round(diffDays / 30.44);
  if (months < 24) return { label: `${months}mo left`, urgent: months < 3 };
  const years = (diffDays / 365.25).toFixed(1);
  return { label: `${years}yr left`, urgent: false };
}

function monthlyRequired(current: number, target: number, targetDate: string): number | null {
  const now = new Date();
  const end = new Date(targetDate);
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  if (months <= 0) return null;
  const remaining = target - current;
  if (remaining <= 0) return 0;
  return remaining / months;
}

function progressBarColor(pct: number): string {
  if (pct >= 100) return "bg-blue-500";
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-yellow-500";
  if (pct >= 25) return "bg-amber-500";
  return "bg-red-400";
}

function statusMeta(status: string) {
  switch (status) {
    case "achieved":
      return { label: "Achieved", Icon: CheckCircle2Icon, badgeClass: "bg-blue-600 text-white border-blue-600" };
    case "paused":
      return { label: "Paused", Icon: CirclePauseIcon, badgeClass: "" };
    default:
      return { label: "Active", Icon: CircleDotIcon, badgeClass: "border-emerald-500 text-emerald-600 dark:text-emerald-400" };
  }
}

const PRIORITY_LEVELS: Record<number, { label: string; short: string; color: string; description: string; examples: string }> = {
  1: {
    label: "Essential / Non-Negotiable",
    short: "P1 · Essential",
    color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    description: "Survival and safety. Must be funded before any others. If unmet, a single bad event could lead to financial ruin.",
    examples: "Emergency Fund (3–6 months expenses), Health Insurance, high-interest debt repayment",
  },
  2: {
    label: "Important / High Priority",
    short: "P2 · Important",
    color: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
    description: "Security and long-term stability. Hard deadlines — you cannot recover lost compounding time or delay a child's college start.",
    examples: "Retirement corpus, Child's primary education, Home down payment",
  },
  3: {
    label: "Moderate / Standard",
    short: "P3 · Moderate",
    color: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
    description: "Planned lifestyle improvements. Target date can shift 6–12 months without major life stress.",
    examples: "Reliable car upgrade, Home renovation, Standard annual vacation",
  },
  4: {
    label: "Flexible / Low Priority",
    short: "P4 · Flexible",
    color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    description: "Enhancements and comforts. Funded only when higher priorities are on track. First to pause during a downturn.",
    examples: "Luxury hobby equipment, Premium international travel, speculative investments",
  },
  5: {
    label: "Aspirational / Optional",
    short: "P5 · Aspirational",
    color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    description: "Dream list — purely for excess wealth. Quality of life remains excellent even if never achieved.",
    examples: "Vacation home, Early retirement (FIRE), Luxury car, High-end jewelry",
  },
};

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const ASSET_CLASS_COLORS: Record<string, string> = {
  equity:    "var(--color-chart-2)",
  debt:      "var(--color-chart-1)",
  commodity: "var(--color-chart-4)",
  hybrid:    "var(--color-chart-3)",
  cash:      "var(--color-chart-5)",
};

const statusChartConfig = {
  active:   { label: "Active",   color: "var(--color-chart-2)" },
  achieved: { label: "Achieved", color: "var(--color-chart-1)" },
  paused:   { label: "Paused",   color: "var(--color-chart-4)" },
} satisfies ChartConfig;

const targetDistConfig = {
  value: { label: "Target" },
} satisfies ChartConfig;

// --- Sub-components ---

function GoalProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatINR(current)}</span>
        <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
        <span>{formatINR(target)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${progressBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GoalRadialMini({ name, pct, status }: { name: string; pct: number; status: string }) {
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  const fillColor = pct >= 100 ? "var(--color-chart-1)" : pct >= 50 ? "var(--color-chart-2)" : "var(--color-chart-5)";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <ChartContainer
        config={{ value: { label: name, color: fillColor } }}
        className="h-20 w-20"
      >
        <RadialBarChart
          data={[{ name, value: Math.min(pct, 100) }]}
          startAngle={90}
          endAngle={-270}
          innerRadius={26}
          outerRadius={40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background cornerRadius={4} fill={fillColor} />
        </RadialBarChart>
      </ChartContainer>
      <p className="w-20 truncate text-center text-[11px] font-medium leading-tight">{name}</p>
      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${meta.badgeClass}`}>
        <Icon className="mr-0.5 size-2.5" />
        {pct.toFixed(0)}%
      </Badge>
    </div>
  );
}

function GoalSparkline({ history }: { history: GoalMonthPoint[] }) {
  if (history.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={history}>
        <Line
          type="monotone"
          dataKey="current"
          stroke="var(--color-chart-2)"
          strokeWidth={1.5}
          dot={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              const pt = payload[0].payload as GoalMonthPoint;
              return (
                <div className="rounded border bg-popover px-2 py-1 text-[10px] shadow">
                  <p className="text-muted-foreground">{pt.month}</p>
                  <p className="font-semibold">{formatINR(pt.current)}</p>
                </div>
              );
            }
            return null;
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// --- Goal Form Dialog ---

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  accounts: Account[];
  holdings: Holding[];
  editGoal?: Goal | null;
}

function GoalFormDialog({ open, onClose, onSaved, accounts, holdings, editGoal }: GoalFormProps) {
  const isEdit = !!editGoal;
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");
  const [priority, setPriority] = useState(3);
  const [targetDate, setTargetDate] = useState("");
  const [mappings, setMappings] = useState<MappingRow[]>([{ asset_table: "account", asset_id: "", weight: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);

  useEffect(() => {
    if (open && !isEdit) {
      apiFetch("/api/goals/suggestions")
        .then((r) => r.json())
        .then((data) => setSuggestions(data ?? []))
        .catch(() => {});
    }
  }, [open, isEdit]);

  useEffect(() => {
    if (open) {
      if (editGoal) {
        setName(editGoal.name);
        setTarget(String(editGoal.target_amount));
        setNotes(editGoal.notes ?? "");
        setStatus(editGoal.status);
        setPriority(editGoal.priority || 3);
        setTargetDate(editGoal.target_date ?? "");
        setMappings(
          editGoal.mappings.length > 0
            ? editGoal.mappings.map((m) => ({
                asset_table: m.asset_table,
                asset_id: String(m.asset_id),
                weight: String(Math.round(m.allocation_weight * 100)),
              }))
            : [{ asset_table: "account", asset_id: "", weight: "" }]
        );
      } else {
        setName("");
        setTarget("");
        setNotes("");
        setStatus("active");
        setPriority(3);
        setTargetDate("");
        setMappings([{ asset_table: "account", asset_id: "", weight: "" }]);
      }
      setError("");
    }
  }, [open, editGoal]);

  const updateMapping = (idx: number, field: keyof MappingRow, value: string) =>
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));

  const addMappingRow = () => setMappings((prev) => [...prev, { asset_table: "account", asset_id: "", weight: "" }]);
  const removeMappingRow = (idx: number) => setMappings((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const targetNum = parseFloat(target);
    if (!name.trim() || isNaN(targetNum) || targetNum <= 0) {
      setError("Name and a positive target amount are required.");
      return;
    }

    const validMappings = mappings.filter((m) => m.asset_id && m.weight);
    if (validMappings.length === 0) {
      setError("Add at least one asset mapping.");
      return;
    }
    const totalWeight = validMappings.reduce((s, m) => s + parseFloat(m.weight || "0"), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      setError(`Weights must sum to 100% (currently ${totalWeight}%).`);
      return;
    }

    const mappingPayload = validMappings.map((m) => {
      if (m.asset_table === "holding") {
        const h = holdings.find((h) => h.id === Number(m.asset_id));
        return {
          asset_table: "holding",
          asset_type: h?.instrument_type ?? "stock",
          asset_id: Number(m.asset_id),
          allocation_weight: parseFloat(m.weight) / 100,
        };
      }
      const acc = accounts.find((a) => a.id === Number(m.asset_id));
      return {
        asset_table: "account",
        asset_type: acc?.category ?? "bank",
        asset_id: Number(m.asset_id),
        allocation_weight: parseFloat(m.weight) / 100,
      };
    });

    setSaving(true);
    try {
      if (isEdit && editGoal) {
        await apiFetch(`/api/goals/${editGoal.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: name.trim(), target_amount: targetNum, notes: notes.trim() || null, status, priority, target_date: targetDate || null }),
        });
        await apiFetch(`/api/goals/${editGoal.id}/mappings`, {
          method: "PUT",
          body: JSON.stringify(mappingPayload),
        });
      } else {
        await apiFetch("/api/goals", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), target_amount: targetNum, notes: notes.trim() || null, priority, target_date: targetDate || null, mappings: mappingPayload }),
        });
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to save goal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const accountOptions = accounts.filter((a) => !["credit_card", "loan"].includes(a.category));
  const totalWeight = mappings.reduce((s, m) => s + (parseFloat(m.weight) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Goal" : "Add Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          {/* Row 1: core fields (left) + suggestions (right) */}
          <div className={!isEdit ? "grid grid-cols-[1fr_200px] gap-6" : ""}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Retirement corpus" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Amount (₹)</label>
                <Input
                  type="number"
                  min={1}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. 10000000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  >
                    {Object.entries(PRIORITY_LEVELS).map(([lvl, meta]) => (
                      <option key={lvl} value={lvl}>{meta.short}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground leading-snug">{PRIORITY_LEVELS[priority]?.description}</p>
                  <p className="text-[11px] text-muted-foreground italic">e.g. {PRIORITY_LEVELS[priority]?.examples}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Target Date <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                        {targetDate ? format(parseISO(targetDate), "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={targetDate ? parseISO(targetDate) : undefined}
                        onSelect={(date) => setTargetDate(date ? format(date, "yyyy-MM-dd") : "")}
                        captionLayout="dropdown"
                        disabled={{ before: new Date() }}
                        fromYear={new Date().getFullYear()}
                        toYear={new Date().getFullYear() + 30}
                        initialFocus
                      />
                      {targetDate && (
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground"
                            onClick={() => setTargetDate("")}
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {isEdit && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="achieved">Achieved</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              )}
            </div>

            {!isEdit && suggestions.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Suggestions</label>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setName(s.name);
                        setPriority(s.priority);
                        setNotes(s.notes ?? "");
                      }}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-muted transition-colors"
                      title={s.notes}
                    >
                      <span className={`size-1.5 rounded-full ${PRIORITY_LEVELS[s.priority]?.color.split(" ")[0] ?? "bg-muted"}`} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: notes, asset mappings, error, submit */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Asset Mappings</label>
              <button
                type="button"
                onClick={addMappingRow}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <PlusIcon className="size-3" /> Add row
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Select accounts or holdings and their % allocation. Weights must sum to 100%.</p>
            <div className="space-y-2">
              {mappings.map((m, idx) => {
                const stocks = holdings.filter((h) => h.instrument_type === "stock" && h.is_active);
                const mutualFunds = holdings.filter((h) => h.instrument_type === "mutual_fund" && h.is_active);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <select
                        className="w-28 shrink-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        value={m.asset_table}
                        onChange={(e) => {
                          updateMapping(idx, "asset_table", e.target.value as "account" | "holding");
                          updateMapping(idx, "asset_id", "");
                        }}
                      >
                        <option value="account">Account</option>
                        <option value="holding">Holding</option>
                      </select>
                      <select
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm min-w-0"
                        value={m.asset_id}
                        onChange={(e) => updateMapping(idx, "asset_id", e.target.value)}
                      >
                        {m.asset_table === "account" ? (
                          <>
                            <option value="">Select account…</option>
                            {accountOptions.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} ({a.category})
                              </option>
                            ))}
                          </>
                        ) : (
                          <>
                            <option value="">Select holding…</option>
                            {stocks.length > 0 && (
                              <optgroup label="Stocks">
                                {stocks.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {mutualFunds.length > 0 && (
                              <optgroup label="Mutual Funds">
                                {mutualFunds.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )}
                      </select>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        className="w-20 shrink-0"
                        placeholder="%"
                        value={m.weight}
                        onChange={(e) => updateMapping(idx, "weight", e.target.value)}
                      />
                      {mappings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMappingRow(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className={`text-xs text-right ${Math.abs(totalWeight - 100) < 0.01 ? "text-emerald-600" : "text-muted-foreground"}`}>
              Total: {totalWeight}%
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [analytics, setAnalytics] = useState<GoalAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [sortBy, setSortBy] = useState<"priority" | "target_date">("priority");

  const loadData = useCallback(() => {
    setLoading(true);
    return Promise.all([
      apiFetch("/api/goals").then((r) => r.json()),
      apiFetch("/api/accounts").then((r) => r.json()),
      apiFetch("/api/holdings").then((r) => r.json()),
      apiFetch("/api/goals/analytics").then((r) => r.json()),
    ]).then(([g, a, h, an]) => {
      setGoals(g ?? []);
      setAccounts(a ?? []);
      setHoldings(h ?? []);
      setAnalytics(an ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  const holdingMap = useMemo(
    () => new Map(holdings.map((h) => [h.id, h])),
    [holdings]
  );

  const analyticsMap = useMemo(
    () => new Map(analytics.map((a) => [a.goal_id, a])),
    [analytics]
  );

  const goalProgress = useMemo(() => {
    return goals.map((g) => {
      const an = analyticsMap.get(g.id);
      if (an) {
        const pct = g.target_amount > 0 ? (an.current_amount / g.target_amount) * 100 : 0;
        return { goalId: g.id, current: an.current_amount, pct, hasAccountData: true };
      }
      let current = 0;
      let hasAccountData = false;
      for (const m of g.mappings) {
        if (m.asset_table === "account") {
          const acc = accountMap.get(m.asset_id);
          if (acc?.current_amount != null) {
            current += acc.current_amount * m.allocation_weight;
            hasAccountData = true;
          }
        }
      }
      const pct = g.target_amount > 0 ? (current / g.target_amount) * 100 : 0;
      return { goalId: g.id, current, pct, hasAccountData };
    });
  }, [goals, accountMap, analyticsMap]);

  const progressMap = useMemo(
    () => new Map(goalProgress.map((p) => [p.goalId, p])),
    [goalProgress]
  );

  const handleStatusChange = useCallback(async (goalId: number, newStatus: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || goal.status === newStatus) return;
    if (newStatus === "achieved") {
      const progress = progressMap.get(goalId);
      if (!progress || progress.pct < 100) {
        toast.error("Goal not yet reached", { description: `${(progress?.pct ?? 0).toFixed(1)}% complete — reach 100% before marking as achieved.` });
        return;
      }
    }
    try {
      await apiFetch(`/api/goals/${goalId}`, {
        method: "PUT",
        body: JSON.stringify({ name: goal.name, target_amount: goal.target_amount, notes: goal.notes ?? null, status: newStatus, priority: goal.priority, target_date: goal.target_date ?? null }),
      });
      loadData();
    } catch {
      // ignore
    }
  }, [goals, progressMap, loadData]);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if (sortBy === "priority") return a.priority - b.priority;
      // sort by target_date: goals without a date go to the end
      if (!a.target_date && !b.target_date) return 0;
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return a.target_date.localeCompare(b.target_date);
    });
  }, [goals, sortBy]);

  // KPIs
  const totalGoals = goals.length;
  const activeCount = goals.filter((g) => g.status === "active").length;
  const achievedCount = goals.filter((g) => g.status === "achieved").length;
  const pausedCount = goals.filter((g) => g.status === "paused").length;
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalCurrent = goalProgress.reduce((s, p) => s + p.current, 0);
  const totalInvested = analytics.reduce((s, a) => s + a.invested_amount, 0);
  const overallPct = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;
  const onTrackCount = goalProgress.filter((p) => p.pct >= 50).length;
  const totalMonthlyRequired = goals
    .filter((g) => g.status === "active" && g.target_date)
    .reduce((sum, g) => {
      const p = progressMap.get(g.id);
      const req = monthlyRequired(p?.current ?? 0, g.target_amount, g.target_date!);
      return sum + (req ?? 0);
    }, 0);

  const targetDistData = useMemo(
    () => goals.map((g, i) => ({
      name: g.name,
      value: g.target_amount,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    [goals]
  );

  const statusData = useMemo(
    () => [
      { name: "active",   value: activeCount,   fill: "var(--color-chart-2)" },
      { name: "achieved", value: achievedCount, fill: "var(--color-chart-1)" },
      { name: "paused",   value: pausedCount,   fill: "var(--color-chart-4)" },
    ].filter((d) => d.value > 0),
    [activeCount, achievedCount, pausedCount]
  );

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
            Loading goals…
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <FlagIcon className="size-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Financial Goals</h1>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <PlusIcon className="size-4 mr-1.5" />
              Add Goal
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-6 p-6">

          {/* ── KPI Row ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Column 1: KPI cards 2×2 + Overall Progress */}
            <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-1">
                  <CardDescription className="flex items-center gap-1.5">
                    <TargetIcon className="size-3.5" /> Total Goals
                  </CardDescription>
                  <CardTitle className="text-3xl">{totalGoals}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                      {activeCount} active
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-blue-500 inline-block" />
                      {achievedCount} achieved
                    </span>
                    {pausedCount > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="size-2 rounded-full bg-muted-foreground inline-block" />
                        {pausedCount} paused
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {(() => {
                const achievedPct = totalGoals > 0 ? (achievedCount / totalGoals) * 100 : 0;
                const cardClass = achievedPct === 100
                  ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : achievedPct >= 50
                  ? "border-yellow-400/40 bg-yellow-50/50 dark:bg-yellow-950/20"
                  : "";
                const textClass = achievedPct === 100
                  ? "text-emerald-700 dark:text-emerald-400"
                  : achievedPct >= 50
                  ? "text-yellow-700 dark:text-yellow-400"
                  : "text-muted-foreground";
                const titleClass = achievedPct === 100
                  ? "text-3xl text-emerald-600 dark:text-emerald-400"
                  : achievedPct >= 50
                  ? "text-3xl text-yellow-600 dark:text-yellow-400"
                  : "text-3xl";
                return (
                  <Card className={cardClass}>
                    <CardHeader className="pb-1">
                      <CardDescription className={`flex items-center gap-1.5 ${textClass}`}>
                        <CheckCircle2Icon className="size-3.5" /> Achieved
                      </CardDescription>
                      <CardTitle className={titleClass}>
                        {achievedCount}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        {achievedCount} of {totalGoals} goals completed
                      </p>
                    </CardContent>
                  </Card>
                );
              })()}

              <Card>
                <CardHeader className="pb-1">
                  <CardDescription>Total Invested</CardDescription>
                  <CardTitle className="text-xl">{formatCompact(totalInvested)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{formatINR(totalInvested)}</p>
                </CardContent>
              </Card>

              <Card className="border-violet-500/40 bg-violet-50/50 dark:bg-violet-950/20">
                <CardHeader className="pb-1">
                  <CardDescription className="flex items-center gap-1.5 text-violet-700 dark:text-violet-400">
                    <CalendarIcon className="size-3.5" /> Monthly Required
                  </CardDescription>
                  <CardTitle className="text-xl text-violet-700 dark:text-violet-300">
                    {totalMonthlyRequired > 0 ? formatCompact(totalMonthlyRequired) : "—"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {totalMonthlyRequired > 0
                      ? `${formatINR(totalMonthlyRequired)}/mo across active goals`
                      : "Set target dates to calculate"}
                  </p>
                </CardContent>
              </Card>
            </div>

              {/* Overall Progress */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrophyIcon className="size-5 text-amber-500" />
                        Overall Progress
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatINR(totalCurrent)} accumulated · {formatINR(totalTarget - totalCurrent)} remaining
                      </CardDescription>
                    </div>
                    <span className={`text-3xl font-bold ${overallPct >= 75 ? "text-emerald-600 dark:text-emerald-400" : overallPct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}`}>
                      {overallPct.toFixed(1)}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressBarColor(overallPct)}`}
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Target: {formatINR(totalTarget)}</span>
                    <span>{onTrackCount} of {totalGoals} goals ≥ 50%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Column 2: Priority reference */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Goal Priority Guide</CardTitle>
                <CardDescription>Reference for setting goal priorities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(PRIORITY_LEVELS).map(([lvl, meta]) => (
                  <div key={lvl} className={`rounded border px-2.5 py-2 ${meta.color}`}>
                    <p className="text-xs font-semibold">{meta.short}</p>
                    <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{meta.description}</p>
                    <p className="text-[10px] italic opacity-70 mt-0.5">e.g. {meta.examples}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ── Charts Row ── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {targetDistData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Target Distribution</CardTitle>
                  <CardDescription>How your goal targets are split across goals</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={targetDistConfig} className="mx-auto h-56 w-full max-w-xs">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => formatINR(Number(v))}
                            hideLabel
                          />
                        }
                      />
                      <Pie
                        data={targetDistData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={90}
                        strokeWidth={2}
                      >
                        {targetDistData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="mt-3 space-y-1.5">
                    {targetDistData.map((entry, i) => {
                      const share = totalTarget > 0 ? (entry.value / totalTarget) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: entry.fill }} />
                            <span className="truncate max-w-[160px] text-xs">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{formatINR(entry.value)}</span>
                            <span className="w-9 text-right font-medium text-foreground">{share.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Goal Status & Progress</CardTitle>
                <CardDescription>Status distribution and per-goal progress at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {statusData.length > 0 && (
                  <ChartContainer config={statusChartConfig} className="mx-auto h-40 w-full max-w-[220px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={38}
                        outerRadius={60}
                        strokeWidth={2}
                      >
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
                <Separator />
                <div className="flex flex-wrap justify-center gap-5">
                  {goals.map((g) => {
                    const p = progressMap.get(g.id);
                    return (
                      <GoalRadialMini key={g.id} name={g.name} pct={p?.pct ?? 0} status={g.status} />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Individual Goal Cards ── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                All Goals
              </h2>
              <div className="flex items-center rounded-md border bg-muted/40 p-0.5 text-xs">
                <button
                  onClick={() => setSortBy("priority")}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${sortBy === "priority" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Priority
                </button>
                <button
                  onClick={() => setSortBy("target_date")}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${sortBy === "target_date" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Target Date
                </button>
              </div>
            </div>
            <div className="grid gap-4">
              {sortedGoals.map((g) => {
                const meta = statusMeta(g.status);
                const p = progressMap.get(g.id);
                const an = analyticsMap.get(g.id);
                const current = p?.current ?? 0;
                const tr = g.target_date ? timeRemaining(g.target_date) : null;
                const estLabel = an?.est_months_left === 0
                  ? "Achieved"
                  : an?.est_months_left != null
                  ? `~${an.est_months_left}mo`
                  : null;
                const monthly = g.target_date ? monthlyRequired(current, g.target_amount, g.target_date) : null;
                const showTimeBlock = (g.target_date || (an && an.est_months_left != null)) && g.status !== "achieved";

                return (
                  <Card
                    key={g.id}
                    className={g.status === "achieved" ? "border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/20" : ""}
                  >
                    {/* ── Full-width header ── */}
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                          <CardTitle className="flex items-center gap-2 text-base">
                            {g.status === "achieved" && (
                              <CheckCircle2Icon className="size-4 shrink-0 text-blue-500" />
                            )}
                            <span className="truncate">{g.name}</span>
                          </CardTitle>
                          {g.priority > 0 && PRIORITY_LEVELS[g.priority] && (
                            <span
                              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_LEVELS[g.priority].color}`}
                              title={`${PRIORITY_LEVELS[g.priority].label}: ${PRIORITY_LEVELS[g.priority].description}`}
                            >
                              {PRIORITY_LEVELS[g.priority].short}
                            </span>
                          )}
                          {g.target_date && (
                            <span className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              <ClockIcon className="size-2.5" />
                              {g.target_date}
                            </span>
                          )}
                          {g.notes && (
                            <span className="text-xs text-muted-foreground italic">{g.notes}</span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <select
                            className={`rounded border text-xs px-1.5 py-0.5 bg-background cursor-pointer ${meta.badgeClass}`}
                            value={g.status}
                            onChange={(e) => handleStatusChange(g.id, e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="achieved">Achieved</option>
                            <option value="paused">Paused</option>
                          </select>
                          <button
                            onClick={() => setEditingGoal(g)}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Edit goal"
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* ── 3-panel horizontal body ── */}
                    <CardContent>
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                        {/* Column 1: Progress + Analytics */}
                        <div className="space-y-4">
                          <div>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Progress
                            </p>
                            <GoalProgressBar current={current} target={g.target_amount} />
                            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                              <span>
                                Target:{" "}
                                <span className="font-medium text-foreground">{formatINR(g.target_amount)}</span>
                              </span>
                              {!p?.hasAccountData && (
                                <span className="italic text-[10px]">snapshot pending</span>
                              )}
                            </div>
                          </div>

                          {an && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-md border bg-muted/30 px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Unrealized Gain</p>
                                <p className={`text-sm font-semibold ${an.unrealized_gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                  {an.unrealized_gain >= 0 ? "+" : ""}{formatCompact(an.unrealized_gain)}
                                </p>
                              </div>
                              <div className="rounded-md border bg-muted/30 px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Return</p>
                                <p className={`text-sm font-semibold ${an.return_pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                  {an.return_pct >= 0 ? "+" : ""}{an.return_pct.toFixed(1)}%
                                </p>
                              </div>
                              <div className="rounded-md border bg-muted/30 px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Goal Age</p>
                                <p className="text-sm font-semibold flex items-center gap-1">
                                  <ClockIcon className="size-3 text-muted-foreground" />
                                  {an.goal_age_months}mo
                                </p>
                              </div>
                              <div className="rounded-md border bg-muted/30 px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground mb-0.5">Est. Completion</p>
                                <p className="text-sm font-semibold">
                                  {an.est_months_left === 0
                                    ? "Achieved"
                                    : an.est_months_left != null
                                    ? `~${an.est_months_left}mo`
                                    : "—"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Time remaining + Sparkline */}
                        <div className="space-y-4">
                          {showTimeBlock && (
                            <div className={`rounded-md border px-3 py-2 space-y-2 ${tr?.urgent ? "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/30" : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ClockIcon className={`size-4 shrink-0 ${tr?.urgent ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`} />
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time Remaining</p>
                                    {tr && (
                                      <p className={`text-sm font-bold ${tr.urgent ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-300"}`}>
                                        {tr.label}
                                      </p>
                                    )}
                                    {tr && g.target_date && (
                                      <p className="text-[10px] text-muted-foreground">
                                        Target: {format(parseISO(g.target_date), "dd MMM yyyy")}
                                      </p>
                                    )}
                                    {!tr && estLabel && (
                                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{estLabel}</p>
                                    )}
                                  </div>
                                </div>
                                {tr && estLabel && (
                                  <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground">Est. completion</p>
                                    <p className="text-xs font-semibold text-foreground">{estLabel}</p>
                                  </div>
                                )}
                              </div>
                              {monthly != null && (
                                <div className="flex items-center justify-between border-t border-current/10 pt-2">
                                  <div className="flex items-center gap-2">
                                    <CalendarIcon className="size-4 shrink-0 text-violet-500" />
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Monthly Required</p>
                                      <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                                        {monthly === 0 ? "Goal reached" : formatINR(monthly) + "/mo"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right text-[10px] text-muted-foreground">
                                    <p>{formatINR(g.target_amount - current)} remaining</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {an && an.monthly_history.length >= 2 && (
                            <div>
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Growth Trend
                              </p>
                              <GoalSparkline history={an.monthly_history} />
                            </div>
                          )}
                        </div>

                        {/* Column 3: Mapped assets + Asset mix */}
                        <div className="space-y-4">
                          {g.mappings.length > 0 && (
                            <div>
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Mapped Assets
                              </p>
                              <div className="space-y-1.5">
                                {g.mappings.map((m, idx) => {
                                  const acc = m.asset_table === "account" ? accountMap.get(m.asset_id) : null;
                                  const holding = m.asset_table === "holding" ? holdingMap.get(m.asset_id) : null;
                                  const displayName = acc?.name ?? holding?.name ?? `${m.asset_type} #${m.asset_id}`;
                                  const contribution = acc?.current_amount != null
                                    ? acc.current_amount * m.allocation_weight
                                    : null;
                                  return (
                                    <div
                                      key={m.id}
                                      className="flex items-center justify-between rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="size-2 shrink-0 rounded-sm"
                                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                                        />
                                        <span
                                          className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${
                                            m.asset_table === "account"
                                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                                          }`}
                                        >
                                          {m.asset_table === "holding" ? (holding?.instrument_type ?? "holding") : "account"}
                                        </span>
                                        <span className="truncate">{displayName}</span>
                                      </div>
                                      <div className="ml-2 flex shrink-0 items-center gap-2 text-muted-foreground">
                                        {contribution != null && (
                                          <span>{formatINR(contribution)}</span>
                                        )}
                                        <span className="font-semibold text-foreground">
                                          {(m.allocation_weight * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full">
                                {g.mappings.map((m, idx) => (
                                  <div
                                    key={m.id}
                                    style={{
                                      width: `${m.allocation_weight * 100}%`,
                                      backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {an && Object.keys(an.asset_breakdown).length > 0 && (
                            <div>
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Asset Mix
                              </p>
                              <div className="flex h-2 w-full overflow-hidden rounded-full">
                                {Object.entries(an.asset_breakdown).map(([cls, amt]) => {
                                  const share = an.current_amount > 0 ? (amt / an.current_amount) * 100 : 0;
                                  return (
                                    <div
                                      key={cls}
                                      style={{ width: `${share}%`, backgroundColor: ASSET_CLASS_COLORS[cls] ?? "#888" }}
                                    />
                                  );
                                })}
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                                {Object.entries(an.asset_breakdown).map(([cls, amt]) => (
                                  <span key={cls} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <span className="size-2 rounded-sm inline-block" style={{ backgroundColor: ASSET_CLASS_COLORS[cls] ?? "#888" }} />
                                    {cls}: {formatCompact(amt)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <GoalFormDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSaved={loadData}
          accounts={accounts}
          holdings={holdings}
        />

        <GoalFormDialog
          open={!!editingGoal}
          onClose={() => setEditingGoal(null)}
          onSaved={loadData}
          accounts={accounts}
          holdings={holdings}
          editGoal={editingGoal}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
