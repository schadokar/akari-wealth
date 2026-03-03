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

const ACCOUNT_TYPES = [
  { id: 1, name: "Bank" },
  { id: 2, name: "Brokerage" },
  { id: 3, name: "Wallet" },
  { id: 4, name: "Cash" },
  { id: 5, name: "Crypto" },
  { id: 6, name: "NPS" },
  { id: 7, name: "EPF" },
  { id: 8, name: "PPF" },
  { id: 14, name: "Loan" },
  { id: 15, name: "Credit Card" },
];

interface Account {
  ID: number;
  Name: string;
  EntityTypeID: number;
  Amount: number;
  InvestedAmount: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [entityTypeId, setEntityTypeId] = useState<number>(1);
  const [amount, setAmount] = useState("");
  const [investedAmount, setInvestedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Update Account state
  const [updateAccountId, setUpdateAccountId] = useState<number>(0);
  const [updateAmount, setUpdateAmount] = useState("");
  const [updateInvestedAmount, setUpdateInvestedAmount] = useState("");
  const [updating, setUpdating] = useState(false);

  const selectedUpdateAccount = accounts.find((a) => a.ID === updateAccountId);

  const fetchAccounts = () => {
    fetch("http://localhost:8080/accounts/latest")
      .then((res) => res.json())
      .then((data: Account[]) => setAccounts(data ?? []));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8080/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: name.trim(),
          EntityTypeID: entityTypeId,
          Amount: parseFloat(amount),
          InvestedAmount: parseFloat(investedAmount || "0"),
        }),
      });
      if (res.ok) {
        setName("");
        setEntityTypeId(1);
        setAmount("");
        setInvestedAmount("");
        fetchAccounts();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpdateAccount || !updateAmount) return;

    setUpdating(true);
    try {
      const res = await fetch("http://localhost:8080/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Name: selectedUpdateAccount.Name,
          EntityTypeID: selectedUpdateAccount.EntityTypeID,
          Amount: parseFloat(updateAmount),
          InvestedAmount: parseFloat(updateInvestedAmount || "0"),
        }),
      });
      if (res.ok) {
        setUpdateAccountId(0);
        setUpdateAmount("");
        setUpdateInvestedAmount("");
        fetchAccounts();
      }
    } finally {
      setUpdating(false);
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
              <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-5 sm:items-end"
              >
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
                  <label htmlFor="type" className="text-sm font-medium">
                    Account Type
                  </label>
                  <select
                    id="type"
                    value={entityTypeId}
                    onChange={(e) => setEntityTypeId(Number(e.target.value))}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Current Amount
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="investedAmount" className="text-sm font-medium">
                    Invested Amount
                  </label>
                  <Input
                    id="investedAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={investedAmount}
                    onChange={(e) => setInvestedAmount(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Update Account */}
          <Card>
            <CardHeader>
              <CardTitle>Update Account</CardTitle>
              <CardDescription>
                Update an existing account with new values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleUpdate}
                className="grid gap-4 sm:grid-cols-5 sm:items-end"
              >
                <div className="space-y-2">
                  <label htmlFor="updateName" className="text-sm font-medium">
                    Account
                  </label>
                  <select
                    id="updateName"
                    value={updateAccountId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setUpdateAccountId(id);
                      const acc = accounts.find((a) => a.ID === id);
                      if (acc) {
                        setUpdateAmount(String(acc.Amount));
                        setUpdateInvestedAmount(String(acc.InvestedAmount));
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    required
                  >
                    <option value={0} disabled>Select an account</option>
                    {accounts.map((a) => (
                      <option key={a.ID} value={a.ID}>
                        {a.Name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="updateType" className="text-sm font-medium">
                    Account Type
                  </label>
                  <select
                    id="updateType"
                    value={selectedUpdateAccount?.EntityTypeID ?? ""}
                    disabled
                    className="h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-xs opacity-60"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="updateAmount" className="text-sm font-medium">
                    Current Amount
                  </label>
                  <Input
                    id="updateAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={updateAmount}
                    onChange={(e) => setUpdateAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="updateInvestedAmount" className="text-sm font-medium">
                    Invested Amount
                  </label>
                  <Input
                    id="updateInvestedAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={updateInvestedAmount}
                    onChange={(e) => setUpdateInvestedAmount(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={updating || updateAccountId === 0}>
                  {updating ? "Updating..." : "Update Account"}
                </Button>
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
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Current Amount</TableHead>
                    <TableHead className="text-right">Invested Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.ID}>
                      <TableCell className="font-medium">
                        {account.Name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ACCOUNT_TYPES.find(
                            (t) => t.id === account.EntityTypeID
                          )?.name ?? "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatINR(account.Amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatINR(account.InvestedAmount)}
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
