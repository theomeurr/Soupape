import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { INSURANCE_TYPES, type InsuranceEntry, type InsuranceType } from '../types';
import { aggregate, type Period } from '../lib/date';
import {
  formatCurrency,
  formatCurrencyShort,
  formatDate,
  formatDateShort,
  parseNumber,
  todayISO,
} from '../lib/format';
import { BarChart } from '../components/Charts';
import { BottomSheet } from '../components/BottomSheet';
import { PageHeader, Section, Row, Fab } from '../components/Page';
import { Button, Field, Input, Segmented, Select, Stat, StatGrid, EmptyState } from '../components/UI';
import { PhotoPicker } from '../components/PhotoPicker';
import { IconShield, IconTrash } from '../components/Icons';

const ACCENT = '#30B0C7';

const PERIODS: { value: number; label: string }[] = [
  { value: 1, label: 'Mensuel' },
  { value: 3, label: 'Trimestriel' },
  { value: 6, label: 'Semestriel' },
  { value: 12, label: 'Annuel' },
];

const periodLabel = (m?: number) => PERIODS.find((p) => p.value === m)?.label ?? '';

interface InsuranceForm {
  date: string;
  amount: string;
  insurer: string;
  formula: InsuranceType;
  periodMonths: string;
  renewalDate: string;
  note: string;
  photos: string[];
}

const emptyForm = (): InsuranceForm => ({
  date: todayISO(),
  amount: '',
  insurer: '',
  formula: 'Tous risques',
  periodMonths: '12',
  renewalDate: '',
  note: '',
  photos: [],
});

export function InsurancePage() {
  const { data, add, update, remove } = useStore();
  const items = data.insurance;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InsuranceForm>(emptyForm);
  const [chartOpen, setChartOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('year');

  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)), [items]);
  const nowY = todayISO().slice(0, 4);

  const total = items.reduce((s, e) => s + e.amount, 0);
  const thisYear = items.filter((e) => e.date.slice(0, 4) === nowY).reduce((s, e) => s + e.amount, 0);
  const latest = sorted[0];
  const monthlyCost = latest ? latest.amount / (latest.periodMonths || 12) : 0;
  const renewal = sorted.find((e) => e.renewalDate)?.renewalDate;
  const renewalDays = renewal ? Math.round((new Date(renewal + 'T00:00:00').getTime() - Date.now()) / 86_400_000) : null;

  const chartData = useMemo(() => aggregate(items, (e) => e.date, (e) => e.amount, period), [items, period]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(e: InsuranceEntry) {
    setEditingId(e.id);
    setForm({
      date: e.date,
      amount: String(e.amount),
      insurer: e.insurer ?? '',
      formula: e.formula ?? 'Tous risques',
      periodMonths: String(e.periodMonths ?? 12),
      renewalDate: e.renewalDate ?? '',
      note: e.note ?? '',
      photos: e.photos ?? [],
    });
    setSheetOpen(true);
  }

  function submit() {
    const amount = parseNumber(form.amount);
    if (amount <= 0) return;
    const payload: Omit<InsuranceEntry, 'id'> = {
      date: form.date,
      amount,
      insurer: form.insurer.trim() || undefined,
      formula: form.formula,
      periodMonths: parseNumber(form.periodMonths) || 12,
      renewalDate: form.renewalDate || undefined,
      note: form.note.trim() || undefined,
      photos: form.photos.length ? form.photos : undefined,
    };
    if (editingId) update('insurance', editingId, payload);
    else add('insurance', payload);
    setSheetOpen(false);
  }

  function del() {
    if (editingId) remove('insurance', editingId);
    setSheetOpen(false);
  }

  return (
    <>
      <PageHeader title="Assurance" subtitle="Cotisations & échéances" onChart={() => setChartOpen(true)} />

      <Section>
        <StatGrid>
          <Stat label="Coût / mois" value={monthlyCost ? formatCurrency(monthlyCost) : '—'} accent />
          <Stat
            label="Prochaine échéance"
            value={renewal ? formatDateShort(renewal) : '—'}
            sub={renewalDays != null ? (renewalDays >= 0 ? `dans ${renewalDays} j` : 'à renouveler') : undefined}
          />
          <Stat label="Cette année" value={formatCurrencyShort(thisYear)} />
          <Stat label="Total payé" value={formatCurrencyShort(total)} sub={latest?.insurer} />
        </StatGrid>
      </Section>

      <Section title="Paiements">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IconShield size={30} />}
            title="Aucune cotisation"
            message="Enregistre ta prime d'assurance (mensuelle ou annuelle) avec le bouton +."
          />
        ) : (
          <div className="list">
            {sorted.map((e) => (
              <Row
                key={e.id}
                title={e.insurer || e.formula || 'Assurance'}
                subtitle={`${e.formula ?? ''}${e.formula ? ' · ' : ''}${formatDate(e.date)}${
                  e.renewalDate ? ' · échéance ' + formatDateShort(e.renewalDate) : ''
                }${e.photos?.length ? ' · 📎' + e.photos.length : ''}`}
                value={formatCurrency(e.amount)}
                meta={periodLabel(e.periodMonths)}
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
        title={editingId ? 'Modifier la cotisation' : 'Nouvelle cotisation'}
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
            <Field label="Montant">
              <Input
                inputMode="decimal"
                placeholder="60"
                suffix="€"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Assureur">
              <Input
                placeholder="MAIF, AXA…"
                value={form.insurer}
                onChange={(e) => setForm({ ...form, insurer: e.target.value })}
              />
            </Field>
            <Field label="Formule">
              <Select
                value={form.formula}
                onChange={(e) => setForm({ ...form, formula: e.target.value as InsuranceType })}
              >
                {INSURANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Périodicité">
              <Select value={form.periodMonths} onChange={(e) => setForm({ ...form, periodMonths: e.target.value })}>
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Échéance" hint="renouvellement">
              <Input
                type="date"
                value={form.renewalDate}
                onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Note">
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Field label="Pièces jointes" hint="contrat, attestation… (photo ou PDF)">
            <PhotoPicker value={form.photos} onChange={(photos) => setForm({ ...form, photos })} />
          </Field>
          <Button onClick={submit}>{editingId ? 'Enregistrer' : 'Ajouter la cotisation'}</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={chartOpen} onClose={() => setChartOpen(false)} title="Assurance — évolution">
        <div className="chart-sheet" style={{ color: ACCENT }}>
          <p className="chart-caption">Cotisations par {period === 'month' ? 'mois' : 'an'}</p>
          <div className="chart-card">
            {chartData.length === 0 || chartData.every((d) => d.value === 0) ? (
              <p className="chart-empty">Pas encore de cotisation enregistrée.</p>
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
        </div>
      </BottomSheet>
    </>
  );
}
