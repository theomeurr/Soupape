import type { FuelEntry, MaintenanceCategory, MaintenanceEntry, MileageEntry } from '../types';
import { todayISO } from './format';

export interface OdoPoint {
  date: string;
  odometer: number;
}

/** Every odometer reading we know about (mileage logs + fuel fill-ups). */
export function odometerPoints(fuel: FuelEntry[], mileage: MileageEntry[]): OdoPoint[] {
  const pts: OdoPoint[] = [];
  for (const m of mileage) if (m.odometer > 0) pts.push({ date: m.date, odometer: m.odometer });
  for (const f of fuel) if (f.odometer > 0) pts.push({ date: f.date, odometer: f.odometer });
  return pts.sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer);
}

export interface MileageStats {
  total: number; // km between first and last reading
  thisMonth: number;
  thisYear: number;
  perMonth: number; // average km/month
  lastOdometer: number | null;
  readings: number;
}

export function mileageStats(points: OdoPoint[]): MileageStats {
  if (points.length === 0) {
    return { total: 0, thisMonth: 0, thisYear: 0, perMonth: 0, lastOdometer: null, readings: 0 };
  }
  const odos = points.map((p) => p.odometer);
  const total = Math.max(...odos) - Math.min(...odos);

  const nowM = todayISO().slice(0, 7);
  const nowY = todayISO().slice(0, 4);
  let thisMonth = 0;
  let thisYear = 0;
  for (let i = 1; i < points.length; i++) {
    const delta = points[i].odometer - points[i - 1].odometer;
    if (delta <= 0) continue;
    if (points[i].date.slice(0, 7) === nowM) thisMonth += delta;
    if (points[i].date.slice(0, 4) === nowY) thisYear += delta;
  }

  const first = new Date(points[0].date + 'T00:00:00');
  const last = new Date(points[points.length - 1].date + 'T00:00:00');
  const monthsSpan = Math.max(
    1,
    (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()),
  );

  return {
    total,
    thisMonth,
    thisYear,
    perMonth: total / monthsSpan,
    lastOdometer: Math.max(...odos),
    readings: points.length,
  };
}

export interface FuelStats {
  fillUps: number;
  totalLiters: number;
  totalCost: number;
  avgPricePerLiter: number;
  avgConsumption: number | null; // L/100km, full-to-full method
  lastConsumption: number | null;
  distanceCovered: number;
}

export function fuelStats(fuel: FuelEntry[]): FuelStats {
  const totalLiters = fuel.reduce((s, f) => s + f.liters, 0);
  const totalCost = fuel.reduce((s, f) => s + f.totalCost, 0);

  const sorted = fuel
    .filter((f) => f.odometer > 0)
    .sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date));

  let prevFullOdo: number | null = null;
  let segLiters = 0;
  let consDist = 0;
  let consLiters = 0;
  let last: number | null = null;
  for (const f of sorted) {
    if (prevFullOdo !== null) segLiters += f.liters;
    if (f.fullTank) {
      if (prevFullOdo !== null && f.odometer > prevFullOdo) {
        const dist = f.odometer - prevFullOdo;
        consDist += dist;
        consLiters += segLiters;
        last = (segLiters / dist) * 100;
      }
      prevFullOdo = f.odometer;
      segLiters = 0;
    }
  }

  const distanceCovered = sorted.length >= 2 ? sorted[sorted.length - 1].odometer - sorted[0].odometer : 0;

  return {
    fillUps: fuel.length,
    totalLiters,
    totalCost,
    avgPricePerLiter: totalLiters > 0 ? totalCost / totalLiters : 0,
    avgConsumption: consDist > 0 ? (consLiters / consDist) * 100 : null,
    lastConsumption: last,
    distanceCovered,
  };
}

export interface MaintenanceStats {
  total: number;
  count: number;
  thisYear: number;
  byCategory: { category: MaintenanceCategory; total: number }[];
}

export function maintenanceStats(items: MaintenanceEntry[]): MaintenanceStats {
  const nowY = todayISO().slice(0, 4);
  const total = items.reduce((s, m) => s + m.cost, 0);
  const thisYear = items.filter((m) => m.date.slice(0, 4) === nowY).reduce((s, m) => s + m.cost, 0);

  const map = new Map<MaintenanceCategory, number>();
  for (const m of items) map.set(m.category, (map.get(m.category) ?? 0) + m.cost);
  const byCategory = [...map.entries()]
    .map(([category, t]) => ({ category, total: t }))
    .sort((a, b) => b.total - a.total);

  return { total, count: items.length, thisYear, byCategory };
}

/** Consumption (L/100km) per closed full-to-full segment, dated at the closing fill-up. */
export function consumptionSeries(fuel: FuelEntry[]): { date: string; value: number }[] {
  const sorted = fuel
    .filter((f) => f.odometer > 0)
    .sort((a, b) => a.odometer - b.odometer || a.date.localeCompare(b.date));
  const out: { date: string; value: number }[] = [];
  let prevFullOdo: number | null = null;
  let segLiters = 0;
  for (const f of sorted) {
    if (prevFullOdo !== null) segLiters += f.liters;
    if (f.fullTank) {
      if (prevFullOdo !== null && f.odometer > prevFullOdo) {
        out.push({ date: f.date, value: (segLiters / (f.odometer - prevFullOdo)) * 100 });
      }
      prevFullOdo = f.odometer;
      segLiters = 0;
    }
  }
  return out;
}

/** Running cost per km, combining fuel and maintenance over the known distance. */
export function costPerKm(fuelTotal: number, maintenanceTotal: number, distance: number) {
  if (distance <= 0) return { fuel: null as number | null, maintenance: null as number | null, total: null as number | null };
  return {
    fuel: fuelTotal / distance,
    maintenance: maintenanceTotal / distance,
    total: (fuelTotal + maintenanceTotal) / distance,
  };
}
