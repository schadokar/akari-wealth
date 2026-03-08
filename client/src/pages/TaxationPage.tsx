import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { formatINR } from "@/lib/formatINR";

// ─── Tax slab calculators (FY 2025-26) ───────────────────────────────────────

function calcNewRegimeTax(taxableIncome: number): number {
  const slabs = [
    { limit: 300_000, rate: 0.0 },
    { limit: 700_000, rate: 0.05 },
    { limit: 1_000_000, rate: 0.1 },
    { limit: 1_200_000, rate: 0.15 },
    { limit: 1_500_000, rate: 0.2 },
    { limit: Infinity, rate: 0.3 },
  ];
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (taxableIncome <= prev) break;
    tax += (Math.min(taxableIncome, slab.limit) - prev) * slab.rate;
    prev = slab.limit;
  }
  return tax;
}

function calcOldRegimeTax(taxableIncome: number): number {
  const slabs = [
    { limit: 250_000, rate: 0.0 },
    { limit: 500_000, rate: 0.05 },
    { limit: 1_000_000, rate: 0.2 },
    { limit: Infinity, rate: 0.3 },
  ];
  let tax = 0;
  let prev = 0;
  for (const slab of slabs) {
    if (taxableIncome <= prev) break;
    tax += (Math.min(taxableIncome, slab.limit) - prev) * slab.rate;
    prev = slab.limit;
  }
  return tax;
}

