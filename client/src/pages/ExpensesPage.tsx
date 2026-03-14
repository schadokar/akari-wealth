import { useState, useEffect } from "react";
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  TrendingUpIcon,
  PiggyBankIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  RepeatIcon,
} from "lucide-react";
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
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// --- Types ---

interface Expense {
  id: number;
  month: string;
  category: string;
  expense_type: "fixed" | "variable";
  amount: number;
  description?: string;
  payment_method: "cash" | "credit_card" | "upi" | "debit_card";
  credit_card_account_id?: number;
  is_recurring: boolean;
}

interface Account {
  id: number;
  name: string;
  category: string;
}

interface ExpenseSummary {
  month: string;
  net_take_home: number;
  cash_delta: number;
  new_investments: number;
  emi_paid: number;
  estimated_expenses?: number;
  cc_outstanding: number;
  has_payslip: boolean;
}

interface DashboardData {
  expense_summary?: ExpenseSummary;
}

// --- Constants ---

const CATEGORIES = [
  "rent",
  "grocery",
  "food",
  "fuel",
  "utilities",
  "shopping",
  "medical",
  "entertainment",
  "subscription",
  "travel",
  "misc",
];

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent",
  grocery: "Grocery",
  food: "Food",
  fuel: "Fuel",
  utilities: "Utilities",
  shopping: "Shopping",
  medical: "Medical",
  entertainment: "Entertainment",
  subscription: "Subscription",
  travel: "Travel",
  misc: "Miscellaneous",
};

const CATEGORY_DEFAULT_TYPE: Record<string, "fixed" | "variable"> = {
  rent: "fixed",
  subscription: "fixed",
  utilities: "fixed",
  grocery: "variable",
  food: "variable",
  fuel: "variable",
  shopping: "variable",
  medical: "variable",
  entertainment: "variable",
  travel: "variable",
  misc: "variable",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  upi: "UPI",
  debit_card: "Debit Card",
};

// --- Helpers ---

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  if (!month) return "";
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// --- Expense Form Modal ---

const emptyForm = {
  category: "food",
  expense_type: "variable" as "fixed" | "variable",
  amount: "",
  description: "",
  payment_method: "cash" as Expense["payment_method"],
  credit_card_account_id: "",
  is_recurring: false,
};

