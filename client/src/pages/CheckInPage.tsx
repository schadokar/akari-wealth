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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";
import { apiFetch } from "@/lib/api";

const fmtAmt = (v: string) => (v ? formatINR(Number(v), false) : "");
const rawAmt = (v: string) => v.replace(/[^0-9.]/g, "");

interface Account {
  id: number;
  name: string;
  category: string;
  asset_class: string;
  is_active: boolean;
  invested_amount?: number | null;
}

interface AccountSnapshot {
  id: number;
  account_id: number;
  month: string;
  invested_amount: number | null;
  current_amount: number;
  is_auto: boolean;
  notes: string | null;
  created_at: string;
}

interface RowState {
  invested: string;
  current: string;
  notes: string;
}

type Toast = { type: "success" | "error"; text: string };

export default function CheckInPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [liabilities, setLiabilities] = useState<Account[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [liabilityRows, setLiabilityRows] = useState<Record<number, RowState>>({});
  const [saving, setSaving] = useState(false);
  const [savingLiabilities, setSavingLiabilities] = useState(false);

  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([]);
  const [viewAccountId, setViewAccountId] = useState<number>(0);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [liabilityModalOpen, setLiabilityModalOpen] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAccounts = () => {
    apiFetch("/api/accounts?is_active=true")
      .then((res) => res.json())
      .then((data: Account[]) => {
        const all = data ?? [];
        const accs = all.filter((a) => a.asset_class !== "liability");
        const liabs = all.filter((a) => a.asset_class === "liability");
        setAccounts(accs);
        setLiabilities(liabs);
        const initial: Record<number, RowState> = {};
        accs.forEach((a) => {
          initial[a.id] = { invested: "", current: "", notes: "" };
        });
        setRows(initial);
        const liabInitial: Record<number, RowState> = {};
        liabs.forEach((a) => {
          liabInitial[a.id] = {
            invested: a.category === "loan" && a.invested_amount != null ? String(a.invested_amount) : "",
            current: "",
            notes: "",
          };
        });
        setLiabilityRows(liabInitial);
      });
  };

  const fetchSnapshots = (accId: number) => {
    if (!accId) {
      setSnapshots([]);
      return;
    }
    apiFetch(`/api/snapshots/accounts/${accId}`)
      .then((res) => res.json())
      .then((data: AccountSnapshot[]) => setSnapshots(data ?? []));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchSnapshots(viewAccountId);
  }, [viewAccountId]);

  const updateRow = (id: number, field: keyof RowState, value: string) => {
    setRows((prev) => {
      const isBank = accounts.find((a) => a.id === id)?.category === "bank";
      const updated = { ...prev[id], [field]: value };
      if (isBank && field === "current") {
        updated.invested = value;
      }
      return { ...prev, [id]: updated };
    });
  };

  const updateLiabilityRow = (id: number, field: keyof RowState, value: string) => {
    setLiabilityRows((prev) => {
      const category = liabilities.find((a) => a.id === id)?.category;
      const updated = { ...prev[id], [field]: value };
      if (field === "current" && category === "credit_card") {
        updated.invested = value;
      }
      return { ...prev, [id]: updated };
    });
  };

  const handleSaveLiabilities = async () => {
    const payload = liabilities
      .filter((a) => {
        const row = liabilityRows[a.id];
        return row && (row.invested || row.current);
      })
      .map((a) => {
        const row = liabilityRows[a.id];
        return {
          account_id: a.id,
          month,
          invested_amount: row.invested ? Number(row.invested) : 0,
          current_amount: Number(row.current) || 0,
          notes: row.notes.trim() || null,
        };
      });

    if (payload.length === 0) return;

    setSavingLiabilities(true);
    try {
      const res = await apiFetch("/api/snapshots/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("success", `Liability snapshots saved for ${month}.`);
        const reset: Record<number, RowState> = {};
        liabilities.forEach((a) => {
          reset[a.id] = { invested: "", current: "", notes: "" };
        });
        setLiabilityRows(reset);
        if (viewAccountId) fetchSnapshots(viewAccountId);
        setLiabilityModalOpen(false);
      } else {
        showToast("error", "Failed to save liability snapshots. Please try again.");
      }
    } catch {
      showToast("error", "Network error. Could not reach the server.");
    } finally {
      setSavingLiabilities(false);
    }
  };

  const handleSaveAll = async () => {
    const payload = accounts
      .filter((a) => {
        const row = rows[a.id];
        return row && (row.invested || row.current);
      })
      .map((a) => {
        const row = rows[a.id];
        return {
          account_id: a.id,
          month,
          invested_amount: row.invested ? Number(row.invested) : 0,
          current_amount: Number(row.current) || 0,
          notes: row.notes.trim() || null,
        };
      });

    if (payload.length === 0) return;

    setSaving(true);
    try {
      const res = await apiFetch("/api/snapshots/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("success", `Asset snapshots saved for ${month}.`);
        const reset: Record<number, RowState> = {};
        accounts.forEach((a) => {
          reset[a.id] = { invested: "", current: "", notes: "" };
        });
        setRows(reset);
        if (viewAccountId) fetchSnapshots(viewAccountId);
        setAssetModalOpen(false);
      } else {
        showToast("error", "Failed to save snapshots. Please try again.");
      }
    } catch {
      showToast("error", "Network error. Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const accountName = (id: number) =>
    accounts.find((a) => a.id === id)?.name ?? `#${id}`;

  const hasAnyInput = accounts.some((a) => {
    const row = rows[a.id];
    return row && (row.invested || row.current);
  });

  const hasAnyLiabilityInput = liabilities.some((a) => {
    const row = liabilityRows[a.id];
    return row && (row.invested || row.current);
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Check In</h1>
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

          {/* Snapshot actions */}
          <div className="flex gap-3">
            <Button onClick={() => setAssetModalOpen(true)}>Record Asset Snapshot</Button>
            <Button variant="outline" onClick={() => setLiabilityModalOpen(true)}>Record Liability Snapshot</Button>
          </div>

          {/* Asset Snapshot Modal */}
          <Dialog open={assetModalOpen} onOpenChange={setAssetModalOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Record Asset Snapshot</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2 mb-4">
                <label htmlFor="month" className="text-sm font-medium whitespace-nowrap">
                  Month
                </label>
                <Input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Invested Amount</TableHead>
                      <TableHead>Current Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a) => {
                      const row = rows[a.id] ?? { invested: "", current: "", notes: "" };
                      const isBank = a.category === "bank";
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell className="text-muted-foreground">{a.category}</TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder={isBank ? "Auto" : "Required"}
                              value={fmtAmt(row.invested)}
                              disabled={isBank}
                              onChange={(e) => updateRow(a.id, "invested", rawAmt(e.target.value))}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Required"
                              value={fmtAmt(row.current)}
                              onChange={(e) => updateRow(a.id, "current", rawAmt(e.target.value))}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Optional"
                              value={row.notes}
                              onChange={(e) => updateRow(a.id, "notes", e.target.value)}
                              className="w-40"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAssetModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveAll} disabled={saving || !hasAnyInput}>
                  {saving ? "Saving..." : "Save All"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Liability Snapshot Modal */}
          <Dialog open={liabilityModalOpen} onOpenChange={setLiabilityModalOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Record Liability Snapshot</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Debt</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liabilities.map((a) => {
                      const row = liabilityRows[a.id] ?? { invested: "", current: "", notes: "" };
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell className="text-muted-foreground">{a.category}</TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Auto"
                              value={fmtAmt(row.invested)}
                              disabled={a.category === "credit_card" || a.category === "loan"}
                              onChange={(e) => updateLiabilityRow(a.id, "invested", rawAmt(e.target.value))}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Required"
                              value={fmtAmt(row.current)}
                              onChange={(e) => updateLiabilityRow(a.id, "current", rawAmt(e.target.value))}
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Optional"
                              value={row.notes}
                              onChange={(e) => updateLiabilityRow(a.id, "notes", e.target.value)}
                              className="w-40"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setLiabilityModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveLiabilities} disabled={savingLiabilities || !hasAnyLiabilityInput}>
                  {savingLiabilities ? "Saving..." : "Save All"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Snapshot History */}
          <Card>
            <CardHeader>
              <CardTitle>Snapshot History</CardTitle>
              <CardDescription>View past snapshots for an account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm space-y-2">
                <label htmlFor="viewAccount" className="text-sm font-medium">
                  Account
                </label>
                <select
                  id="viewAccount"
                  value={viewAccountId}
                  onChange={(e) => setViewAccountId(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                >
                  <option value={0}>Select an account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              {viewAccountId > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Invested</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No snapshots found for {accountName(viewAccountId)}
                        </TableCell>
                      </TableRow>
                    ) : (
                      snapshots.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.month}</TableCell>
                          <TableCell className="text-right">
                            {s.invested_amount != null ? formatINR(s.invested_amount) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatINR(s.current_amount)}
                          </TableCell>
                          <TableCell>{s.notes ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant={s.is_auto ? "secondary" : "outline"}>
                              {s.is_auto ? "Auto" : "Manual"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
