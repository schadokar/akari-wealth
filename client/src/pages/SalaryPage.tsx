import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppSidebar } from "@/components/AppSidebar";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/formatINR";
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";

// --- Types ---

interface Employment {
  id: number;
  employee_name: string;
  uan?: string;
  employer_name: string;
  employer_location?: string;
  pf_account?: string;
  start_date: string;
  end_date?: string;
  employment_type: string;
}

interface Payslip {
  id: number;
  employment_id: number;
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
  epf: number;
  vpf?: number;
  nps?: number;
  professional_tax: number;
  tds: number;
  lwf?: number;
  esi_employee?: number;
  meal_coupon_deduction?: number;
  loan_recovery?: number;
  other_deduction?: number;
  notes?: string;
}

// --- Helpers ---

const EMPLOYMENT_TYPES = ["FTE", "contractor", "consultant", "intern"];

function grossEarnings(p: Payslip): number {
  return (
    p.basic_salary +
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

function totalDeductions(p: Payslip): number {
  return (
    p.epf +
    (p.vpf ?? 0) +
    (p.nps ?? 0) +
    p.professional_tax +
    p.tds +
    (p.lwf ?? 0) +
    (p.esi_employee ?? 0) +
    (p.meal_coupon_deduction ?? 0) +
    (p.loan_recovery ?? 0) +
    (p.other_deduction ?? 0)
  );
}

function fmt(v: number | undefined) {
  return v != null ? formatINR(v) : "—";
}

function periodLabel(emp: Employment) {
  const start = emp.start_date.substring(0, 7).replace("-", "/");
  const end = emp.end_date
    ? emp.end_date.substring(0, 7).replace("-", "/")
    : "Present";
  return `${start} – ${end}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPayMonth(ym: string) {
  const [year, month] = ym.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

function numberToWords(n: number): string {
  if (n === 0) return "Zero Only";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tensArr = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function twoDigit(x: number): string {
    if (x < 20) return ones[x];
    return tensArr[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
  }
  function threeDigit(x: number): string {
    if (x < 100) return twoDigit(x);
    return ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + twoDigit(x % 100) : "");
  }
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;
  if (crore) parts.push(threeDigit(crore) + " Crore");
  if (lakh) parts.push(twoDigit(lakh) + " Lakh");
  if (thousand) parts.push(twoDigit(thousand) + " Thousand");
  if (rest) parts.push(threeDigit(rest));
  return parts.join(" ") + " Only";
}

// --- Employment Modal ---

const emptyEmpForm = {
  employee_name: "",
  uan: "",
  employer_name: "",
  employer_location: "",
  pf_account: "",
  start_date: "",
  end_date: "",
  employment_type: "FTE",
};

function EmploymentModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Employment | null;
}) {
  const [form, setForm] = useState(emptyEmpForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              employee_name: editing.employee_name,
              uan: editing.uan ?? "",
              employer_name: editing.employer_name,
              employer_location: editing.employer_location ?? "",
              pf_account: editing.pf_account ?? "",
              start_date: editing.start_date,
              end_date: editing.end_date ?? "",
              employment_type: editing.employment_type,
            }
          : emptyEmpForm
      );
      setError("");
    }
  }, [open, editing]);

  const set = (f: keyof typeof emptyEmpForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const body = {
        employee_name: form.employee_name.trim(),
        uan: form.uan.trim() || undefined,
        employer_name: form.employer_name.trim(),
        employer_location: form.employer_location.trim() || undefined,
        pf_account: form.pf_account.trim() || undefined,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
        employment_type: form.employment_type,
      };
      const res = editing
        ? await apiFetch(`/api/employments/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          })
        : await apiFetch("/api/employments", {
            method: "POST",
            body: JSON.stringify(body),
          });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save employment.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Employment" : "Add Employment"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update the employment record." : "Add a new employment record."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employee Name *</label>
              <Input value={form.employee_name} onChange={set("employee_name")} placeholder="Full name" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employer Name *</label>
              <Input value={form.employer_name} onChange={set("employer_name")} placeholder="Company name" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date *</label>
              <Input type="date" value={form.start_date} onChange={set("start_date")} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                End Date{" "}
                <span className="text-xs text-muted-foreground">(blank = current)</span>
              </label>
              <Input type="date" value={form.end_date} onChange={set("end_date")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employment Type</label>
              <select
                value={form.employment_type}
                onChange={set("employment_type")}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">UAN</label>
              <Input value={form.uan} onChange={set("uan")} placeholder="Universal Account Number" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employer Location</label>
              <Input value={form.employer_location} onChange={set("employer_location")} placeholder="City / State" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">PF Account</label>
              <Input value={form.pf_account} onChange={set("pf_account")} placeholder="PF account number" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update" : "Add Employment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Month Picker ---

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 10 + i);

  const yr = value.slice(0, 4);
  const mo = value.slice(5, 7);

  const handleChange = (field: "year" | "month", val: string) => {
    const year = field === "year" ? val : (yr || String(currentYear));
    const month = field === "month" ? val : (mo || "01");
    if (year && month) onChange(`${year}-${month}`);
  };

  return (
    <div className="flex gap-2">
      <select
        value={mo}
        onChange={(e) => handleChange("month", e.target.value)}
        className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
        required
      >
        <option value="">Select month</option>
        {MONTH_NAMES.map((name, i) => (
          <option key={i} value={String(i + 1).padStart(2, "0")}>{name}</option>
        ))}
      </select>
      <select
        value={yr}
        onChange={(e) => handleChange("year", e.target.value)}
        className="h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
        required
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>
    </div>
  );
}

