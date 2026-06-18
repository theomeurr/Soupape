import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { MAINTENANCE_CATEGORIES, type MaintenanceCategory, type Reminder } from '../types';
import { mileageStats, odometerPoints } from '../lib/stats';
import { reminderDue, sortByUrgency } from '../lib/reminders';
import { parseNumber, todayISO } from '../lib/format';
import { BottomSheet } from './BottomSheet';
import { ReminderCard } from './ReminderCard';
import { Button, Field, Input, Select } from './UI';
import { IconBell, IconCheck, IconPlus, IconTrash } from './Icons';

interface RForm {
  title: string;
  category: MaintenanceCategory;
  intervalKm: string;
  intervalMonths: string;
  anchorDate: string;
  anchorOdometer: string;
  note: string;
}

export function Reminders() {
  const { data, add, update, remove } = useStore();
  const currentOdometer = useMemo(
    () => mileageStats(odometerPoints(data.fuel, data.mileage)).lastOdometer,
    [data.fuel, data.mileage],
  );
  const dues = useMemo(
    () => sortByUrgency(data.reminders.map((r) => reminderDue(r, currentOdometer))),
    [data.reminders, currentOdometer],
  );

  const empty = (): RForm => ({
    title: '',
    category: 'Vidange',
    intervalKm: '10000',
    intervalMonths: '12',
    anchorDate: todayISO(),
    anchorOdometer: currentOdometer != null ? String(currentOdometer) : '',
    note: '',
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RForm>(empty);

  function openAdd() {
    setEditingId(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(r: Reminder) {
    setEditingId(r.id);
    setForm({
      title: r.title,
      category: r.category,
      intervalKm: r.intervalKm ? String(r.intervalKm) : '',
      intervalMonths: r.intervalMonths ? String(r.intervalMonths) : '',
      anchorDate: r.anchorDate,
      anchorOdometer: r.anchorOdometer != null ? String(r.anchorOdometer) : '',
      note: r.note ?? '',
    });
    setOpen(true);
  }

  function submit() {
    const intervalKm = parseNumber(form.intervalKm);
    const intervalMonths = parseNumber(form.intervalMonths);
    if (intervalKm <= 0 && intervalMonths <= 0) return;
    const anchorOdometer = parseNumber(form.anchorOdometer);
    const payload: Omit<Reminder, 'id'> = {
      title: form.title.trim() || form.category,
      category: form.category,
      intervalKm: intervalKm > 0 ? intervalKm : undefined,
      intervalMonths: intervalMonths > 0 ? intervalMonths : undefined,
      anchorDate: form.anchorDate,
      anchorOdometer: anchorOdometer > 0 ? anchorOdometer : undefined,
      note: form.note.trim() || undefined,
    };
    if (editingId) update('reminders', editingId, payload);
    else add('reminders', payload);
    setOpen(false);
  }

  function markDone() {
    if (!editingId) return;
    const odo = currentOdometer ?? (parseNumber(form.anchorOdometer) || undefined);
    update('reminders', editingId, { anchorDate: todayISO(), anchorOdometer: odo });
    setOpen(false);
  }

  function del() {
    if (editingId) remove('reminders', editingId);
    setOpen(false);
  }

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">À venir</h2>
        <button type="button" className="section-add" onClick={openAdd}>
          <IconPlus size={15} /> Rappel
        </button>
      </div>

      {dues.length === 0 ? (
        <button type="button" className="reminder-empty" onClick={openAdd}>
          <IconBell size={18} />
          <span>Ajoute un rappel — ex. « Vidange tous les 10 000 km ou 12 mois ».</span>
        </button>
      ) : (
        <div className="reminders">
          {dues.map((d) => (
            <ReminderCard key={d.reminder.id} due={d} onClick={() => openEdit(d.reminder)} />
          ))}
        </div>
      )}

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? 'Modifier le rappel' : 'Nouveau rappel'}
        headerAction={
          editingId ? (
            <button type="button" className="icon-btn danger" onClick={del} aria-label="Supprimer">
              <IconTrash size={20} />
            </button>
          ) : undefined
        }
      >
        <div className="form">
          <div className="form-row">
            <Field label="Intitulé">
              <Input
                placeholder="Vidange"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Catégorie">
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as MaintenanceCategory })}
              >
                {MAINTENANCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Tous les" hint="distance">
              <Input
                inputMode="numeric"
                placeholder="10000"
                suffix="km"
                value={form.intervalKm}
                onChange={(e) => setForm({ ...form, intervalKm: e.target.value })}
              />
            </Field>
            <Field label="ou tous les" hint="temps">
              <Input
                inputMode="numeric"
                placeholder="12"
                suffix="mois"
                value={form.intervalMonths}
                onChange={(e) => setForm({ ...form, intervalMonths: e.target.value })}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Dernier fait le">
              <Input
                type="date"
                value={form.anchorDate}
                onChange={(e) => setForm({ ...form, anchorDate: e.target.value })}
              />
            </Field>
            <Field label="à" hint="compteur">
              <Input
                inputMode="numeric"
                placeholder="123456"
                suffix="km"
                value={form.anchorOdometer}
                onChange={(e) => setForm({ ...form, anchorOdometer: e.target.value })}
              />
            </Field>
          </div>
          {editingId && (
            <Button variant="ghost" onClick={markDone}>
              <IconCheck size={18} /> Marquer comme fait aujourd'hui
            </Button>
          )}
          <Button onClick={submit}>{editingId ? 'Enregistrer' : 'Ajouter le rappel'}</Button>
        </div>
      </BottomSheet>
    </section>
  );
}
