import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { MAINTENANCE_CATEGORIES, type MaintenanceCategory, type MaintenanceEntry } from '../types';
import { maintenanceStats, odometerPoints, mileageStats } from '../lib/stats';
import { aggregate, type Period } from '../lib/date';
import {
  formatCurrency,
  formatCurrencyShort,
  formatDate,
  formatKm,
  parseNumber,
  todayISO,
} from '../lib/format';
import { BarChart } from '../components/Charts';
import { BottomSheet } from '../components/BottomSheet';
import { PageHeader, Section, Row, Fab } from '../components/Page';
import { Button, Field, Input, Segmented, Select, Stat, StatGrid, EmptyState } from '../components/UI';
import { IconWrench, IconTrash } from '../components/Icons';
import { Reminders } from '../components/Reminders';
import { PhotoPicker } from '../components/PhotoPicker';

const ACCENT = '#AF52DE';

interface MaintForm {
  date: string;
  category: MaintenanceCategory;
  title: string;
  cost: string;
  odometer: string;
  garage: string;
  note: string;
  photos: string[];
}

const emptyForm = (): MaintForm => ({
  date: todayISO(),
  category: 'Vidange',
  title: '',
  cost: '',
  odometer: '',
  garage: '',
  note: '',
  photos: [],
});

export function MaintenancePage() {
  const { data, add, update, remove } = useStore();
  const items = data.maintenance;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaintForm>(emptyForm);
  const [chartOpen, setChartOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('year');

  const stats = useMemo(() => maintenanceStats(items), [items]);
  const distance = useMemo(() => mileageStats(odometerPoints(data.fuel, data.mileage)).total, [data.fuel, data.mileage]);
  const perKm = distance > 0 ? stats.total / distance : null;

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.date.localeCompare(a.date)),
    [items],
  );
  const chartData = useMemo(
    () => aggregate(items, (m) => m.date, (m) => m.cost, period),
    [items, period],
  );
  const maxCat = stats.byCategory[0]?.total ?? 1;

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm(), odometer: '' });
    setSheetOpen(true);
  }

  function openEdit(e: MaintenanceEntry) {
    setEditingId(e.id);
    setForm({
      date: e.date,
      category: e.category,
      title: e.title,
      cost: String(e.cost),
      odometer: e.odometer ? String(e.odometer) : '',
      garage: e.garage ?? '',
      note: e.note ?? '',
      photos: e.photos ?? [],
    });
    setSheetOpen(true);
  }

  function submit() {
    const cost = parseNumber(form.cost);
    if (cost < 0) return;
    const payload: Omit<MaintenanceEntry, 'id'> = {
      date: form.date,
      category: form.category,
      title: form.title.trim() || form.category,
      cost,
      odometer: form.odometer ? parseNumber(form.odometer) : undefined,
      garage: form.garage.trim() || undefined,
      note: form.note.trim() || undefined,
      photos: form.photos.length ? form.photos : undefined,
    };
    if (editingId) update('maintenance', editingId, payload);
    else add('maintenance', payload);
    setSheetOpen(false);
  }

  function del() {
    if (editingId) remove('maintenance', editingId);
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader title="Entretien" subtitle="Frais & interventions" onChart={() => setChartOpen(true)} />

      <Section>
        <StatGrid>
          <Stat label="Total dépensé" value={formatCurrencyShort(stats.total)} accent />
          <Stat label="Cette année" value={formatCurrencyShort(stats.thisYear)} />
          <Stat label="Interventions" value={stats.count} />
          <Stat label="Coût / km" value={perKm != null ? `${perKm.toFixed(2).replace('.', ',')} €` : '—'} sub="entretien" />
        </StatGrid>
      </Section>

      <Reminders />

      <Section title="Interventions">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IconWrench size={30} />}
            title="Aucune intervention"
            message="Enregistre une vidange, des pneus, une révision… avec le bouton +."
          />
        ) : (
          <div className="list">
            {sorted.map((e) => (
              <Row
                key={e.id}
                title={e.title}
                subtitle={`${e.category} · ${formatDate(e.date)}${e.garage ? ' · ' + e.garage : ''}${
                  e.photos?.length ? ' · 📷' + e.photos.length : ''
                }`}
                value={formatCurrency(e.cost)}
                meta={e.odometer ? formatKm(e.odometer) : undefined}
                onClick={() => openEdit(e)}
              />
            ))}
          </div>
        )}
      </Section>

      <Fab onClick={openAdd} />

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? "Modifier l'intervention" : 'Nouvelle intervention'}
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
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
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
          <Field label="Intitulé">
            <Input
              placeholder="Vidange + filtre à huile"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <div className="form-row">
            <Field label="Coût">
              <Input
                inputMode="decimal"
                placeholder="120"
                suffix="€"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </Field>
            <Field label="Compteur" hint="optionnel">
              <Input
                inputMode="numeric"
                placeholder="123456"
                suffix="km"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Garage">
            <Input
              placeholder="Optionnel"
              value={form.garage}
              onChange={(e) => setForm({ ...form, garage: e.target.value })}
            />
          </Field>
          <Field label="Factures / photos">
            <PhotoPicker value={form.photos} onChange={(photos) => setForm({ ...form, photos })} />
          </Field>
          <Button onClick={submit}>{editingId ? 'Enregistrer' : "Ajouter l'intervention"}</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={chartOpen} onClose={() => setChartOpen(false)} title="Entretien — évolution">
        <div className="chart-sheet" style={{ color: ACCENT }}>
          <p className="chart-caption">Dépenses par {period === 'month' ? 'mois' : 'an'}</p>
          <div className="chart-card">
            {chartData.length === 0 || chartData.every((d) => d.value === 0) ? (
              <p className="chart-empty">Pas encore de dépenses enregistrées.</p>
            ) : (
              <BarChart data={chartData} color={ACCENT} formatValue={(v) => formatCurrencyShort(v)} />
            )}
          </div>
          <div className="period-toggle">
            <Segmented
              options={[
                { value: 'month', label: 'Mois' },
                { value: 'year', label: 'Année' },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </div>

          {stats.byCategory.length > 0 && (
            <div className="breakdown">
              <h3 className="breakdown-title">Répartition</h3>
              {stats.byCategory.map((c) => (
                <div className="breakdown-row" key={c.category}>
                  <span className="breakdown-label">{c.category}</span>
                  <span className="breakdown-bar">
                    <span style={{ width: `${(c.total / maxCat) * 100}%`, background: ACCENT }} />
                  </span>
                  <span className="breakdown-value">{formatCurrencyShort(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