// --- Payslip Modal ---

type PayslipFormKey = keyof typeof emptyPayslipForm;

const emptyPayslipForm = {
  pay_month: "",
  basic_salary: "",
  hra: "",
  conveyance_allowance: "",
  medical_allowance: "",
  lta: "",
  special_allowance: "",
  flexible_pay: "",
  meal_allowance: "",
  mobile_allowance: "",
  internet_allowance: "",
  differential_allowance: "",
  statutory_bonus: "",
  performance_pay: "",
  advance_bonus: "",
  other_allowance: "",
  epf: "",
  vpf: "",
  nps: "",
  professional_tax: "",
  tds: "",
  lwf: "",
  esi_employee: "",
  meal_coupon_deduction: "",
  loan_recovery: "",
  other_deduction: "",
  notes: "",
};

function payslipToForm(p: Payslip): typeof emptyPayslipForm {
  const n = (v: number | undefined) => (v != null ? String(v) : "");
  return {
    pay_month: p.pay_month,
    basic_salary: String(p.basic_salary),
    hra: n(p.hra),
    conveyance_allowance: n(p.conveyance_allowance),
    medical_allowance: n(p.medical_allowance),
    lta: n(p.lta),
    special_allowance: n(p.special_allowance),
    flexible_pay: n(p.flexible_pay),
    meal_allowance: n(p.meal_allowance),
    mobile_allowance: n(p.mobile_allowance),
    internet_allowance: n(p.internet_allowance),
    differential_allowance: n(p.differential_allowance),
    statutory_bonus: n(p.statutory_bonus),
    performance_pay: n(p.performance_pay),
    advance_bonus: n(p.advance_bonus),
    other_allowance: n(p.other_allowance),
    epf: String(p.epf),
    vpf: n(p.vpf),
    nps: n(p.nps),
    professional_tax: String(p.professional_tax),
    tds: String(p.tds),
    lwf: n(p.lwf),
    esi_employee: n(p.esi_employee),
    meal_coupon_deduction: n(p.meal_coupon_deduction),
    loan_recovery: n(p.loan_recovery),
    other_deduction: n(p.other_deduction),
    notes: p.notes ?? "",
  };
}

function buildPayslipBody(form: typeof emptyPayslipForm) {
  const num = (v: string) => (v.trim() !== "" ? parseFloat(v) : undefined);
  return {
    pay_month: form.pay_month,
    basic_salary: parseFloat(form.basic_salary) || 0,
    hra: num(form.hra),
    conveyance_allowance: num(form.conveyance_allowance),
    medical_allowance: num(form.medical_allowance),
    lta: num(form.lta),
    special_allowance: num(form.special_allowance),
    flexible_pay: num(form.flexible_pay),
    meal_allowance: num(form.meal_allowance),
    mobile_allowance: num(form.mobile_allowance),
    internet_allowance: num(form.internet_allowance),
    differential_allowance: num(form.differential_allowance),
    statutory_bonus: num(form.statutory_bonus),
    performance_pay: num(form.performance_pay),
    advance_bonus: num(form.advance_bonus),
    other_allowance: num(form.other_allowance),
    epf: parseFloat(form.epf) || 0,
    vpf: num(form.vpf),
    nps: num(form.nps),
    professional_tax: parseFloat(form.professional_tax) || 0,
    tds: parseFloat(form.tds) || 0,
    lwf: num(form.lwf),
    esi_employee: num(form.esi_employee),
    meal_coupon_deduction: num(form.meal_coupon_deduction),
    loan_recovery: num(form.loan_recovery),
    other_deduction: num(form.other_deduction),
    notes: form.notes.trim() || undefined,
  };
}

