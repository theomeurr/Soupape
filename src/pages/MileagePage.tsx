import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import type { MileageEntry } from '../types';
import { mileageStats, odometerPoints } from '../lib/stats';
import { aggregate, type Period } from '../lib/date';
import { formatCurrency, formatKm, formatDate, formatNumber, parseNumber, todayISO } from '../lib/format';
import { baremeKm, type CvBracket } from '../lib/baremeKm';
import { BarChart } from '../components/Charts';
import { BottomSheet } from '../components/BottomSheet';
import { BaremeSheet } from '../components/BaremeSheet';
import { PageHeader, Section, Row, Fab } from '../components/Page';
import { Button, Field, Input, Segmented, Stat, StatGrid, EmptyState } from '../components/UI';
import { IconGauge, IconTrash, IconCalc, IconChevron } from '../components/Icons';

const ACCENT = '#007AFF';

interface MileageForm {
  date: string;
  odometer: string;
  note: string;
}

const emptyForm = (): MileageForm => ({ date: todayISO(), odometer: '', note: '' });

export function MileagePage() {
  const { data, add, update, remove } = useStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MileageForm>(emptyForm);
  const [chartOpen, setChartOpen] = useState(false);
  const [baremeOpen, setBaremeOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  const points = useMemo(() => odometerPoints(data.fuel, data.mileage), [data.fuel, data.mileage]);
  const stats = useMemo(() => mileageStats(points), [points]);
  const sorted = useMemo(
    () => [...data.mileage].sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer),
    [data.mileage],
  );

  const chartData = useMemo(() => {
    const segments: { date: string; value: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      const delta = points[i].odometer - points[i - 1].odometer;
      if (delta > 0) segments.push({ date: points[i].date, value: delta });
    }
    return aggregate(segments, (s) => s.date, (s) => s.value, period);
  }, [points, period]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm(), odometer: stats.lastOdometer ? String(stats.lastOdometer) : '' });
    setSheetOpen(true);
  }

  function openEdit(e: MileageEntry) {
    setEditingId(e.id);
    setForm({ date: e.date, odometer: String(e.odometer), note: e.note ?? '' });
    setSheetOpen(true);
  }

  function submit() {
    const odometer = parseNumber(form.odometer);
    if (odometer <= 0) return;
    const payload: Omit<MileageEntry, 'id'> = {
      date: form.date,
      odometer,
      note: form.note.trim() || undefined,
    };
    if (editingId) update('mileage', editingId, payload);
    else add('mileage', payload);
    setSheetOpen(false);
  }

  function del() {
    if (editingId) remove('mileage', editingId);
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader title="Kilométrage" subtitle="Relevés du compteur" onChart={() => setChartOpen(true)} />

      <Section>
        <StatGrid>
          <Stat
            label="Compteur actuel"
            value={stats.lastOdometer != null ? formatKm(stats.lastOdometer) : '—'}
            accent
          />
          <Stat label="Distance suivie" value={formatKm(stats.total)} sub={`${stats.readings} relevés`} />
          <Stat label="Cette année" value={formatKm(stats.thisYear)} />
          <Stat label="Moyenne / mois" value={formatKm(stats.perMonth)} />
        </StatGrid>
      </Section>

      <Section>
        <button type="button" className="row tool-row" onClick={() => setBaremeOpen(true)}>
          <span className="tool-icon">
            <IconCalc size={20} />
          </span>
          <div className="row-main">
            <span className="row-title">Barème kilométrique</span>
            <span className="row-subtitle">Indemnités km (impôts) · cette année</span>
          </div>
          <span className="row-value">
            {formatCurrency(
              baremeKm((data.settings.fiscalCv as CvBracket) || '5', stats.thisYear, data.settings.isElectric ?? false),
            )}
          </span>
          <IconChevron size={18} className="row-chevron" />
        </button>
      </Section>

      <Section title="Relevés">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IconGauge size={30} />}
            title="Aucun relevé"
            message="Note le kilométrage de ton compteur avec le bouton +."
          />
        ) : (
          <div className="list">
            {sorted.map((e, i) => {
              const next = sorted[i + 1];
              const delta = next ? e.odometer - next.odometer : null;
              return (
                <Row
                  key={e.id}
                  title={formatDate(e.date)}
                  subtitle={e.note}
                  value={formatKm(e.odometer)}
                  meta={delta && delta > 0 ? `+${formatNumber(delta)} km` : undefined}
                  onClick={() => openEdit(e)}
                />
              );
            })}
          </div>
        )}
      </Section>

      <Fab onClick={openAdd} />

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Modifier le relevé' : 'Nouveau relevé'}
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
            <Field label="Compteur">
              <Input
                inputMode="numeric"
                placeholder="123456"
                suffix="km"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Note">
            <Input
              placeholder="Optionnel"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>
          <Button onClick={submit}>{editingId ? 'Enregistrer' : 'Ajouter le relevé'}</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={chartOpen} onClose={() => setChartOpen(false)} title="Kilométrage — évolution">
        <div className="chart-sheet" style={{ color: ACCENT }}>
          <p className="chart-caption">Distance parcourue par {period === 'month' ? 'mois' : 'an'}</p>
          <div className="chart-card">
            {chartData.length === 0 || chartData.every((d) => d.value === 0) ? (
              <p className="chart-empty">Ajoute au moins deux relevés pour voir l'évolution.</p>
            ) : (
              <BarChart data={chartData} color={ACCENT} formatValue={(v) => formatNumber(v)} />
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
        </div>
      </BottomSheet>

      <BaremeSheet open={baremeOpen} onClose={() => setBaremeOpen(false)} />
    </>
  );
}
