export function formatCurrency(
  amount: number,
  opts?: { whole?: boolean },
): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: opts?.whole ? 0 : 2,
  }).format(amount);
}
