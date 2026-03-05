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
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";

const fmtAmt = (v: string) => (v ? formatINR(Number(v), false) : "");
const rawAmt = (v: string) => v.replace(/[^0-9.]/g, "");

const CATEGORIES = [
  { value: "bank", label: "Bank" },
  { value: "brokerage", label: "Brokerage" },
  { value: "nps_t1", label: "NPS Tier 1" },
  { value: "nps_t2", label: "NPS Tier 2" },
  { value: "epf", label: "EPF" },
  { value: "eps", label: "EPS" },
  { value: "credit_card", label: "Credit Card" },
  { value: "loan", label: "Loan" },
  { value: "fd", label: "FD" },
  { value: "rd", label: "RD" },
  { value: "ppf", label: "PPF" },
  { value: "ssy", label: "SSY" },
  { value: "cash", label: "Cash" },
];

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

// Categories that show EMI amount field
const EMI_CATEGORIES = new Set(["loan"]);
// Categories that show maturity date field
const MATURITY_DATE_CATEGORIES = new Set(["fd", "rd", "ppf", "ssy", "loan"]);
// Categories that show start date field (disbursement date for loan, opening date for FD/RD/PPF)
const START_DATE_CATEGORIES = new Set(["loan", "fd", "rd", "ppf"]);
// Categories that show tenure field (duration in months)
const TENURE_CATEGORIES = new Set(["loan", "fd", "rd", "ppf"]);

const ASSET_CLASSES = [
  { value: "asset", label: "Asset" },
  // { value: "equity", label: "Equity" },
  // { value: "debt", label: "Debt" },
  // { value: "commodity", label: "Commodity" },
  // { value: "hybrid", label: "Hybrid" },
  { value: "cash", label: "Cash" },
  { value: "liability", label: "Liability" },
];

interface Account {
  id: number;
  name: string;
  category: string;
  sub_category?: string;
  asset_class: string;
  institution?: string;
  interest_rate?: number;
  emi_amount?: number;
  start_date?: string;
  tenure_months?: number;
  maturity_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  invested_amount?: number;
  current_amount?: number;
}

const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

const assetClassLabel = (value: string) =>
  ASSET_CLASSES.find((c) => c.value === value)?.label ?? value;

