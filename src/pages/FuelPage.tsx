import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { FUEL_TYPES, type FuelEntry, type FuelType } from '../types';
import { fuelStats, consumptionSeries } from '../lib/stats';
import { aggregate, type Period } from '../lib/date';
import {
  formatCurrency,
  formatCurrencyShort,
  formatDate,
  formatLiters,
  formatNumber,
  parseNumber,
  todayISO,
} from '../lib/format';
import { BarChart, LineChart } from '../components/Charts';
import { BottomSheet } from '../components/BottomSheet';
import { StationsSheet } from '../components/StationsSheet';
import { API_TO_FUELTYPE, type ApiFuelKey, type Station } from '../lib/fuelPrices';
import { PageHeader, Section, Row, Fab } from '../components/Page';
import { Button, Field, Input, Segmented, Select, Stat, StatGrid, EmptyState } from '../components/UI';
import { IconFuel, IconTrash, IconPin, IconChevron } from '../components/Icons';

const ACCENT = '#FF9500';

interface FuelForm {
  date: string;
  odometer: string;
  liters: string;
  pricePerLiter: string;
  totalCost: string;
  fullTank: boolean;
  fuelType: FuelType;
  station: string;
  note: string;
}

const emptyForm = (): FuelForm => ({
  date: todayISO(),
  odometer: '',
  liters: '',
  pricePerLiter: '',
  totalCost: '',
  fullTank: true,
  fuelType: 'SP95-E10',
  station: 'Leclerc',
  note: '',
});

const STATIONS = ['Leclerc', 'Total', 'Intermarché', 'Carrefour', 'Système U', 'Auchan', 'Esso', 'BP', 'Avia'];

const fmtPrice = (v: number) => `${v.toFixed(3).replace('.', ',')} €`;

// Linked fields: litres (l) × prix/L (p) = total (t). Fill any two → the third.
type CalcField = 'l' | 'p' | 't';
const CALC_KEY: Record<CalcField, 'liters' | 'pricePerLiter' | 'totalCost'> = {
  l: 'liters',
  p: 'pricePerLiter',
  t: 'totalCost',
};
const toInput = (n: number, dec: number) =>
  Number.isFinite(n) && n > 0 ? parseFloat(n.toFixed(dec)).toString().replace('.', ',') : '';

