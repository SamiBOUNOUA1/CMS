// VAT (TVA) math shared by quotes and invoices.
//
// Plain module (no server-only imports) so it is usable from models, route
// handlers and client components alike.
//
// Morocco (CGI art. 99, after the 2024 reform): from 2026 only two rates remain,
// 20% (standard) and 10% (reduced — e.g. restauration). 0 covers exempt /
// auto-entrepreneur invoices. Rates are stored as fractions (0.2 = 20%).

export const VAT_RATES = [0.2, 0.1, 0] as const;

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface VatLine {
  totalHT: number;
  vatRate: number;
}

export interface VatBucket {
  rate: number;
  base: number;   // taxable base after the discount share
  amount: number; // VAT for this rate
}

/**
 * Groups lines by VAT rate, spreading a global discount (HT) across the lines in
 * proportion to their amount, then computes VAT per rate (rounded per rate, as
 * shown on the invoice). Returns buckets sorted by rate descending.
 */
export function computeVatBreakdown(lines: VatLine[], discountHT = 0): VatBucket[] {
  const gross = lines.reduce((s, l) => s + (Number(l.totalHT) || 0), 0);
  const discount = Math.min(Math.max(Number(discountHT) || 0, 0), gross);
  const factor = gross > 0 ? (gross - discount) / gross : 0;

  const byRate = new Map<number, number>();
  for (const l of lines) {
    const rate = Number(l.vatRate) || 0;
    byRate.set(rate, (byRate.get(rate) || 0) + (Number(l.totalHT) || 0) * factor);
  }

  // Round bases, then push any rounding remainder onto the largest bucket so the
  // bases always add up exactly to (gross − discount).
  const buckets = [...byRate.entries()]
    .map(([rate, base]) => ({ rate, base: round2(base), amount: 0 }))
    .sort((a, b) => b.rate - a.rate);
  const target = round2(gross - discount);
  const diff = round2(target - buckets.reduce((s, b) => s + b.base, 0));
  if (diff !== 0 && buckets.length) {
    const largest = buckets.reduce((m, b) => (b.base > m.base ? b : m), buckets[0]);
    largest.base = round2(largest.base + diff);
  }
  for (const b of buckets) b.amount = round2(b.base * b.rate);
  return buckets;
}

export function totalsFromBreakdown(buckets: VatBucket[]) {
  const totalHT = round2(buckets.reduce((s, b) => s + b.base, 0));
  const totalVAT = round2(buckets.reduce((s, b) => s + b.amount, 0));
  return { totalHT, totalVAT, totalTTC: round2(totalHT + totalVAT) };
}

export const formatRate = (rate: number): string =>
  `${(Math.round(rate * 1000) / 10).toString().replace('.', ',')} %`;