type Toast = { type: "success" | "error"; text: string };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("bank");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateExtra, setShowCreateExtra] = useState(false);
  const [createInstitution, setCreateInstitution] = useState("");
  const [createInterestRate, setCreateInterestRate] = useState("");
  const [createEmiAmount, setCreateEmiAmount] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createTenureMonths, setCreateTenureMonths] = useState("");
  const [createMaturityDate, setCreateMaturityDate] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createLoanAmount, setCreateLoanAmount] = useState("");
  const [createOutstandingAmount, setCreateOutstandingAmount] = useState("");

  // Update Account state
  const [updateAccountId, setUpdateAccountId] = useState<number>(0);
  const [updateName, setUpdateName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showUpdateExtra, setShowUpdateExtra] = useState(false);
  const [updateInstitution, setUpdateInstitution] = useState("");
  const [updateInterestRate, setUpdateInterestRate] = useState("");
  const [updateEmiAmount, setUpdateEmiAmount] = useState("");
  const [updateStartDate, setUpdateStartDate] = useState("");
  const [updateTenureMonths, setUpdateTenureMonths] = useState("");
  const [updateMaturityDate, setUpdateMaturityDate] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateLoanAmount, setUpdateLoanAmount] = useState("");
  const [updateOutstandingAmount, setUpdateOutstandingAmount] = useState("");

  const selectedUpdateAccount = accounts.find((a) => a.id === updateAccountId);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAccounts = () => {
    fetch("http://localhost:8080/api/accounts")
      .then((res) => res.json())
      .then((data: Account[]) => setAccounts(data ?? []));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Auto-calculate maturity date from start date + tenure for create form
  useEffect(() => {
    if (createStartDate && createTenureMonths) {
      const date = new Date(createStartDate);
      date.setMonth(date.getMonth() + parseInt(createTenureMonths));
      setCreateMaturityDate(date.toISOString().split("T")[0]);
    }
  }, [createStartDate, createTenureMonths]);

  // Auto-calculate maturity date from start date + tenure for update form
  useEffect(() => {
    if (updateStartDate && updateTenureMonths) {
      const date = new Date(updateStartDate);
      date.setMonth(date.getMonth() + parseInt(updateTenureMonths));
      setUpdateMaturityDate(date.toISOString().split("T")[0]);
    }
  }, [updateStartDate, updateTenureMonths]);

  const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8080/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          asset_class: CATEGORY_TO_ASSET_CLASS[category] ?? "asset",
          institution: createInstitution.trim() || undefined,
          interest_rate: createInterestRate ? parseFloat(createInterestRate) : undefined,
          emi_amount: createEmiAmount ? parseFloat(createEmiAmount) : undefined,
          start_date: createStartDate || undefined,
          tenure_months: createTenureMonths ? parseInt(createTenureMonths) : undefined,
          maturity_date: createMaturityDate || undefined,
          notes: createNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const { id } = await res.json();
        if (category === "loan" && (createLoanAmount || createOutstandingAmount)) {
          await fetch("http://localhost:8080/api/snapshots/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{
              account_id: id,
              month: currentMonth(),
              invested_amount: createLoanAmount ? parseFloat(createLoanAmount) : 0,
              current_amount: createOutstandingAmount ? parseFloat(createOutstandingAmount) : 0,
              emi_amount: createEmiAmount ? parseFloat(createEmiAmount) : 0,
              interest_rate: createInterestRate ? parseFloat(createInterestRate) : 0,
              notes: null,
            }]),
          });
        }
        showToast("success", `Account "${name.trim()}" created successfully.`);
        setName("");
        setCategory("bank");
        setShowCreateExtra(false);
        setCreateInstitution("");
        setCreateInterestRate("");
        setCreateEmiAmount("");
        setCreateStartDate("");
        setCreateTenureMonths("");
        setCreateMaturityDate("");
        setCreateNotes("");
        setCreateLoanAmount("");
        setCreateOutstandingAmount("");
        fetchAccounts();
      } else {
        showToast("error", "Failed to create account. Please try again.");
      }
    } catch {
      showToast("error", "Network error. Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpdateAccount) return;

    setUpdating(true);
    try {
      const res = await fetch(
        `http://localhost:8080/api/accounts/${updateAccountId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updateName.trim() || undefined,
            institution: updateInstitution.trim() || undefined,
            interest_rate: updateInterestRate ? parseFloat(updateInterestRate) : undefined,
            emi_amount: updateEmiAmount ? parseFloat(updateEmiAmount) : undefined,
            start_date: updateStartDate || undefined,
            tenure_months: updateTenureMonths ? parseInt(updateTenureMonths) : undefined,
            maturity_date: updateMaturityDate || undefined,
            notes: updateNotes.trim() || undefined,
          }),
        }
      );
      if (res.ok) {
        if (selectedUpdateAccount.category === "loan" && (updateLoanAmount || updateOutstandingAmount)) {
          await fetch("http://localhost:8080/api/snapshots/accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{
              account_id: updateAccountId,
              month: currentMonth(),
              invested_amount: updateLoanAmount ? parseFloat(updateLoanAmount) : 0,
              current_amount: updateOutstandingAmount ? parseFloat(updateOutstandingAmount) : 0,
              emi_amount: updateEmiAmount ? parseFloat(updateEmiAmount) : 0,
              interest_rate: updateInterestRate ? parseFloat(updateInterestRate) : 0,
              notes: null,
            }]),
          });
        }
        showToast("success", `Account "${selectedUpdateAccount.name}" updated successfully.`);
        setUpdateAccountId(0);
        setUpdateName("");
        setShowUpdateExtra(false);
        setUpdateInstitution("");
        setUpdateInterestRate("");
        setUpdateEmiAmount("");
        setUpdateStartDate("");
        setUpdateTenureMonths("");
        setUpdateMaturityDate("");
        setUpdateNotes("");
        setUpdateLoanAmount("");
        setUpdateOutstandingAmount("");
        fetchAccounts();
      } else {
        showToast("error", "Failed to update account. Please try again.");
      }
    } catch {
      showToast("error", "Network error. Could not reach the server.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const acc = accounts.find((a) => a.id === id);
    const res = await fetch(`http://localhost:8080/api/accounts/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("success", `Account "${acc?.name}" deactivated.`);
      fetchAccounts();
    } else {
      showToast("error", "Failed to deactivate account.");
    }
  };

  const handleActivate = async (id: number) => {
    const acc = accounts.find((a) => a.id === id);
    const res = await fetch(`http://localhost:8080/api/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) {
      showToast("success", `Account "${acc?.name}" activated.`);
      fetchAccounts();
    } else {
      showToast("error", "Failed to activate account.");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Accounts</h1>
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

          {/* Create Account */}
          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                Add a new financial account to track
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="name"
                      placeholder="e.g. HDFC Savings"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="category" className="text-sm font-medium">
                      Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => setShowCreateExtra((v) => !v)}
                  >
                    {showCreateExtra ? "− Less details" : "+ More details"}
                  </Button>
                </div>

                {showCreateExtra && (
                  <div className="grid gap-4 sm:grid-cols-4 border-t pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Institution</label>
                      <Input
                        placeholder="e.g. HDFC Bank"
                        value={createInstitution}
                        onChange={(e) => setCreateInstitution(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Interest Rate (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 7.5"
                        value={createInterestRate}
                        onChange={(e) => setCreateInterestRate(e.target.value)}
                      />
                    </div>
                    {/* Start date: disbursement date for loan, opening date for FD/RD/PPF */}
                    {START_DATE_CATEGORIES.has(category) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={createStartDate}
                          onChange={(e) => setCreateStartDate(e.target.value)}
                        />
                      </div>
                    )}
                    {/* Tenure: duration in months (e.g. 240 for 20-year loan, 12 for 1-year FD) */}
                    {TENURE_CATEGORIES.has(category) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tenure (months)</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 240"
                          value={createTenureMonths}
                          onChange={(e) => setCreateTenureMonths(e.target.value)}
                        />
                      </div>
                    )}
                    {EMI_CATEGORIES.has(category) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">EMI Amount</label>
                        <Input
                          type="text"
                          placeholder="e.g. 5,000"
                          value={fmtAmt(createEmiAmount)}
                          onChange={(e) => setCreateEmiAmount(rawAmt(e.target.value))}
                        />
                      </div>
                    )}
                    {MATURITY_DATE_CATEGORIES.has(category) && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Maturity Date</label>
                        <Input
                          type="date"
                          value={createMaturityDate}
                          onChange={(e) => setCreateMaturityDate(e.target.value)}
                          disabled={true}
                        />
                      </div>
                    )}
                    {category === "loan" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Loan Amount</label>
                          <Input
                            type="text"
                            placeholder="e.g. 10,00,000"
                            value={fmtAmt(createLoanAmount)}
                            onChange={(e) => setCreateLoanAmount(rawAmt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Outstanding Amount</label>
                          <Input
                            type="text"
                            placeholder="e.g. 8,50,000"
                            value={fmtAmt(createOutstandingAmount)}
                            onChange={(e) => setCreateOutstandingAmount(rawAmt(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2 sm:col-span-4">
                      <label className="text-sm font-medium">Notes</label>
                      <Input
                        placeholder="Optional notes"
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Update Account */}
          <Card>
            <CardHeader>
              <CardTitle>Update Account</CardTitle>
              <CardDescription>
                Update an existing account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4 sm:items-end">
                  <div className="space-y-2">
                    <label htmlFor="updateAccount" className="text-sm font-medium">
                      Account
                    </label>
                    <select
                      id="updateAccount"
                      value={updateAccountId}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setUpdateAccountId(id);
                        const acc = accounts.find((a) => a.id === id);
                        if (acc) {
                          setUpdateName(acc.name);
                          setUpdateInstitution(acc.institution ?? "");
                          setUpdateInterestRate(acc.interest_rate?.toString() ?? "");
                          setUpdateEmiAmount(acc.emi_amount?.toString() ?? "");
                          setUpdateStartDate(acc.start_date ?? "");
                          setUpdateTenureMonths(acc.tenure_months?.toString() ?? "");
                          setUpdateMaturityDate(acc.maturity_date ?? "");
                          setUpdateNotes(acc.notes ?? "");
                          setUpdateLoanAmount(acc.invested_amount?.toString() ?? "");
                          setUpdateOutstandingAmount(acc.current_amount?.toString() ?? "");
                        }
                      }}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      required
                    >
                      <option value={0} disabled>Select an account</option>
                      {accounts.filter((a) => a.asset_class !== "liability").length > 0 && (
                        <optgroup label="Assets">
                          {accounts.filter((a) => a.asset_class !== "liability").map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {accounts.filter((a) => a.asset_class === "liability").length > 0 && (
                        <optgroup label="Liabilities">
                          {accounts.filter((a) => a.asset_class === "liability").map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="updateCategory" className="text-sm font-medium">
                      Category
                    </label>
                    <select
                      id="updateCategory"
                      value={selectedUpdateAccount?.category ?? ""}
                      disabled
                      className="h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-xs opacity-60"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="updateName" className="text-sm font-medium">
                      Name
                    </label>
                    <Input
                      id="updateName"
                      value={updateName}
                      onChange={(e) => setUpdateName(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => setShowUpdateExtra((v) => !v)}
                    disabled={updateAccountId === 0}
                  >
                    {showUpdateExtra ? "− Less details" : "+ More details"}
                  </Button>
                </div>

                {showUpdateExtra && (
                  <div className="grid gap-4 sm:grid-cols-4 border-t pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Institution</label>
                      <Input
                        placeholder="e.g. HDFC Bank"
                        value={updateInstitution}
                        onChange={(e) => setUpdateInstitution(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Interest Rate (%)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 7.5"
                        value={updateInterestRate}
                        onChange={(e) => setUpdateInterestRate(e.target.value)}
                      />
                    </div>
                    {/* Start date: disbursement date for loan, opening date for FD/RD/PPF */}
                    {START_DATE_CATEGORIES.has(selectedUpdateAccount?.category ?? "") && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={updateStartDate}
                          onChange={(e) => setUpdateStartDate(e.target.value)}
                        />
                      </div>
                    )}
                    {/* Tenure: duration in months (e.g. 240 for 20-year loan, 12 for 1-year FD) */}
                    {TENURE_CATEGORIES.has(selectedUpdateAccount?.category ?? "") && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tenure (months)</label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 240"
                          value={updateTenureMonths}
                          onChange={(e) => setUpdateTenureMonths(e.target.value)}
                        />
                      </div>
                    )}
                    {EMI_CATEGORIES.has(selectedUpdateAccount?.category ?? "") && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">EMI Amount</label>
                        <Input
                          type="text"
                          placeholder="e.g. 5,000"
                          value={fmtAmt(updateEmiAmount)}
                          onChange={(e) => setUpdateEmiAmount(rawAmt(e.target.value))}
                        />
                      </div>
                    )}
                    {MATURITY_DATE_CATEGORIES.has(selectedUpdateAccount?.category ?? "") && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Maturity Date</label>
                        <Input
                          type="date"
                          value={updateMaturityDate}
                          onChange={(e) => setUpdateMaturityDate(e.target.value)}
                          disabled={true}
                        />
                      </div>
                    )}
                    {selectedUpdateAccount?.category === "loan" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Loan Amount</label>
                          <Input
                            type="text"
                            placeholder="e.g. 10,00,000"
                            value={fmtAmt(updateLoanAmount)}
                            onChange={(e) => setUpdateLoanAmount(rawAmt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Outstanding Amount</label>
                          <Input
                            type="text"
                            placeholder="e.g. 8,50,000"
                            value={fmtAmt(updateOutstandingAmount)}
                            onChange={(e) => setUpdateOutstandingAmount(rawAmt(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2 sm:col-span-4">
                      <label className="text-sm font-medium">Notes</label>
                      <Input
                        placeholder="Optional notes"
                        value={updateNotes}
                        onChange={(e) => setUpdateNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={updating || updateAccountId === 0}>
                    {updating ? "Updating..." : "Update Account"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* All Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>All Accounts</CardTitle>
              <CardDescription>
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Asset Class</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {categoryLabel(account.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assetClassLabel(account.asset_class)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {account.institution ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? "default" : "destructive"}>
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {account.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(account.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(account.id)}
                          >
                            Activate
                          </Button>
                        )}
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