export function FuelPage() {
  const { data, add, update, remove } = useStore();
  const fuel = data.fuel;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FuelForm>(emptyForm);

  const [chartOpen, setChartOpen] = useState(false);
  const [stationsOpen, setStationsOpen] = useState(false);
  const [metric, setMetric] = useState<'cost' | 'price' | 'consumption'>('cost');
  const [period, setPeriod] = useState<Period>('month');

  const stats = useMemo(() => fuelStats(fuel), [fuel]);
  const sorted = useMemo(
    () => [...fuel].sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer),
    [fuel],
  );

  const [calcOrder, setCalcOrder] = useState<CalcField[]>(['p', 'l', 't']);

  // Edit any field → recompute the least-recently-touched of the three.
  function setField(field: CalcField, value: string) {
    const order = [field, ...calcOrder.filter((f) => f !== field)] as CalcField[];
    const next: FuelForm = { ...form, [CALC_KEY[field]]: value };
    const compute = order[2];
    const l = parseNumber(next.liters);
    const p = parseNumber(next.pricePerLiter);
    const t = parseNumber(next.totalCost);
    if (compute === 't' && l > 0 && p > 0) next.totalCost = toInput(l * p, 2);
    else if (compute === 'p' && t > 0 && l > 0) next.pricePerLiter = toInput(t / l, 3);
    else if (compute === 'l' && t > 0 && p > 0) next.liters = toInput(t / p, 2);
    setForm(next);
    setCalcOrder(order);
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setCalcOrder(['p', 'l', 't']);
    setSheetOpen(true);
  }

  function useStation(s: Station, key: ApiFuelKey) {
    setEditingId(null);
    const price = s.prices[key];
    setForm({
      ...emptyForm(),
      station: s.name,
      fuelType: API_TO_FUELTYPE[key],
      pricePerLiter: price ? toInput(price, 3) : '',
    });
    setCalcOrder(['p', 'l', 't']);
    setStationsOpen(false);
    setSheetOpen(true);
  }

  function openEdit(e: FuelEntry) {
    setEditingId(e.id);
    setForm({
      date: e.date,
      odometer: e.odometer ? String(e.odometer) : '',
      liters: String(e.liters),
      pricePerLiter: toInput(e.pricePerLiter, 3),
      totalCost: String(e.totalCost),
      fullTank: e.fullTank,
      fuelType: e.fuelType ?? 'SP95-E10',
      station: e.station ?? '',
      note: e.note ?? '',
    });
    setCalcOrder(['p', 'l', 't']);
    setSheetOpen(true);
  }

  function submit() {
    let liters = parseNumber(form.liters);
    let price = parseNumber(form.pricePerLiter);
    let total = parseNumber(form.totalCost);
    // Complete the missing value from the two provided.
    if (total <= 0 && liters > 0 && price > 0) total = liters * price;
    else if (price <= 0 && total > 0 && liters > 0) price = total / liters;
    else if (liters <= 0 && total > 0 && price > 0) liters = total / price;
    if (liters <= 0 || total <= 0) return;
    const payload: Omit<FuelEntry, 'id'> = {
      date: form.date,
      odometer: parseNumber(form.odometer),
      liters,
      totalCost: total,
      pricePerLiter: price > 0 ? price : total / liters,
      fullTank: form.fullTank,
      fuelType: form.fuelType,
      station: form.station.trim() || undefined,
      note: form.note.trim() || undefined,
    };
    if (editingId) update('fuel', editingId, payload);
    else add('fuel', payload);
    setSheetOpen(false);
  }

  function del() {
    if (editingId) remove('fuel', editingId);
    setSheetOpen(false);
  }

  const chartData = useMemo(() => {
    if (metric === 'cost') return aggregate(fuel, (f) => f.date, (f) => f.totalCost, period);
    if (metric === 'price') return aggregate(fuel, (f) => f.date, (f) => f.pricePerLiter, period, { average: true });
    return aggregate(consumptionSeries(fuel), (s) => s.date, (s) => s.value, period, { average: true });
  }, [fuel, metric, period]);

  return (
    <>
      <PageHeader title="Essence" subtitle="Pleins & consommation" onChart={() => setChartOpen(true)} />

      <Section>
        <StatGrid>
          <Stat label="Total dépensé" value={formatCurrencyShort(stats.totalCost)} accent />
          <Stat
            label="Conso moyenne"
            value={stats.avgConsumption ? `${formatNumber(stats.avgConsumption, 1)}` : '—'}
            sub={stats.avgConsumption ? 'L/100 km' : 'pleins complets requis'}
          />
          <Stat label="Prix moyen" value={stats.avgPricePerLiter ? fmtPrice(stats.avgPricePerLiter) : '—'} sub="par litre" />
          <Stat label="Pleins" value={stats.fillUps} sub={formatLiters(stats.totalLiters)} />
        </StatGrid>
      </Section>

      <Section>
        <button type="button" className="row tool-row" onClick={() => setStationsOpen(true)}>
          <span className="tool-icon">
            <IconPin size={20} />
          </span>
          <div className="row-main">
            <span className="row-title">Prix à la pompe</span>
            <span className="row-subtitle">Stations les moins chères près de moi</span>
          </div>
          <IconChevron size={18} className="row-chevron" />
        </button>
      </Section>

      <Section title="Historique">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<IconFuel size={30} />}
            title="Aucun plein"
            message="Ajoute ton premier passage à la pompe avec le bouton +."
          />
        ) : (
          <div className="list">
            {sorted.map((e) => (
              <Row
                key={e.id}
                title={formatDate(e.date)}
                subtitle={`${formatLiters(e.liters)} · ${e.fuelType ?? ''}${e.station ? ' · ' + e.station : ''}${
                  e.fullTank ? '' : ' · partiel'
                }`}
                value={formatCurrency(e.totalCost)}
                meta={fmtPrice(e.pricePerLiter)}
                onClick={() => openEdit(e)}
              />
            ))}
          </div>
        )}
      </Section>

      <Fab onClick={openAdd} />

      {/* Add / edit sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingId ? 'Modifier le plein' : 'Nouveau plein'}
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
            <Field label="Compteur" hint="km au tableau de bord">
              <Input
                inputMode="numeric"
                placeholder="123456"
                suffix="km"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Litres">
              <Input
                inputMode="decimal"
                placeholder="42,5"
                suffix="L"
                value={form.liters}
                onChange={(e) => setField('l', e.target.value)}
              />
            </Field>
            <Field label="Prix au litre">
              <Input
                inputMode="decimal"
                placeholder="1,889"
                suffix="€/L"
                value={form.pricePerLiter}
                onChange={(e) => setField('p', e.target.value)}
              />
            </Field>
          </div>
          <Field label="Montant total" hint="renseigne 2 champs, le 3ᵉ se calcule">
            <Input
              inputMode="decimal"
              placeholder="78,90"
              suffix="€"
              value={form.totalCost}
              onChange={(e) => setField('t', e.target.value)}
            />
          </Field>
          <div className="form-row">
            <Field label="Carburant">
              <Select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}>
                {FUEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Station">
              <Select
                value={STATIONS.includes(form.station) ? form.station : 'Autre'}
                onChange={(e) => setForm({ ...form, station: e.target.value === 'Autre' ? '' : e.target.value })}
              >
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="Autre">Autre…</option>
              </Select>
            </Field>
          </div>
          {!STATIONS.includes(form.station) && (
            <Field label="Nom de la station">
              <Input
                placeholder="Saisir la station"
                value={form.station}
                onChange={(e) => setForm({ ...form, station: e.target.value })}
              />
            </Field>
          )}
          <label className="switch-row">
            <span>
              <span className="switch-title">Plein complet</span>
              <span className="switch-sub">Nécessaire pour calculer la consommation</span>
            </span>
            <input
              type="checkbox"
              className="switch"
              checked={form.fullTank}
              onChange={(e) => setForm({ ...form, fullTank: e.target.checked })}
            />
          </label>
          <Button onClick={submit}>{editingId ? 'Enregistrer' : 'Ajouter le plein'}</Button>
        </div>
      </BottomSheet>

      {/* Charts sheet */}
      <BottomSheet open={chartOpen} onClose={() => setChartOpen(false)} title="Essence — évolution">
        <div className="chart-sheet" style={{ color: ACCENT }}>
          <Segmented
            options={[
              { value: 'cost', label: 'Dépenses' },
              { value: 'price', label: 'Prix/L' },
              { value: 'consumption', label: 'Conso' },
            ]}
            value={metric}
            onChange={setMetric}
          />
          <div className="chart-card">
            {chartData.length === 0 || chartData.every((d) => d.value === 0) ? (
              <p className="chart-empty">Pas encore assez de données.</p>
            ) : metric === 'cost' ? (
              <BarChart data={chartData} color={ACCENT} formatValue={(v) => formatCurrencyShort(v)} />
            ) : metric === 'price' ? (
              <LineChart data={chartData} color={ACCENT} formatValue={fmtPrice} />
            ) : (
              <LineChart data={chartData} color={ACCENT} formatValue={(v) => `${formatNumber(v, 1)} L`} />
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

      <StationsSheet open={stationsOpen} onClose={() => setStationsOpen(false)} onUseStation={useStation} />
    </>
  );
}
