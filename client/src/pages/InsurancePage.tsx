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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSidebar } from "@/components/AppSidebar";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/formatINR";
import { PlusIcon, PencilIcon, Trash2Icon, ShieldIcon } from "lucide-react";
import { toast } from "sonner";

// --- Types ---

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
  maturity_date?: string;
  nominees?: string;
  is_employer_provided: boolean;
  is_active: boolean;
  notes?: string;
}

// --- Constants ---

const POLICY_TYPES = [
  "health",
  "term_life",
  "critical_illness",
  "disability",
  "vehicle",
  "home",
  "other",
];

const PREMIUM_FREQUENCIES = ["monthly", "quarterly", "annual"];

const POLICY_TYPE_LABELS: Record<string, string> = {
  health: "Health",
  term_life: "Term Life",
  critical_illness: "Critical Illness",
  disability: "Disability",
  vehicle: "Vehicle",
  home: "Home",
  other: "Other",
};

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

// --- Helpers ---

function annualPremium(ins: Insurance): number {
  if (ins.premium_frequency === "monthly") return ins.premium_amount * 12;
  if (ins.premium_frequency === "quarterly") return ins.premium_amount * 4;
  return ins.premium_amount;
}

// --- Modal ---

const emptyForm = {
  policy_type: "health",
  insurer: "",
  policy_number: "",
  sum_assured: "",
  premium_amount: "",
  premium_frequency: "annual",
  start_date: "",
  end_date: "",
  maturity_date: "",
  nominees: "",
  is_employer_provided: false,
  is_active: true,
  notes: "",
};

function InsuranceModal({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: Insurance | null;
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              policy_type: editing.policy_type,
              insurer: editing.insurer,
              policy_number: editing.policy_number ?? "",
              sum_assured: String(editing.sum_assured),
              premium_amount: String(editing.premium_amount),
              premium_frequency: editing.premium_frequency,
              start_date: editing.start_date,
              end_date: editing.end_date ?? "",
              maturity_date: editing.maturity_date ?? "",
              nominees: editing.nominees ?? "",
              is_employer_provided: editing.is_employer_provided,
              is_active: editing.is_active,
              notes: editing.notes ?? "",
            }
          : emptyForm
      );
    }
  }, [open, editing]);

  function set(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      policy_type: form.policy_type,
      insurer: form.insurer,
      policy_number: form.policy_number || null,
      sum_assured: parseFloat(form.sum_assured),
      premium_amount: parseFloat(form.premium_amount),
      premium_frequency: form.premium_frequency,
      start_date: form.start_date,
      end_date: form.end_date || null,
      maturity_date: form.maturity_date || null,
      nominees: form.nominees || null,
      is_employer_provided: form.is_employer_provided,
      is_active: form.is_active,
      notes: form.notes || null,
    };
    try {
      if (editing) {
        await apiFetch(`/api/insurances/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.success("Insurance updated");
      } else {
        await apiFetch("/api/insurances", { method: "POST", body: JSON.stringify(body) });
        toast.success("Insurance added");
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Insurance" : "Add Insurance"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Policy Type</label>
              <Select value={form.policy_type} onValueChange={(v) => set("policy_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{POLICY_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Insurer *</label>
              <Input value={form.insurer} onChange={(e) => set("insurer", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Policy Number</label>
              <Input value={form.policy_number} onChange={(e) => set("policy_number", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Sum Assured (₹) *</label>
              <Input type="number" min="0" value={form.sum_assured} onChange={(e) => set("sum_assured", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Premium Amount (₹) *</label>
              <Input type="number" min="0" value={form.premium_amount} onChange={(e) => set("premium_amount", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Frequency</label>
              <Select value={form.premium_frequency} onValueChange={(v) => set("premium_frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PREMIUM_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>{FREQ_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Date *</label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Maturity Date</label>
              <Input type="date" value={form.maturity_date} onChange={(e) => set("maturity_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nominees</label>
              <Input value={form.nominees} onChange={(e) => set("nominees", e.target.value)} placeholder="e.g. Spouse, Child" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_employer_provided}
                onChange={(e) => set("is_employer_provided", e.target.checked)}
                className="h-4 w-4"
              />
              Employer Provided
            </label>
            {editing && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="h-4 w-4"
                />
                Active
              </label>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Page ---

export default function InsurancePage() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Insurance | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/insurances");
      setInsurances(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load insurances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this insurance policy?")) return;
    try {
      await apiFetch(`/api/insurances/${id}`, { method: "DELETE" });
      toast.success("Insurance deleted");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const active = insurances.filter((i) => i.is_active);
  const inactive = insurances.filter((i) => !i.is_active);
  const totalAnnualPremium = active.reduce((s, i) => s + annualPremium(i), 0);
  const totalCoverage = active.reduce((s, i) => s + i.sum_assured, 0);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="font-semibold">Insurance</span>
        </header>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Policies</CardDescription>
                <CardTitle className="text-2xl">{active.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Coverage</CardDescription>
                <CardTitle className="text-2xl">{formatINR(totalCoverage)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Annual Premium</CardDescription>
                <CardTitle className="text-2xl">{formatINR(totalAnnualPremium)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Policies</CardTitle>
                <CardDescription>Manage your insurance policies</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
                <PlusIcon className="mr-1 size-4" />
                Add Policy
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
              ) : insurances.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <ShieldIcon className="size-10 opacity-30" />
                  <p className="text-sm">No insurance policies yet.</p>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
                    Add your first policy
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Insurer</TableHead>
                      <TableHead>Policy No.</TableHead>
                      <TableHead className="text-right">Sum Assured</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Nominees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...active, ...inactive].map((ins) => (
                      <TableRow key={ins.id} className={!ins.is_active ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs">
                              {POLICY_TYPE_LABELS[ins.policy_type] ?? ins.policy_type}
                            </Badge>
                            {ins.is_employer_provided && (
                              <Badge variant="secondary" className="text-xs">Employer</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{ins.insurer}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {ins.policy_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">{formatINR(ins.sum_assured)}</TableCell>
                        <TableCell className="text-right">{formatINR(ins.premium_amount)}</TableCell>
                        <TableCell className="text-sm">{FREQ_LABELS[ins.premium_frequency]}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ins.nominees ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ins.is_active ? "default" : "secondary"}>
                            {ins.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => { setEditing(ins); setModalOpen(true); }}
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(ins.id)}
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
        </div>

        <InsuranceModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={load}
          editing={editing}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
