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

const EMI_CATEGORIES = new Set(["loan"]);
const MATURITY_DATE_CATEGORIES = new Set(["fd", "rd", "ppf", "ssy", "loan"]);

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
  maturity_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

const assetClassLabel = (value: string) =>
  ASSET_CLASSES.find((c) => c.value === value)?.label ?? value;

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("bank");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateExtra, setShowCreateExtra] = useState(false);
  const [createInstitution, setCreateInstitution] = useState("");
  const [createInterestRate, setCreateInterestRate] = useState("");
  const [createEmiAmount, setCreateEmiAmount] = useState("");
  const [createMaturityDate, setCreateMaturityDate] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  // Update Account state
  const [updateAccountId, setUpdateAccountId] = useState<number>(0);
  const [updateName, setUpdateName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showUpdateExtra, setShowUpdateExtra] = useState(false);
  const [updateInstitution, setUpdateInstitution] = useState("");
  const [updateInterestRate, setUpdateInterestRate] = useState("");
  const [updateEmiAmount, setUpdateEmiAmount] = useState("");
  const [updateMaturityDate, setUpdateMaturityDate] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  const selectedUpdateAccount = accounts.find((a) => a.id === updateAccountId);

  const fetchAccounts = () => {
    fetch("http://localhost:8080/api/accounts")
      .then((res) => res.json())
      .then((data: Account[]) => setAccounts(data ?? []));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

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
          maturity_date: createMaturityDate || undefined,
          notes: createNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        setName("");
        setCategory("bank");
        setShowCreateExtra(false);
        setCreateInstitution("");
        setCreateInterestRate("");
        setCreateEmiAmount("");
        setCreateMaturityDate("");
        setCreateNotes("");
        fetchAccounts();
      }
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
            maturity_date: updateMaturityDate || undefined,
            notes: updateNotes.trim() || undefined,
          }),
        }
      );
      if (res.ok) {
        setUpdateAccountId(0);
        setUpdateName("");
        setShowUpdateExtra(false);
        setUpdateInstitution("");
        setUpdateInterestRate("");
        setUpdateEmiAmount("");
        setUpdateMaturityDate("");
        setUpdateNotes("");
        fetchAccounts();
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`http://localhost:8080/api/accounts/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchAccounts();
    }
  };

  const handleActivate = async (id: number) => {
    const res = await fetch(`http://localhost:8080/api/accounts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) {
      fetchAccounts();
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
                        />
                      </div>
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
                          setUpdateMaturityDate(acc.maturity_date ?? "");
                          setUpdateNotes(acc.notes ?? "");
                        }
                      }}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      required
                    >
                      <option value={0} disabled>Select an account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
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
                        />
                      </div>
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
