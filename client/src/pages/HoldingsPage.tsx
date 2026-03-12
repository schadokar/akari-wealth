import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";
import { apiFetch } from "@/lib/api";

const fmtAmt = (v: string) => (v ? formatINR(Number(v), false) : "");
const rawAmt = (v: string) => v.replace(/[^0-9.]/g, "");

const INSTRUMENT_TYPES = [
  { value: "stock", label: "Stock", assetClass: "STOCK" },
  { value: "mutual_fund", label: "Mutual Fund", assetClass: "MUTUAL_FUND" },
];

const ASSET_CLASSES = [
  { value: "equity", label: "Equity" },
  { value: "debt", label: "Debt" },
  { value: "commodity", label: "Commodity" },
  { value: "hybrid", label: "Hybrid" },
  { value: "cash", label: "Cash" },
];

interface Account {
  id: number;
  name: string;
  category: string;
}

interface Holding {
  id: number;
  account_id: number;
  account_name: string;
  name: string;
  instrument_type: string;
  asset_class?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

interface FinancialInstrument {
  id: number;
  name: string;
  symbol: string;
  asset_class: string;
  instrument_type: string;
  provider?: string;
}

const instrumentTypeLabel = (v: string) =>
  INSTRUMENT_TYPES.find((t) => t.value === v)?.label ?? v;

const assetClassLabel = (v: string) =>
  ASSET_CLASSES.find((c) => c.value === v)?.label ?? v;

export default function HoldingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form
  const [createAccountId, setCreateAccountId] = useState<number>(0);
  const [createInstrumentType, setCreateInstrumentType] = useState("stock");
  const [createSearchQuery, setCreateSearchQuery] = useState("");
  const [createSuggestions, setCreateSuggestions] = useState<FinancialInstrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<FinancialInstrument | null>(null);
  const [createAssetClass, setCreateAssetClass] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createInvestedAmount, setCreateInvestedAmount] = useState("");
  const [createCurrentAmount, setCreateCurrentAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Update form
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateHoldingId, setUpdateHoldingId] = useState<number>(0);
  const [updateName, setUpdateName] = useState("");
  const [updateAssetClass, setUpdateAssetClass] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updateInvestedAmount, setUpdateInvestedAmount] = useState("");
  const [updateCurrentAmount, setUpdateCurrentAmount] = useState("");
  const [updating, setUpdating] = useState(false);

  // Performance chart
  type PerfPeriod = "3M" | "6M" | "12M" | "YTD";
  interface PerfPoint { month: string; invested?: number; current: number; }
  const [perfHoldingId, setPerfHoldingId] = useState<number>(0);
  const [perfPeriod, setPerfPeriod] = useState<PerfPeriod>("6M");
  const [perfData, setPerfData] = useState<PerfPoint[]>([]);

  useEffect(() => {
    if (perfHoldingId === 0) { setPerfData([]); return; }
    apiFetch(`/api/snapshots/holdings/${perfHoldingId}`)
      .then((r) => r.json())
      .then((raw: { month: string; invested_amount?: number; current_amount: number }[]) => {
        if (!Array.isArray(raw)) return;
        const sorted = [...raw].sort((a, b) => a.month.localeCompare(b.month));
        const now = new Date();
        const cutoff = new Date(now);
        if (perfPeriod === "3M") cutoff.setMonth(cutoff.getMonth() - 3);
        else if (perfPeriod === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
        else if (perfPeriod === "12M") cutoff.setFullYear(cutoff.getFullYear() - 1);
        else cutoff.setMonth(0); // YTD: Jan of current year
        const cutoffStr = cutoff.toISOString().slice(0, 7);
        setPerfData(
          sorted
            .filter((s) => s.month >= cutoffStr)
            .map((s) => ({ month: s.month, invested: s.invested_amount, current: s.current_amount }))
        );
      })
      .catch(() => {});
  }, [perfHoldingId, perfPeriod]);

  const fetchData = async () => {
    try {
      const res = await apiFetch("/api/accounts?category=brokerage");
      const accs: Account[] = (await res.json()) ?? [];
      setAccounts(accs);

      const holdingResults = await Promise.all(
        accs.map(async (acc) => {
          const r = await apiFetch(`/api/accounts/${acc.id}/holdings`);
          const h = await r.json();
          return ((h ?? []) as Holding[]).map((holding) => ({
            ...holding,
            account_name: acc.name,
          }));
        })
      );
      setHoldings(holdingResults.flat());
    } catch (err) {
      console.error("Failed to fetch holdings data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Search suggestions when query >= 4 chars
  useEffect(() => {
    if (createSearchQuery.length < 4 || selectedInstrument) {
      setCreateSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const controller = new AbortController();
    const assetClass = INSTRUMENT_TYPES.find((t) => t.value === createInstrumentType)?.assetClass ?? "";
    apiFetch(
      `/api/instruments/search?q=${encodeURIComponent(createSearchQuery)}&asset_class=${assetClass}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data: FinancialInstrument[]) => {
        setCreateSuggestions(data ?? []);
        setShowSuggestions(true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [createSearchQuery, createInstrumentType, selectedInstrument]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectInstrument = (fi: FinancialInstrument) => {
    setSelectedInstrument(fi);
    setCreateSearchQuery(fi.name);
    setCreateAssetClass(fi.instrument_type);
    setShowSuggestions(false);
  };

  const resetCreateForm = () => {
    setCreateAccountId(0);
    setCreateInstrumentType("stock");
    setCreateSearchQuery("");
    setCreateSuggestions([]);
    setSelectedInstrument(null);
    setCreateAssetClass("");
    setCreateNotes("");
    setCreateInvestedAmount("");
    setCreateCurrentAmount("");
    setShowSuggestions(false);
  };

  const openUpdateDialog = async (h: Holding) => {
    setUpdateHoldingId(h.id);
    setUpdateName(h.name);
    setUpdateAssetClass(h.asset_class ?? "");
    setUpdateNotes(h.notes ?? "");
    setUpdateInvestedAmount("");
    setUpdateCurrentAmount("");
    setUpdateOpen(true);
    try {
      const res = await apiFetch(`/api/snapshots/holdings/${h.id}`);
      const snapshots = await res.json();
      if (Array.isArray(snapshots) && snapshots.length > 0) {
        const latest = snapshots[snapshots.length - 1];
        setUpdateInvestedAmount(latest.invested_amount != null ? String(latest.invested_amount) : "");
        setUpdateCurrentAmount(latest.current_amount != null ? String(latest.current_amount) : "");
      }
    } catch {
      // leave fields empty if fetch fails
    }
  };

  const resetUpdateForm = () => {
    setUpdateHoldingId(0);
    setUpdateName("");
    setUpdateAssetClass("");
    setUpdateNotes("");
    setUpdateInvestedAmount("");
    setUpdateCurrentAmount("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = selectedInstrument?.name ?? createSearchQuery.trim();
    if (!name || createAccountId === 0) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(
        `/api/accounts/${createAccountId}/holdings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            instrument_type: createInstrumentType,
            asset_class: createAssetClass || undefined,
            notes: createNotes.trim() || undefined,
          }),
        }
      );
      if (res.ok) {
        const { id: holdingId } = await res.json();
        const current = parseFloat(createCurrentAmount);
        if (!isNaN(current)) {
          const month = new Date().toISOString().slice(0, 7);
          const invested = parseFloat(createInvestedAmount);
          await apiFetch("/api/snapshots/holdings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{
              holding_id: holdingId,
              month,
              invested_amount: isNaN(invested) ? undefined : invested,
              current_amount: current,
            }]),
          });
        }
        resetCreateForm();
        setCreateOpen(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateHoldingId === 0) return;

    setUpdating(true);
    try {
      const res = await apiFetch(`/api/holdings/${updateHoldingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updateName.trim() || undefined,
          asset_class: updateAssetClass || undefined,
          notes: updateNotes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const current = parseFloat(updateCurrentAmount);
        if (!isNaN(current)) {
          const month = new Date().toISOString().slice(0, 7);
          const invested = parseFloat(updateInvestedAmount);
          await apiFetch("/api/snapshots/holdings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{
              holding_id: updateHoldingId,
              month,
              invested_amount: isNaN(invested) ? undefined : invested,
              current_amount: current,
            }]),
          });
        }
        resetUpdateForm();
        setUpdateOpen(false);
        fetchData();
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    const res = await apiFetch(`/api/holdings/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchData();
  };

  const handleActivate = async (id: number) => {
    const res = await apiFetch(`/api/holdings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    if (res.ok) fetchData();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Holdings</h1>
          <div className="ml-auto">
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open);
                if (!open) resetCreateForm();
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">Add Holding</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Holding</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 pt-2">
                  {/* Row 1: Account + Instrument Type */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Brokerage Account</label>
                      <select
                        value={createAccountId}
                        onChange={(e) => setCreateAccountId(Number(e.target.value))}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        required
                      >
                        <option value={0} disabled>Select account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <select
                        value={createInstrumentType}
                        onChange={(e) => {
                          setCreateInstrumentType(e.target.value);
                          setCreateSearchQuery("");
                          setSelectedInstrument(null);
                          setCreateSuggestions([]);
                        }}
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                      >
                        {INSTRUMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Search with suggestions */}
                  <div className="space-y-2" ref={searchRef}>
                    <label className="text-sm font-medium">Search Instrument</label>
                    <div className="relative">
                      <Input
                        placeholder="Type at least 4 letters to search…"
                        value={createSearchQuery}
                        onChange={(e) => {
                          setCreateSearchQuery(e.target.value);
                          setSelectedInstrument(null);
                        }}
                        onFocus={() => {
                          if (createSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        autoComplete="off"
                        required
                      />
                      {showSuggestions && createSuggestions.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md">
                          {createSuggestions.map((fi) => (
                            <li
                              key={fi.id}
                              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-muted"
                              onMouseDown={() => handleSelectInstrument(fi)}
                            >
                              <span>{fi.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{fi.symbol}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {showSuggestions && createSuggestions.length === 0 && createSearchQuery.length >= 4 && !selectedInstrument && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-md">
                          No results found
                        </div>
                      )}
                    </div>
                    {selectedInstrument && (
                      <p className="text-xs text-muted-foreground">
                        {selectedInstrument.symbol} · {assetClassLabel(selectedInstrument.asset_class)}
                        {selectedInstrument.provider ? ` · ${selectedInstrument.provider}` : ""}
                      </p>
                    )}
                  </div>

                  {/* Row 3: Asset Class + Notes */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Asset Class</label>
                      <Input
                        value={createAssetClass}
                        disabled
                        placeholder="Select an instrument"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Notes{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        placeholder="Optional notes"
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 4: Amounts */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Invested Amount{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={fmtAmt(createInvestedAmount)}
                        onChange={(e) => setCreateInvestedAmount(rawAmt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Current Amount{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={fmtAmt(createCurrentAmount)}
                        onChange={(e) => setCreateCurrentAmount(rawAmt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setCreateOpen(false); resetCreateForm(); }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || createAccountId === 0 || !createSearchQuery.trim()}>
                      {submitting ? "Adding..." : "Add Holding"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Update Holding Dialog */}
        <Dialog
          open={updateOpen}
          onOpenChange={(open) => {
            setUpdateOpen(open);
            if (!open) resetUpdateForm();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Update Holding</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 pt-2">
              {/* Row 1: Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={updateName}
                  disabled
                />
              </div>

              {/* Row 2: Asset Class + Notes */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Asset Class{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <select
                    value={updateAssetClass}
                    disabled
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="">— inherit from account —</option>
                    {ASSET_CLASSES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Notes{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    placeholder="Optional notes"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Amounts */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Invested Amount{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={fmtAmt(updateInvestedAmount)}
                    onChange={(e) => setUpdateInvestedAmount(rawAmt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Current Amount{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={fmtAmt(updateCurrentAmount)}
                    onChange={(e) => setUpdateCurrentAmount(rawAmt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setUpdateOpen(false); resetUpdateForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? "Updating..." : "Update Holding"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex-1 space-y-6 p-6">
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Stocks</CardDescription>
                <CardTitle className="text-2xl">
                  {holdings.filter((h) => h.instrument_type === "stock" && h.is_active).length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Mutual Funds</CardDescription>
                <CardTitle className="text-2xl">
                  {holdings.filter((h) => h.instrument_type === "mutual_fund" && h.is_active).length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>ETFs</CardDescription>
                <CardTitle className="text-2xl">
                  {holdings.filter((h) => h.instrument_type === "etf" && h.is_active).length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle>Holding Performance</CardTitle>
                <div className="flex items-center gap-3">
                  <select
                    value={perfHoldingId}
                    onChange={(e) => setPerfHoldingId(Number(e.target.value))}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    <option value={0}>Select holding…</option>
                    {holdings.filter((h) => h.is_active).map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    {(["3M", "6M", "12M", "YTD"] as PerfPeriod[]).map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={perfPeriod === p ? "default" : "ghost"}
                        onClick={() => setPerfPeriod(p)}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {perfHoldingId === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Select a holding to view performance
                </p>
              ) : perfData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No snapshot data for this period
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={perfData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip
                      formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="invested"
                      name="Invested"
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      fill="url(#colorInvested)"
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey="current"
                      name="Current Value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#colorCurrent)"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* All Holdings */}
          <Card>
            <CardHeader>
              <CardTitle>All Holdings</CardTitle>
              <CardDescription>
                {holdings.length} holding{holdings.length !== 1 ? "s" : ""} across{" "}
                {accounts.length} brokerage account{accounts.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground py-8"
                      >
                        No holdings yet. Click "Add Holding" to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {holdings.map((holding) => (
                    <TableRow key={holding.id}>
                      <TableCell className="font-medium">{holding.name}</TableCell>
                      <TableCell>{holding.account_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {instrumentTypeLabel(holding.instrument_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {holding.asset_class ? (
                          <Badge variant="outline">
                            {assetClassLabel(holding.asset_class)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={holding.is_active ? "default" : "destructive"}>
                          {holding.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUpdateDialog(holding)}
                        >
                          Update
                        </Button>
                        {holding.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(holding.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(holding.id)}
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
