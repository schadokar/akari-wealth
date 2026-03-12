export interface AmortRow {
  month: number;
  interest: number;
  principal: number;
  balance: number;
}

export function computeAmortization(
  principal: number,
  annualRate: number,
  emi: number,
  tenure: number
): AmortRow[] {
  const r = annualRate / 12 / 100;
  let rem = principal;
  const rows: AmortRow[] = [];
  for (let m = 1; m <= tenure; m++) {
    const interest = rem * r;
    const p = Math.min(Math.max(emi - interest, 0), rem);
    rem = Math.max(rem - p, 0);
    rows.push({ month: m, interest, principal: p, balance: rem });
    if (rem < 0.5) break;
  }
  return rows;
}

/**
 * Returns total interest paid and principal paid within a financial year.
 * fyEndYear=2026 means FY 2025-26 (April 2025 – March 2026).
 * loanStartDate is the date of the first EMI ("YYYY-MM-DD").
 */
export function calcFYLoanSummary(
  principal: number,
  annualRate: number,
  emi: number,
  tenure: number,
  loanStartDate: string,
  fyEndYear: number
): { interestPaid: number; principalPaid: number } {
  const rows = computeAmortization(principal, annualRate, emi, tenure);

  const [sy, sm] = loanStartDate.split("-").map(Number);
  // FY months: April (fyEndYear-1) through March (fyEndYear)
  const fyMonths: { year: number; month: number }[] = [];
  for (let m = 4; m <= 12; m++) fyMonths.push({ year: fyEndYear - 1, month: m });
  for (let m = 1; m <= 3; m++) fyMonths.push({ year: fyEndYear, month: m });

  let interestPaid = 0;
  let principalPaid = 0;

  for (const { year, month } of fyMonths) {
    const idx = (year - sy) * 12 + (month - sm);
    if (idx < 0 || idx >= rows.length) continue;
    interestPaid += rows[idx].interest;
    principalPaid += rows[idx].principal;
  }

  return { interestPaid, principalPaid };
}