function ExpenseModal({
  open,
  onClose,
  onSaved,
  editing,
  month,
  ccAccounts,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Expense | null;
  month: string;
  ccAccounts: Account[];
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              category: editing.category,
              expense_type: editing.expense_type,
              amount: String(editing.amount),
              description: editing.description ?? "",
              payment_method: editing.payment_method,
              credit_card_account_id: editing.credit_card_account_id
                ? String(editing.credit_card_account_id)
                : "",
              is_recurring: editing.is_recurring,
            }
          : emptyForm
      );
    }
  }, [open, editing]);

  function set<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCategoryChange(cat: string) {
    setForm((f) => ({
      ...f,
      category: cat,
      expense_type: CATEGORY_DEFAULT_TYPE[cat] ?? "variable",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    const body: Record<string, unknown> = {
      month,
      category: form.category,
      expense_type: form.expense_type,
      amount: amt,
      description: form.description || null,
      payment_method: form.payment_method,
      credit_card_account_id:
        form.payment_method === "credit_card" && form.credit_card_account_id
          ? Number(form.credit_card_account_id)
          : null,
      is_recurring: form.is_recurring,
    };
    try {
      if (editing) {
        await apiFetch(`/api/expenses/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Expense updated");
      } else {
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Expense added");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <Select value={form.category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Type
              </label>
              <Select
                value={form.expense_type}
                onValueChange={(v) => set("expense_type", v as "fixed" | "variable")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="variable">Variable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Amount (₹)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Input
              placeholder="e.g. Big Basket order"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Payment Method
            </label>
            <Select
              value={form.payment_method}
              onValueChange={(v) => set("payment_method", v as Expense["payment_method"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.payment_method === "credit_card" && ccAccounts.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Credit Card
              </label>
              <Select
                value={form.credit_card_account_id}
                onValueChange={(v) => set("credit_card_account_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  {ccAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={form.is_recurring}
              onChange={(e) => set("is_recurring", e.target.checked)}
            />
            <span className="text-sm">Recurring — auto-copy to next month</span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ccAccounts, setCcAccounts] = useState<Account[]>([]);
  const [exp, setExp] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [prevMonthHasRecurring, setPrevMonthHasRecurring] = useState(false);
  const [carryingForward, setCarryingForward] = useState(false);

  useEffect(() => {
    apiFetch("/api/dashboard")
      .then((r) => r.json())
      .then((data: DashboardData) => setExp(data.expense_summary ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch("/api/accounts?category=credit_card")
      .then((r) => r.json())
      .then((data: Account[]) => setCcAccounts(data ?? []))
      .catch(() => {});
  }, []);

  function loadExpenses() {
    setLoading(true);
    apiFetch(`/api/expenses?month=${month}`)
      .then((r) => r.json())
      .then((data: Expense[]) => {
        setExpenses(data ?? []);
        setLoading(false);
        const prev = addMonths(month, -1);
        return apiFetch(`/api/expenses?month=${prev}`).then((r) => r.json());
      })
      .then((prevData: Expense[]) => {
        setPrevMonthHasRecurring(prevData.some((e) => e.is_recurring));
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function handleCarryForward() {
    setCarryingForward(true);
    try {
      const res = await apiFetch("/api/expenses/carry-forward", {
        method: "POST",
        body: JSON.stringify({ month }),
      });
      const { copied } = await res.json();
      if (copied > 0) {
        toast.success(`Copied ${copied} recurring expense${copied > 1 ? "s" : ""}`);
        loadExpenses();
      } else {
        toast.info("No recurring expenses to copy");
      }
    } catch {
      toast.error("Failed to carry forward");
    } finally {
      setCarryingForward(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      loadExpenses();
    } catch {
      toast.error("Failed to delete");
    }
  }

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const totalManual = expenses.reduce((s, e) => s + e.amount, 0);

  const netTakeHome = exp?.net_take_home ?? 0;
  const estimatedExpenses = exp?.estimated_expenses ?? null;
  const newInvestments = exp?.new_investments ?? 0;
  const remainingCash = exp?.cash_delta ?? null;

  const showCarryBanner =
    !loading && expenses.length === 0 && prevMonthHasRecurring;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Expenses</h1>
        </header>

        <div className="flex-1 space-y-6 p-6">
          {/* ── Snapshot KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>In</CardDescription>
                  <ArrowDownCircleIcon className="size-4 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl text-emerald-600 dark:text-emerald-400">
                  {exp ? formatINR(netTakeHome) : "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Net take-home this month
                </p>
              </CardHeader>
            </Card>

            <Card
              className={
                estimatedExpenses !== null
                  ? "border-red-500/40 bg-red-50/50 dark:bg-red-950/20"
                  : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>Out (estimated)</CardDescription>
                  <ArrowUpCircleIcon
                    className={`size-4 ${estimatedExpenses !== null ? "text-red-500" : "text-muted-foreground"}`}
                  />
                </div>
                <CardTitle
                  className={`text-2xl ${estimatedExpenses !== null ? "text-red-600 dark:text-red-400" : ""}`}
                >
                  {estimatedExpenses !== null ? formatINR(estimatedExpenses) : "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {exp?.has_payslip
                    ? "Take-home − saved − invested"
                    : "Add payslip to calculate"}
                </p>
              </CardHeader>
            </Card>

            <Card className="border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>Invested</CardDescription>
                  <TrendingUpIcon className="size-4 text-blue-500" />
                </div>
                <CardTitle className="text-2xl text-blue-600 dark:text-blue-400">
                  {exp ? formatINR(newInvestments) : "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">New contributions</p>
              </CardHeader>
            </Card>

            <Card
              className={
                remainingCash !== null
                  ? remainingCash >= 0
                    ? "border-violet-500/40 bg-violet-50/50 dark:bg-violet-950/20"
                    : "border-orange-500/40 bg-orange-50/50 dark:bg-orange-950/20"
                  : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription>Remaining Cash</CardDescription>
                  <PiggyBankIcon
                    className={`size-4 ${
                      remainingCash !== null
                        ? remainingCash >= 0
                          ? "text-violet-500"
                          : "text-orange-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <CardTitle
                  className={`text-2xl ${
                    remainingCash !== null
                      ? remainingCash >= 0
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-orange-600 dark:text-orange-400"
                      : ""
                  }`}
                >
                  {remainingCash !== null ? formatINR(remainingCash) : "—"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {remainingCash !== null
                    ? remainingCash >= 0
                      ? "Net cash added"
                      : "Drawn from savings"
                    : "No snapshot data"}
                </p>
              </CardHeader>
            </Card>
          </div>

          {/* ── Month picker + Add button ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth((m) => addMonths(m, -1))}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="min-w-[140px] text-center font-medium text-sm">
                {monthLabel(month)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth((m) => addMonths(m, 1))}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <PlusIcon className="mr-1 size-4" />
              Add Expense
            </Button>
          </div>

          {/* ── Carry-forward banner ── */}
          {showCarryBanner && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              <div className="flex items-center gap-2">
                <InfoIcon className="size-4 shrink-0" />
                <span>
                  Recurring expenses from {monthLabel(addMonths(month, -1))} available.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-400 text-blue-700 dark:border-blue-600 dark:text-blue-300"
                disabled={carryingForward}
                onClick={handleCarryForward}
              >
                <RefreshCwIcon className="mr-1 size-3" />
                {carryingForward ? "Copying…" : "Copy to this month"}
              </Button>
            </div>
          )}

          {/* ── Category summary chips ── */}
          {expenses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, total]) => (
                  <Badge key={cat} variant="secondary" className="gap-1 px-3 py-1 text-sm">
                    {CATEGORY_LABELS[cat] ?? cat}
                    <span className="font-semibold ml-1">{formatINR(total)}</span>
                  </Badge>
                ))}
              <Badge className="gap-1 px-3 py-1 text-sm">
                Total <span className="font-semibold ml-1">{formatINR(totalManual)}</span>
              </Badge>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && expenses.length === 0 && !showCarryBanner && (
            <div className="flex items-start gap-3 rounded-lg border border-muted px-4 py-3 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <span>No expenses recorded for {monthLabel(month)}.</span>
            </div>
          )}

          {/* ── Expense Table ── */}
          {expenses.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10 text-center" />
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => {
                    const ccName = ccAccounts.find(
                      (a) => a.id === e.credit_card_account_id
                    )?.name;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {CATEGORY_LABELS[e.category] ?? e.category}
                            </span>
                            {e.expense_type === "fixed" && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                fixed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {e.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {PAYMENT_LABELS[e.payment_method]}
                            {ccName && (
                              <div className="text-xs text-muted-foreground">{ccName}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatINR(e.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {e.is_recurring && (
                            <RepeatIcon className="inline size-3.5 text-blue-500" title="Recurring" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => {
                                setEditing(e);
                                setShowForm(true);
                              }}
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(e.id)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <ExpenseModal
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={loadExpenses}
          editing={editing}
          month={month}
          ccAccounts={ccAccounts}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
