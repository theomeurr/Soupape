import type { CSSProperties } from 'react';
import type { ReminderDue } from '../lib/reminders';

const STATUS_COLOR: Record<ReminderDue['status'], string> = {
  overdue: '#FF3B30',
  soon: '#FF9500',
  ok: '#34C759',
};

export function ReminderCard({ due, onClick }: { due: ReminderDue; onClick: () => void }) {
  const color = STATUS_COLOR[due.status];
  const pct = Math.max(4, Math.min(100, Math.round(due.progress * 100)));
  return (
    <button type="button" className="reminder" onClick={onClick} style={{ '--rc': color } as CSSProperties}>
      <div className="reminder-top">
        <span className="reminder-title">{due.reminder.title}</span>
        <span className="reminder-summary">{due.summary}</span>
      </div>
      <span className="reminder-cat">{due.reminder.category}</span>
      <div className="reminder-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}
