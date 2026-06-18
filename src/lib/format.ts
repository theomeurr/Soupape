// Locale-aware formatting helpers (fr-FR by default).

const LOCALE = 'fr-FR';

export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

/** Compact currency without decimals — for big headline figures. */
export function formatCurrencyShort(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value || 0);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);
}

export function formatKm(value: number): string {
  return `${formatNumber(Math.round(value))} km`;
}

export function formatLiters(value: number): string {
  return `${formatNumber(value, value >= 100 ? 0 : 1)} L`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short' }).format(d);
}

/** Parse a user-typed number, tolerating French comma decimals and spaces. */
export function parseNumber(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/\s/g, '').replace(',', '.');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function todayISO(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60_000).toISOString().slice(0, 10);
}
