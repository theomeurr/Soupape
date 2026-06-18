// Time-bucketing helpers for charts.

export type Period = 'month' | 'year';

export interface Bucket {
  key: string;
  label: string;
  value: number;
  count: number;
}

const MONTHS_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

function monthLabel(year: number, month: number): string {
  // Show the year only on January to keep the axis readable.
  return month === 0 ? `${MONTHS_SHORT[month]} ${String(year).slice(2)}` : MONTHS_SHORT[month];
}

/** Continuous list of the last `n` months up to (and including) the current one. */
function lastNMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: monthLabel(d.getFullYear(), d.getMonth()) });
  }
  return out;
}

function yearRange(years: number[]): { key: string; label: string }[] {
  if (years.length === 0) return [];
  const min = Math.min(...years);
  const max = Math.max(...years);
  const out: { key: string; label: string }[] = [];
  for (let y = min; y <= max; y++) out.push({ key: String(y), label: String(y) });
  return out;
}

interface AggregateOptions {
  months?: number; // for 'month' period, how many to show (default 12)
  average?: boolean; // average instead of sum (e.g. price/L)
}

/**
 * Bucket entries by month or year. Empty buckets are kept (value 0) so the
 * chart axis stays continuous. With `average`, empty buckets are dropped.
 */
export function aggregate<T>(
  entries: T[],
  getDate: (e: T) => string,
  getValue: (e: T) => number,
  period: Period,
  options: AggregateOptions = {},
): Bucket[] {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const e of entries) {
    const iso = getDate(e);
    if (!iso) continue;
    const key = period === 'month' ? iso.slice(0, 7) : iso.slice(0, 4);
    const acc = sums.get(key) ?? { sum: 0, count: 0 };
    acc.sum += getValue(e);
    acc.count += 1;
    sums.set(key, acc);
  }

  let axis: { key: string; label: string }[];
  if (period === 'month') {
    axis = lastNMonths(options.months ?? 12);
  } else {
    const years = entries.map((e) => Number(getDate(e).slice(0, 4))).filter((y) => !Number.isNaN(y));
    axis = yearRange(years);
  }

  const buckets = axis.map(({ key, label }) => {
    const acc = sums.get(key);
    const count = acc?.count ?? 0;
    const value = !acc ? 0 : options.average ? (count ? acc.sum / count : 0) : acc.sum;
    return { key, label, value, count };
  });

  if (options.average) return buckets.filter((b) => b.count > 0);
  return buckets;
}