function PayslipModal({
  open,
  onClose,
  onSaved,
  employmentId,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employmentId: number;
  editing: Payslip | null;
}) {
  const [form, setForm] = useState(emptyPayslipForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing ? payslipToForm(editing) : emptyPayslipForm);
      setError("");
    }
  }, [open, editing]);

  const set = (f: PayslipFormKey) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const body = buildPayslipBody(form);
      const res = editing
        ? await apiFetch(`/api/payslips/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(body),
          })
        : await apiFetch(`/api/employments/${employmentId}/payslips`, {
            method: "POST",
            body: JSON.stringify(body),
          });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save payslip.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  function NumField({
    label,
    field,
    required,
  }: {
    label: string;
    field: PayslipFormKey;
    required?: boolean;
  }) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          {label}
          {required && " *"}
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0"
          value={form[field]}
          onChange={set(field)}
          required={required}
        />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Payslip" : "Add Payslip"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update payslip details." : "Enter payslip details for the selected month."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {error && (
            <p className="rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Basic */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Pay Month *</label>
              <MonthPicker
                value={form.pay_month}
                onChange={(v) => setForm((prev) => ({ ...prev, pay_month: v }))}
              />
            </div>
            <NumField label="Basic Salary" field="basic_salary" required />
          </div>

          {/* Earnings */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Earnings
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumField label="HRA" field="hra" />
              <NumField label="Conveyance Allowance" field="conveyance_allowance" />
              <NumField label="Medical Allowance" field="medical_allowance" />
              <NumField label="LTA" field="lta" />
              <NumField label="Special Allowance" field="special_allowance" />
              <NumField label="Flexible Pay" field="flexible_pay" />
              <NumField label="Meal Allowance" field="meal_allowance" />
              <NumField label="Mobile Allowance" field="mobile_allowance" />
              <NumField label="Internet Allowance" field="internet_allowance" />
              <NumField label="Differential Allowance" field="differential_allowance" />
              <NumField label="Statutory Bonus" field="statutory_bonus" />
              <NumField label="Performance Pay" field="performance_pay" />
              <NumField label="Advance Bonus" field="advance_bonus" />
              <NumField label="Other Allowance" field="other_allowance" />
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Deductions
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumField label="EPF" field="epf" required />
              <NumField label="Professional Tax" field="professional_tax" required />
              <NumField label="TDS" field="tds" required />
              <NumField label="VPF" field="vpf" />
              <NumField label="NPS" field="nps" />
              <NumField label="LWF" field="lwf" />
              <NumField label="ESI (Employee)" field="esi_employee" />
              <NumField label="Meal Coupon Deduction" field="meal_coupon_deduction" />
              <NumField label="Loan Recovery" field="loan_recovery" />
              <NumField label="Other Deduction" field="other_deduction" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Input
              value={form.notes}
              onChange={set("notes")}
              placeholder="e.g. LOP 2 days, arrear from Oct"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update" : "Add Payslip"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Payslip View ---

function PayslipView({ payslip: p, employment: emp }: { payslip: Payslip; employment: Employment }) {
  const gross = grossEarnings(p);
  const deductions = totalDeductions(p);
  const net = gross - deductions;

  const earningRows = [
    { label: "Basic Salary", value: p.basic_salary },
    { label: "HRA", value: p.hra },
    { label: "Conveyance Allowance", value: p.conveyance_allowance },
    { label: "Medical Allowance", value: p.medical_allowance },
    { label: "LTA", value: p.lta },
    { label: "Special Allowance", value: p.special_allowance },
    { label: "Flexible Pay", value: p.flexible_pay },
    { label: "Meal Allowance", value: p.meal_allowance },
    { label: "Mobile Allowance", value: p.mobile_allowance },
    { label: "Internet Allowance", value: p.internet_allowance },
    { label: "Differential Allowance", value: p.differential_allowance },
    { label: "Statutory Bonus", value: p.statutory_bonus },
    { label: "Performance Pay", value: p.performance_pay },
    { label: "Advance Bonus", value: p.advance_bonus },
    { label: "Other Allowance", value: p.other_allowance },
  ].filter((r) => (r.value ?? 0) > 0);

  const deductionRows = [
    { label: "EPF", value: p.epf },
    { label: "Professional Tax", value: p.professional_tax },
    { label: "TDS", value: p.tds },
    { label: "VPF", value: p.vpf },
    { label: "NPS", value: p.nps },
    { label: "LWF", value: p.lwf },
    { label: "ESI (Employee)", value: p.esi_employee },
    { label: "Meal Coupon Deduction", value: p.meal_coupon_deduction },
    { label: "Loan Recovery", value: p.loan_recovery },
    { label: "Other Deduction", value: p.other_deduction },
  ].filter((r) => (r.value ?? 0) > 0);

  return (
    <div className="rounded-lg border text-sm overflow-hidden">
      {/* Employment Details */}
      <div className="bg-muted/40 px-4 py-3">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Employment Details
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Employee</span>
            <span className="font-medium text-right">{emp.employee_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Pay Month</span>
            <span className="font-medium text-right">{formatPayMonth(p.pay_month)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Employer</span>
            <span className="font-medium text-right">{emp.employer_name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Type</span>
            <span className="font-medium text-right">{emp.employment_type}</span>
          </div>
          {emp.uan && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">UAN</span>
              <span className="font-medium text-right">{emp.uan}</span>
            </div>
          )}
          {emp.pf_account && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">PF Account</span>
              <span className="font-medium text-right">{emp.pf_account}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Earnings | Deductions */}
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Earnings
          </p>
          <div className="space-y-2">
            {earningRows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="tabular-nums font-medium">{fmt(r.value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Deductions
          </p>
          <div className="space-y-2">
            {deductionRows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="tabular-nums text-destructive">{fmt(r.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 divide-x divide-border border-t bg-muted/20">
        <div className="flex justify-between gap-4 px-4 py-3 font-semibold">
          <span>Total Earnings</span>
          <span className="tabular-nums">{fmt(gross)}</span>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3 font-semibold">
          <span>Total Deductions</span>
          <span className="tabular-nums text-destructive">{fmt(deductions)}</span>
        </div>
      </div>

      <Separator />

      {/* Net Pay */}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <span className="text-sm font-semibold text-muted-foreground pt-1.5">Net Pay</span>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{fmt(net)}</div>
            <p className="mt-0.5 text-xs text-muted-foreground italic">
              {numberToWords(Math.max(0, Math.round(net)))}
            </p>
          </div>
        </div>
        {p.notes && (
          <p className="mt-3 border-t pt-2.5 text-xs text-muted-foreground">
            Note: {p.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---

type Toast = { type: "success" | "error"; text: string };

export default function SalaryPage() {
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employment | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employment | null>(null);

  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: Toast["type"], text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPayslips = async (empId: number, selectMonth?: string) => {
    const res = await apiFetch(`/api/employments/${empId}/payslips`);
    if (res.ok) {
      const data: Payslip[] = await res.json();
      const list = data ?? [];
      setPayslips(list);
      if (selectMonth) {
        setSelectedPayslip(list.find((p) => p.pay_month === selectMonth) ?? list[0] ?? null);
      } else {
        setSelectedPayslip(list[0] ?? null);
      }
    }
  };

  const fetchEmployments = async () => {
    const res = await apiFetch("/api/employments");
    if (res.ok) {
      const data: Employment[] = await res.json();
      const list = data ?? [];
      setEmployments(list);
      if (list.length > 0 && !selectedEmp) {
        setSelectedEmp(list[0]);
        fetchPayslips(list[0].id);
      }
    }
  };

  useEffect(() => {
    fetchEmployments();
  }, []);

  const selectEmployment = (emp: Employment) => {
    if (selectedEmp?.id === emp.id) {
      setSelectedEmp(null);
      setPayslips([]);
    } else {
      setSelectedEmp(emp);
      fetchPayslips(emp.id);
    }
  };

  const handleDeleteEmp = async (emp: Employment) => {
    const res = await apiFetch(`/api/employments/${emp.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("success", `Employment at "${emp.employer_name}" deleted.`);
      if (selectedEmp?.id === emp.id) {
        setSelectedEmp(null);
        setPayslips([]);
      }
      fetchEmployments();
    } else {
      const data = await res.json().catch(() => null);
      showToast("error", data?.error ?? "Failed to delete employment.");
    }
  };

  const handleDeletePayslip = async (p: Payslip) => {
    const res = await apiFetch(`/api/payslips/${p.id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("success", `Payslip for ${formatPayMonth(p.pay_month)} deleted.`);
      if (selectedEmp) fetchPayslips(selectedEmp.id);
    } else {
      const data = await res.json().catch(() => null);
      showToast("error", data?.error ?? "Failed to delete payslip.");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Salary</h1>
        </header>

        <div className="flex-1 space-y-6 p-6">
          {toast && (
            <div
              className={`rounded-md px-4 py-3 text-sm font-medium ${
                toast.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {toast.text}
            </div>
          )}

          {/* Employments */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Employments</CardTitle>
                <CardDescription>
                  {employments.length === 0
                    ? "No employment records yet."
                    : `${employments.length} record${employments.length !== 1 ? "s" : ""}${selectedEmp ? ` · click a row to view payslips` : " · click a row to view payslips"}`}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingEmp(null);
                  setEmpModalOpen(true);
                }}
              >
                <PlusIcon className="mr-1.5 size-4" />
                Add Employment
              </Button>
            </CardHeader>
            <CardContent>
              {employments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No employment records. Add one to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employments.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className={`cursor-pointer transition-colors ${
                          selectedEmp?.id === emp.id ? "bg-muted/60" : "hover:bg-muted/30"
                        }`}
                        onClick={() => selectEmployment(emp)}
                      >
                        <TableCell className="font-medium">{emp.employee_name}</TableCell>
                        <TableCell>
                          <span>{emp.employer_name}</span>
                          {emp.employer_location && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {emp.employer_location}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {periodLabel(emp)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={emp.end_date ? "secondary" : "default"}>
                            {emp.employment_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="inline-flex gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => {
                                setEditingEmp(emp);
                                setEmpModalOpen(true);
                              }}
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteEmp(emp)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Payslips */}
          {selectedEmp && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Payslip</CardTitle>
                  <CardDescription>
                    {selectedEmp.employer_name} · {periodLabel(selectedEmp)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {payslips.length > 0 && (
                    <>
                      <select
                        value={selectedPayslip?.pay_month ?? ""}
                        onChange={(e) =>
                          setSelectedPayslip(
                            payslips.find((p) => p.pay_month === e.target.value) ?? null
                          )
                        }
                        className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                      >
                        {payslips.map((p) => (
                          <option key={p.id} value={p.pay_month}>
                            {formatPayMonth(p.pay_month)}
                          </option>
                        ))}
                      </select>
                      {selectedPayslip && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setEditingPayslip(selectedPayslip);
                              setPayslipModalOpen(true);
                            }}
                          >
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePayslip(selectedPayslip)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingPayslip(null);
                      setPayslipModalOpen(true);
                    }}
                  >
                    <PlusIcon className="mr-1.5 size-4" />
                    Add Payslip
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {payslips.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No payslips yet. Add one to start tracking earnings.
                  </p>
                ) : selectedPayslip ? (
                  <PayslipView payslip={selectedPayslip} employment={selectedEmp} />
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modals */}
        <EmploymentModal
          open={empModalOpen}
          onClose={() => setEmpModalOpen(false)}
          onSaved={() => {
            fetchEmployments();
            showToast("success", editingEmp ? "Employment updated." : "Employment added.");
          }}
          editing={editingEmp}
        />

        <PayslipModal
          open={payslipModalOpen}
          onClose={() => setPayslipModalOpen(false)}
          onSaved={() => {
            if (selectedEmp) fetchPayslips(selectedEmp.id, editingPayslip?.pay_month);
            showToast("success", editingPayslip ? "Payslip updated." : "Payslip added.");
          }}
          employmentId={selectedEmp?.id ?? 0}
          editing={editingPayslip}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
