import type { Reminder } from '../types';
import { formatNumber, todayISO } from './format';

export type ReminderStatus = 'overdue' | 'soon' | 'ok';

export interface ReminderDue {
  reminder: Reminder;
  status: ReminderStatus;
  progress: number; // 0..1+ (fraction of the interval elapsed, max of km/time)
  summary: string; // texte court, ex. « dans 2 300 km » ou « en retard de 12 j »
  nextOdometer?: number;
  nextDate?: string;
}

const DAY = 86_400_000;

function addMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T00:00:00').getTime();
  const b = new Date(toISO + 'T00:00:00').getTime();
  return Math.round((b - a) / DAY);
}

function kmSummary(remaining: number): string {
  return remaining >= 0
    ? `dans ${formatNumber(remaining)} km`
    : `en retard de ${formatNumber(-remaining)} km`;
}

function timeSummary(days: number): string {
  const abs = Math.abs(days);
  const txt = abs >= 60 ? `${Math.round(abs / 30)} mois` : `${abs} j`;
  return days >= 0 ? `dans ${txt}` : `en retard de ${txt}`;
}

export function reminderDue(
  reminder: Reminder,
  currentOdometer: number | null,
  today: string = todayISO(),
): ReminderDue {
  let kmProgress: number | null = null;
  let kmRemaining: number | null = null;
  let nextOdometer: number | undefined;
  if (reminder.intervalKm && reminder.anchorOdometer != null && currentOdometer != null) {
    nextOdometer = reminder.anchorOdometer + reminder.intervalKm;
    kmRemaining = nextOdometer - currentOdometer;
    kmProgress = (currentOdometer - reminder.anchorOdometer) / reminder.intervalKm;
  }

  let dateProgress: number | null = null;
  let daysRemaining: number | null = null;
  let nextDate: string | undefined;
  if (reminder.intervalMonths) {
    nextDate = addMonths(reminder.anchorDate, reminder.intervalMonths);
    daysRemaining = daysBetween(today, nextDate);
    const total = daysBetween(reminder.anchorDate, nextDate) || 1;
    dateProgress = (total - daysRemaining) / total;
  }

  // The limiting factor is whichever is further along (closer to / past due).
  const progress = Math.max(kmProgress ?? 0, dateProgress ?? 0);
  const overdue = (kmRemaining != null && kmRemaining < 0) || (daysRemaining != null && daysRemaining < 0);
  const status: ReminderStatus = overdue ? 'overdue' : progress >= 0.8 ? 'soon' : 'ok';

  let summary: string;
  if (kmProgress != null && (dateProgress == null || kmProgress >= dateProgress)) {
    summary = kmSummary(kmRemaining as number);
  } else if (daysRemaining != null) {
    summary = timeSummary(daysRemaining);
  } else {
    summary = 'intervalle non défini';
  }

  return { reminder, status, progress, summary, nextOdometer, nextDate };
}

const RANK: Record<ReminderStatus, number> = { overdue: 0, soon: 1, ok: 2 };

export function sortByUrgency(dues: ReminderDue[]): ReminderDue[] {
  return [...dues].sort((a, b) => RANK[a.status] - RANK[b.status] || b.progress - a.progress);
}
