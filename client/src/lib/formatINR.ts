export function formatINR(value: number, showSymbol = true): string {
  const formatter = new Intl.NumberFormat("en-IN", {
    ...(showSymbol && { style: "currency", currency: "INR" }),
    maximumFractionDigits: 0,
  });
  return formatter.format(value);
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[₹,\s]/g, "")) || 0;
}
