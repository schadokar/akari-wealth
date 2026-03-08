import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import {
  TrendingUpIcon,
  CreditCardIcon,
  SunriseIcon,
  LayoutDashboardIcon,
  CheckIcon,
} from "lucide-react";

// ── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_TO_ASSET_CLASS: Record<string, string> = {
  bank: "cash",
  brokerage: "asset",
  nps_t1: "asset",
  nps_t2: "asset",
  epf: "asset",
  eps: "asset",
  credit_card: "liability",
  loan: "liability",
  fd: "asset",
  rd: "asset",
  ppf: "asset",
  ssy: "asset",
  cash: "cash",
};

const CATEGORIES = [
  { value: "bank", label: "Bank" },
  { value: "brokerage", label: "Brokerage / Stocks / MF" },
  { value: "epf", label: "EPF" },
  { value: "eps", label: "EPS" },
  { value: "nps_t1", label: "NPS Tier 1" },
  { value: "nps_t2", label: "NPS Tier 2" },
  { value: "ppf", label: "PPF" },
  { value: "ssy", label: "Sukanya Samriddhi (SSY)" },
  { value: "fd", label: "Fixed Deposit (FD)" },
  { value: "rd", label: "Recurring Deposit (RD)" },
  { value: "loan", label: "Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
];

const GOAL_OPTIONS = [
  { value: "wealth_building", label: "Wealth Building", icon: TrendingUpIcon, desc: "Grow investments & net worth" },
  { value: "debt_payoff", label: "Debt Payoff", icon: CreditCardIcon, desc: "Clear loans & credit cards" },
  { value: "retirement", label: "Retirement", icon: SunriseIcon, desc: "Build long-term corpus" },
  { value: "general_tracking", label: "General Tracking", icon: LayoutDashboardIcon, desc: "Track everything in one place" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "bank", label: "Bank", category: "bank" },
  { value: "stocks_mf", label: "Stocks / MF", category: "brokerage" },
  { value: "epf_nps", label: "EPF / NPS", category: "epf" },
  { value: "loans", label: "Loans", category: "loan" },
  { value: "fd_rd", label: "FD / RD", category: "fd" },
  { value: "ppf_ssy", label: "PPF / SSY", category: "ppf" },
  { value: "insurance", label: "Insurance", category: null },
];

function deriveDefaultCategory(types: string[]): string {
  const map: Record<string, string> = {
    bank: "bank",
    stocks_mf: "brokerage",
    epf_nps: "epf",
    loans: "loan",
    fd_rd: "fd",
    ppf_ssy: "ppf",
  };
  for (const t of ["bank", "stocks_mf", "epf_nps", "loans", "fd_rd", "ppf_ssy"]) {
    if (types.includes(t)) return map[t];
  }
  return "bank";
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

// ── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Profile" },
    { n: 2 as const, label: "Account" },
    { n: 3 as const, label: "Goal" },
  ];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                current === s.n
                  ? "border-primary bg-primary text-primary-foreground"
                  : current > s.n
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-muted text-muted-foreground"
              }`}
            >
              {current > s.n ? <CheckIcon className="h-4 w-4" /> : s.n}
            </div>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-4 h-0.5 w-10 transition-colors ${
                current > s.n ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Profile ──────────────────────────────────────────────────────────

function Step1({
  selectedGoals,
  toggleGoal,
  selectedAccountTypes,
  toggleAccountType,
  onContinue,
}: {
  selectedGoals: string[];
  toggleGoal: (v: string) => void;
  selectedAccountTypes: string[];
  toggleAccountType: (v: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tell us about yourself</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This helps us personalise your experience. Nothing is sent to any server.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">What are your primary financial goals?</p>
        <div className="grid grid-cols-2 gap-3">
          {GOAL_OPTIONS.map(({ value, label, icon: Icon, desc }) => {
            const active = selectedGoals.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleGoal(value)}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/40"
                }`}
              >
                <Icon className={`mb-1 h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Which account types do you have?</p>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_TYPE_OPTIONS.map(({ value, label }) => {
            const active = selectedAccountTypes.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleAccountType(value)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted text-muted-foreground hover:border-muted-foreground/60"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Button className="w-full" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}

// ── Step 2: Add First Account ─────────────────────────────────────────────────

function Step2({
  accountName,
  setAccountName,
  accountCategory,
  setAccountCategory,
  accountCurrentValue,
  setAccountCurrentValue,
  error,
  loading,
  onSubmit,
  onSkip,
}: {
  accountName: string;
  setAccountName: (v: string) => void;
  accountCategory: string;
  setAccountCategory: (v: string) => void;
  accountCurrentValue: string;
  setAccountCurrentValue: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Add your first account</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Start with one — you can add more on the Accounts page later.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Account Name</label>
        <Input
          placeholder="e.g. HDFC Savings, SBI EPF"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Account Type</label>
        <Select value={accountCategory} onValueChange={setAccountCategory}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Current Value (₹){" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          type="number"
          placeholder="e.g. 150000"
          value={accountCurrentValue}
          onChange={(e) => setAccountCurrentValue(e.target.value)}
          min={0}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1" onClick={onSkip} type="button">
          Skip for now
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={loading} type="button">
          {loading ? "Adding..." : "Add Account"}
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Set a Goal ───────────────────────────────────────────────────────

function Step3({
  goalName,
  setGoalName,
  goalTargetAmount,
  setGoalTargetAmount,
  goalTargetDate,
  setGoalTargetDate,
  error,
  loading,
  onSubmit,
  onSkip,
}: {
  goalName: string;
  setGoalName: (v: string) => void;
  goalTargetAmount: string;
  setGoalTargetAmount: (v: string) => void;
  goalTargetDate: string;
  setGoalTargetDate: (v: string) => void;
  error: string;
  loading: boolean;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Set your first goal</h2>
        <p className="text-sm text-muted-foreground mt-1">
          What are you saving or investing towards? Completely optional.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Goal Name</label>
        <Input
          placeholder="e.g. Emergency Fund, Home Down Payment"
          value={goalName}
          onChange={(e) => setGoalName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Target Amount (₹)</label>
        <Input
          type="number"
          placeholder="e.g. 500000"
          value={goalTargetAmount}
          onChange={(e) => setGoalTargetAmount(e.target.value)}
          min={1}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Target Date{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          type="date"
          value={goalTargetDate}
          onChange={(e) => setGoalTargetDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1" onClick={onSkip} type="button">
          Skip for now
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={loading} type="button">
          {loading ? "Saving..." : "All Done!"}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>([]);

  // Step 2
  const [accountName, setAccountName] = useState("");
  const [accountCategory, setAccountCategory] = useState("bank");
  const [accountCurrentValue, setAccountCurrentValue] = useState("");
  const [step2Error, setStep2Error] = useState("");
  const [step2Loading, setStep2Loading] = useState(false);

  // Step 3
  const [goalName, setGoalName] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [step3Error, setStep3Error] = useState("");
  const [step3Loading, setStep3Loading] = useState(false);

  function handleStep1Continue() {
    const defaultCat = deriveDefaultCategory(selectedAccountTypes);
    setAccountCategory(defaultCat);
    setStep(2);
  }

  async function handleAddAccount() {
    if (!accountName.trim()) {
      setStep2Error("Account name is required.");
      return;
    }
    setStep2Error("");
    setStep2Loading(true);
    try {
      const res = await apiFetch("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: accountName.trim(),
          category: accountCategory,
          asset_class: CATEGORY_TO_ASSET_CLASS[accountCategory] ?? "asset",
        }),
      });
      if (!res.ok) {
        setStep2Error("Failed to create account. Please try again.");
        return;
      }
      if (accountCurrentValue) {
        const created = await res.json();
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        await apiFetch("/api/snapshots/accounts", {
          method: "POST",
          body: JSON.stringify([
            {
              account_id: created.id,
              month,
              current_amount: parseFloat(accountCurrentValue),
            },
          ]),
        });
      }
      setStep(3);
    } catch {
      setStep2Error("Failed to connect to server.");
    } finally {
      setStep2Loading(false);
    }
  }

  async function handleAddGoal() {
    const targetNum = parseFloat(goalTargetAmount);
    if (!goalName.trim() || isNaN(targetNum) || targetNum <= 0) {
      setStep3Error("Goal name and a positive target amount are required.");
      return;
    }
    setStep3Error("");
    setStep3Loading(true);
    try {
      const res = await apiFetch("/api/goals", {
        method: "POST",
        body: JSON.stringify({
          name: goalName.trim(),
          target_amount: targetNum,
          priority: 3,
          target_date: goalTargetDate || null,
        }),
      });
      if (!res.ok) {
        setStep3Error("Failed to create goal. Please try again.");
        return;
      }
      navigate("/dashboard");
    } catch {
      setStep3Error("Failed to connect to server.");
    } finally {
      setStep3Loading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Akari <span className="text-muted-foreground font-normal">明かり</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let's set up your financial profile
        </p>
      </div>

      <StepIndicator current={step} />

      <Card className="mt-6 w-full max-w-lg">
        <CardContent className="pt-6">
          {step === 1 && (
            <Step1
              selectedGoals={selectedGoals}
              toggleGoal={(v) => setSelectedGoals(toggle(selectedGoals, v))}
              selectedAccountTypes={selectedAccountTypes}
              toggleAccountType={(v) => setSelectedAccountTypes(toggle(selectedAccountTypes, v))}
              onContinue={handleStep1Continue}
            />
          )}
          {step === 2 && (
            <Step2
              accountName={accountName}
              setAccountName={setAccountName}
              accountCategory={accountCategory}
              setAccountCategory={setAccountCategory}
              accountCurrentValue={accountCurrentValue}
              setAccountCurrentValue={setAccountCurrentValue}
              error={step2Error}
              loading={step2Loading}
              onSubmit={handleAddAccount}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3
              goalName={goalName}
              setGoalName={setGoalName}
              goalTargetAmount={goalTargetAmount}
              setGoalTargetAmount={setGoalTargetAmount}
              goalTargetDate={goalTargetDate}
              setGoalTargetDate={setGoalTargetDate}
              error={step3Error}
              loading={step3Loading}
              onSubmit={handleAddGoal}
              onSkip={() => navigate("/dashboard")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
