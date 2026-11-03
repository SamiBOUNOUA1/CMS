// Single money formatter for the app: "1 234,50 €" (French number style).

const formatters = new Map<number, Intl.NumberFormat>();

function numberFormat(decimals: number) {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    formatters.set(decimals, f);
  }
  return f;
}

/** Formats an amount; missing values show as 0. */
export function formatMoney(n: number | null | undefined, cur = '€', decimals = 2): string {
  return numberFormat(decimals).format(Number(n) || 0) + ' ' + cur;
}

/** Like formatMoney, but missing values show as "—". */
export function formatMoneyOrDash(n: number | null | undefined, cur = '€', decimals = 2): string {
  return n == null ? '—' : formatMoney(n, cur, decimals);
}