function surchargeRate(taxableIncome: number): number {
  if (taxableIncome > 50_00_000) return 0.1;
  return 0;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const D = {
  gross: 18_00_000,
  basic: 9_00_000,
  otherIncome: 60_000,
  s80C: 1_50_000,
  s80DSelf: 25_000,
  s80DParents: 25_000,
  parentsAbove60: false,
  employerNPS: 90_000,   // 10% of basic
  nps80CCD1B: 50_000,
  s80E: 0,
  s80G: 0,
  s80TTA: 10_000,
  hra: 1_80_000,
  lta: 20_000,
  homeLoan: 2_00_000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NumInput({
  label,
  value,
  onChange,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Math.max(0, Number(e.target.value));
          onChange(max !== undefined ? Math.min(v, max) : v);
        }}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <label className="flex cursor-pointer items-center gap-2 pt-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        <span className="text-sm">{checked ? "Yes" : "No"}</span>
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "font-semibold" : ""}`}>
      <span className={muted || !bold ? "text-muted-foreground" : ""}>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaxationPage() {
  const [gross, setGross] = useState(D.gross);
  const [basic, setBasic] = useState(D.basic);
  const [otherIncome, setOtherIncome] = useState(D.otherIncome);

  // Old regime deduction states
  const [s80C, setS80C] = useState(D.s80C);
  const [s80DSelf, setS80DSelf] = useState(D.s80DSelf);
  const [s80DParents, setS80DParents] = useState(D.s80DParents);
  const [parentsAbove60, setParentsAbove60] = useState(D.parentsAbove60);
  const [employerNPS, setEmployerNPS] = useState(D.employerNPS);
  const [nps, setNps] = useState(D.nps80CCD1B);
  const [s80E, setS80E] = useState(D.s80E);
  const [s80G, setS80G] = useState(D.s80G);
  const [s80TTA, setS80TTA] = useState(D.s80TTA);
  const [hra, setHra] = useState(D.hra);
  const [lta, setLta] = useState(D.lta);
  const [homeLoan, setHomeLoan] = useState(D.homeLoan);

  const result = useMemo(() => {
    const totalIncome = gross + otherIncome;

    // ── New Regime ────────────────────────────────────────────────────────────
    const stdNew = 75_000;
    // New regime allows only: std deduction + employer NPS 80CCD(2)
    const empNPSNew = Math.min(employerNPS, basic * 0.1);
    const taxableNew = Math.max(0, totalIncome - stdNew - empNPSNew);
    let baseTaxNew = calcNewRegimeTax(taxableNew);
    if (taxableNew <= 7_00_000) baseTaxNew = 0; // 87A rebate
    const surchargeNew = baseTaxNew * surchargeRate(taxableNew);
    const cessNew = (baseTaxNew + surchargeNew) * 0.04;
    const totalTaxNew = baseTaxNew + surchargeNew + cessNew;

    // ── Old Regime ────────────────────────────────────────────────────────────
    const stdOld = 50_000;
    const parentsDCap = parentsAbove60 ? 50_000 : 25_000;
    const empNPSOld = Math.min(employerNPS, basic * 0.1); // 80CCD(2): 10% of basic, no ₹ cap

    const breakdown = {
      s80C: Math.min(s80C, 1_50_000),
      s80DSelf: Math.min(s80DSelf, 25_000),
      s80DParents: Math.min(s80DParents, parentsDCap),
      employerNPS: empNPSOld,
      nps: Math.min(nps, 50_000),
      s80E,                              // no cap
      s80G: Math.round(s80G * 0.5),     // 50% of eligible donation
      s80TTA: Math.min(s80TTA, 10_000),
      hra,
      lta,
      homeLoan: Math.min(homeLoan, 2_00_000),
    };

    const deductionsOld = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const taxableOld = Math.max(0, totalIncome - stdOld - deductionsOld);
    let baseTaxOld = calcOldRegimeTax(taxableOld);
    if (taxableOld <= 5_00_000) baseTaxOld = 0; // 87A rebate
    const surchargeOld = baseTaxOld * surchargeRate(taxableOld);
    const cessOld = (baseTaxOld + surchargeOld) * 0.04;
    const totalTaxOld = baseTaxOld + surchargeOld + cessOld;

    const better: "new" | "old" = totalTaxNew <= totalTaxOld ? "new" : "old";

    return {
      totalIncome,
      new: {
        stdDeduction: stdNew,
        empNPS: empNPSNew,
        taxableIncome: taxableNew,
        baseTax: baseTaxNew,
        surcharge: surchargeNew,
        cess: cessNew,
        totalTax: totalTaxNew,
        effectiveRate: totalIncome > 0 ? (totalTaxNew / totalIncome) * 100 : 0,
        inHandMonthly: (totalIncome - totalTaxNew) / 12,
      },
      old: {
        stdDeduction: stdOld,
        breakdown,
        deductions: deductionsOld,
        taxableIncome: taxableOld,
        baseTax: baseTaxOld,
        surcharge: surchargeOld,
        cess: cessOld,
        totalTax: totalTaxOld,
        effectiveRate: totalIncome > 0 ? (totalTaxOld / totalIncome) * 100 : 0,
        inHandMonthly: (totalIncome - totalTaxOld) / 12,
      },
      better,
      saving: Math.abs(totalTaxNew - totalTaxOld),
    };
  }, [gross, basic, otherIncome, s80C, s80DSelf, s80DParents, parentsAbove60,
      employerNPS, nps, s80E, s80G, s80TTA, hra, lta, homeLoan]);

  const isNewBetter = result.better === "new";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-6 py-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-lg font-semibold">Tax Calculator</h1>
          <Badge variant="secondary" className="ml-2">FY 2025-26</Badge>
        </header>

        <div className="flex-1 space-y-6 p-6">

          {/* ── Income Details ────────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Income Details</CardTitle>
              <CardDescription>Annual figures in ₹ — edit to recalculate instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumInput label="Gross Annual Salary" value={gross} onChange={setGross} />
                <NumInput
                  label="Basic Salary"
                  value={basic}
                  onChange={setBasic}
                  hint="Used to compute 80CCD(2) employer NPS limit (10% of basic)"
                />
                <NumInput
                  label="Other Income"
                  value={otherIncome}
                  onChange={setOtherIncome}
                  hint="Interest, freelance, rental, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Old Regime Deductions ─────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Old Regime Deductions</CardTitle>
              <CardDescription>
                Applicable only under the Old Regime. 80CCD(2) employer NPS also applies in New Regime.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Chapter VI-A */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Chapter VI-A
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumInput
                    label="Section 80C"
                    value={s80C}
                    onChange={setS80C}
                    max={1_50_000}
                    hint="EPF, PPF, ELSS, LIC, NSC, tuition fees · Max ₹1,50,000"
                  />
                  <NumInput
                    label="80D — Self & Family Medical"
                    value={s80DSelf}
                    onChange={setS80DSelf}
                    max={25_000}
                    hint="Health insurance for self, spouse & children · Max ₹25,000"
                  />
                  <NumInput
                    label="80D — Parents Medical"
                    value={s80DParents}
                    onChange={setS80DParents}
                    max={parentsAbove60 ? 50_000 : 25_000}
                    hint={`Health insurance for parents · Max ₹${parentsAbove60 ? "50,000" : "25,000"}`}
                  />
                  <Toggle
                    label="Parents are senior citizens (60+)?"
                    checked={parentsAbove60}
                    onChange={setParentsAbove60}
                    hint="Raises parent 80D limit to ₹50,000"
                  />
                  <NumInput
                    label="80CCD(2) — Employer NPS"
                    value={employerNPS}
                    onChange={setEmployerNPS}
                    hint={`Employer's NPS contribution · Auto-capped at 10% of basic (₹${formatINR(basic * 0.1)})`}
                  />
                  <NumInput
                    label="80CCD(1B) — Self NPS"
                    value={nps}
                    onChange={setNps}
                    max={50_000}
                    hint="Additional voluntary NPS · Max ₹50,000"
                  />
                  <NumInput
                    label="80E — Education Loan Interest"
                    value={s80E}
                    onChange={setS80E}
                    hint="Full interest deductible · No cap · Max 8 years"
                  />
                  <NumInput
                    label="80G — Donations"
                    value={s80G}
                    onChange={setS80G}
                    hint="Enter total eligible donation · 50% deductible applied"
                  />
                  <NumInput
                    label="80TTA — Savings Interest"
                    value={s80TTA}
                    onChange={setS80TTA}
                    max={10_000}
                    hint="Savings account interest (non-senior) · Max ₹10,000"
                  />
                </div>
              </div>

              {/* Salary Exemptions */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Salary Exemptions
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumInput
                    label="HRA Exemption"
                    value={hra}
                    onChange={setHra}
                    hint="Actual exempt portion (use HRA calculator separately)"
                  />
                  <NumInput
                    label="LTA — Leave Travel Allowance"
                    value={lta}
                    onChange={setLta}
                    hint="Actual travel cost for domestic trips"
                  />
                </div>
              </div>

              {/* Property */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Property
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <NumInput
                    label="Section 24(b) — Home Loan Interest"
                    value={homeLoan}
                    onChange={setHomeLoan}
                    max={2_00_000}
                    hint="Self-occupied property · Max ₹2,00,000"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ── Side-by-side Comparison ───────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* New Regime */}
            <Card className={isNewBetter ? "border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20" : ""}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>New Regime</CardTitle>
                  {isNewBetter && <Badge className="bg-emerald-600 text-white">Better</Badge>}
                </div>
                <CardDescription>Std. deduction ₹75,000 · Employer NPS 80CCD(2) allowed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <Row label="Gross Income" value={formatINR(result.totalIncome)} />
                  <Row label="Standard Deduction" value={`− ${formatINR(result.new.stdDeduction)}`} muted />
                  {result.new.empNPS > 0 && (
                    <Row label="Employer NPS 80CCD(2)" value={`− ${formatINR(result.new.empNPS)}`} muted />
                  )}
                  <Separator className="my-2" />
                  <Row label="Taxable Income" value={formatINR(result.new.taxableIncome)} bold />
                  <Separator className="my-2" />
                  <Row label="Income Tax" value={formatINR(result.new.baseTax)} />
                  <Row label="Surcharge" value={formatINR(result.new.surcharge)} />
                  <Row label="Health & Education Cess (4%)" value={formatINR(result.new.cess)} />
                  <Separator className="my-2" />
                  <Row label="Total Tax Payable" value={formatINR(result.new.totalTax)} bold />
                  <Separator className="my-2" />
                  <Row label="Effective Tax Rate" value={`${result.new.effectiveRate.toFixed(2)}%`} />
                  <Row label="Monthly In-Hand (est.)" value={formatINR(result.new.inHandMonthly)} />
                </div>
              </CardContent>
            </Card>

            {/* Old Regime */}
            <Card className={!isNewBetter ? "border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20" : ""}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Old Regime</CardTitle>
                  {!isNewBetter && <Badge className="bg-emerald-600 text-white">Better</Badge>}
                </div>
                <CardDescription>Std. deduction ₹50,000 · Full Chapter VI-A deductions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <Row label="Gross Income" value={formatINR(result.totalIncome)} />
                  <Row label="Standard Deduction" value={`− ${formatINR(result.old.stdDeduction)}`} muted />
                  <Row label="Section 80C" value={`− ${formatINR(result.old.breakdown.s80C)}`} muted />
                  <Row label="80D — Self & Family" value={`− ${formatINR(result.old.breakdown.s80DSelf)}`} muted />
                  <Row label="80D — Parents" value={`− ${formatINR(result.old.breakdown.s80DParents)}`} muted />
                  <Row label="Employer NPS 80CCD(2)" value={`− ${formatINR(result.old.breakdown.employerNPS)}`} muted />
                  <Row label="Self NPS 80CCD(1B)" value={`− ${formatINR(result.old.breakdown.nps)}`} muted />
                  {result.old.breakdown.s80E > 0 && (
                    <Row label="80E — Edu Loan Interest" value={`− ${formatINR(result.old.breakdown.s80E)}`} muted />
                  )}
                  {result.old.breakdown.s80G > 0 && (
                    <Row label="80G — Donations (50%)" value={`− ${formatINR(result.old.breakdown.s80G)}`} muted />
                  )}
                  <Row label="80TTA — Savings Interest" value={`− ${formatINR(result.old.breakdown.s80TTA)}`} muted />
                  {result.old.breakdown.hra > 0 && (
                    <Row label="HRA Exemption" value={`− ${formatINR(result.old.breakdown.hra)}`} muted />
                  )}
                  {result.old.breakdown.lta > 0 && (
                    <Row label="LTA Exemption" value={`− ${formatINR(result.old.breakdown.lta)}`} muted />
                  )}
                  {result.old.breakdown.homeLoan > 0 && (
                    <Row label="Home Loan Interest Sec 24(b)" value={`− ${formatINR(result.old.breakdown.homeLoan)}`} muted />
                  )}
                  <Separator className="my-2" />
                  <Row label="Taxable Income" value={formatINR(result.old.taxableIncome)} bold />
                  <Separator className="my-2" />
                  <Row label="Income Tax" value={formatINR(result.old.baseTax)} />
                  <Row label="Surcharge" value={formatINR(result.old.surcharge)} />
                  <Row label="Health & Education Cess (4%)" value={formatINR(result.old.cess)} />
                  <Separator className="my-2" />
                  <Row label="Total Tax Payable" value={formatINR(result.old.totalTax)} bold />
                  <Separator className="my-2" />
                  <Row label="Effective Tax Rate" value={`${result.old.effectiveRate.toFixed(2)}%`} />
                  <Row label="Monthly In-Hand (est.)" value={formatINR(result.old.inHandMonthly)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Verdict ───────────────────────────────────────────────────── */}
          <Card className={`border-2 ${isNewBetter ? "border-emerald-500" : "border-blue-500"}`}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-2xl font-bold">
                  {isNewBetter ? "New Regime" : "Old Regime"} is better for you
                </p>
                {result.saving > 0 ? (
                  <p className="text-muted-foreground">
                    You save{" "}
                    <span className="font-semibold text-foreground">{formatINR(result.saving)}</span>
                    {" "}per year — that's{" "}
                    <span className="font-semibold text-foreground">{formatINR(result.saving / 12)}</span>
                    {" "}extra per month.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Both regimes result in the same tax. Either works.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Deduction Summary ─────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Old Regime — Total Deductions</CardTitle>
              <CardDescription>Breakdown of all deductions applied</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Section</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Std. Deduction", "Flat salaried deduction", result.old.stdDeduction],
                    ["80C", "EPF, PPF, ELSS, LIC, NSC, etc.", result.old.breakdown.s80C],
                    ["80D — Self", "Health insurance (self + family)", result.old.breakdown.s80DSelf],
                    ["80D — Parents", `Health insurance (parents${parentsAbove60 ? ", Sr. citizen" : ""})`, result.old.breakdown.s80DParents],
                    ["80CCD(2)", "Employer NPS contribution", result.old.breakdown.employerNPS],
                    ["80CCD(1B)", "Self NPS contribution", result.old.breakdown.nps],
                    ["80E", "Education loan interest", result.old.breakdown.s80E],
                    ["80G", "Donations (50% deductible)", result.old.breakdown.s80G],
                    ["80TTA", "Savings account interest", result.old.breakdown.s80TTA],
                    ["HRA", "House rent allowance exemption", result.old.breakdown.hra],
                    ["LTA", "Leave travel allowance", result.old.breakdown.lta],
                    ["Sec 24(b)", "Home loan interest", result.old.breakdown.homeLoan],
                  ].map(([section, desc, amt]) => (
                    <tr key={section as string} className={Number(amt) === 0 ? "opacity-40" : ""}>
                      <td className="py-1.5 font-medium">{section}</td>
                      <td className="py-1.5 text-muted-foreground">{desc}</td>
                      <td className="py-1.5 text-right">{formatINR(Number(amt))}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="pt-3" colSpan={2}>Total Deductions</td>
                    <td className="pt-3 text-right">
                      {formatINR(result.old.stdDeduction + result.old.deductions)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* ── Slab Reference ────────────────────────────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Regime Tax Slabs (FY 2025-26)</CardTitle>
                <CardDescription>87A rebate: no tax if taxable income ≤ ₹7,00,000</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Income Range</th>
                      <th className="pb-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ["Up to ₹3,00,000", "Nil"],
                      ["₹3,00,001 – ₹7,00,000", "5%"],
                      ["₹7,00,001 – ₹10,00,000", "10%"],
                      ["₹10,00,001 – ₹12,00,000", "15%"],
                      ["₹12,00,001 – ₹15,00,000", "20%"],
                      ["Above ₹15,00,000", "30%"],
                    ].map(([range, rate]) => (
                      <tr key={range}>
                        <td className="py-1.5 text-muted-foreground">{range}</td>
                        <td className="py-1.5 text-right font-medium">{rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Old Regime Tax Slabs (FY 2025-26)</CardTitle>
                <CardDescription>87A rebate: no tax if taxable income ≤ ₹5,00,000</CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Income Range</th>
                      <th className="pb-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ["Up to ₹2,50,000", "Nil"],
                      ["₹2,50,001 – ₹5,00,000", "5%"],
                      ["₹5,00,001 – ₹10,00,000", "20%"],
                      ["Above ₹10,00,000", "30%"],
                    ].map(([range, rate]) => (
                      <tr key={range}>
                        <td className="py-1.5 text-muted-foreground">{range}</td>
                        <td className="py-1.5 text-right font-medium">{rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
