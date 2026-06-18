import { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { mileageStats, odometerPoints } from '../lib/stats';
import { baremeKm, BAREME_YEAR, CV_OPTIONS, type CvBracket } from '../lib/baremeKm';
import { formatCurrency, formatKm, parseNumber } from '../lib/format';
import { BottomSheet } from './BottomSheet';
import { Field, Input, Select } from './UI';

export function BaremeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, updateSettings } = useStore();
  const yearKm = useMemo(
    () => mileageStats(odometerPoints(data.fuel, data.mileage)).thisYear,
    [data.fuel, data.mileage],
  );

  const [cv, setCv] = useState<CvBracket>((data.settings.fiscalCv as CvBracket) || '5');
  const [km, setKm] = useState(String(Math.round(yearKm) || ''));
  const [electric, setElectric] = useState(data.settings.isElectric ?? false);

  const distance = parseNumber(km);
  const amount = baremeKm(cv, distance, electric);

  function persist(next: { cv?: CvBracket; electric?: boolean }) {
    updateSettings({
      fiscalCv: next.cv ?? cv,
      isElectric: next.electric ?? electric,
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Barème kilométrique ${BAREME_YEAR}`}>
      <div className="form">
        <div className="bareme-result">
          <span className="bareme-amount">{formatCurrency(amount)}</span>
          <span className="bareme-label">
            indemnités pour {formatKm(distance)}
            {electric ? ' · électrique +20 %' : ''}
          </span>
        </div>

        <Field label="Puissance fiscale">
          <Select
            value={cv}
            onChange={(e) => {
              const v = e.target.value as CvBracket;
              setCv(v);
              persist({ cv: v });
            }}
          >
            {CV_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Distance annuelle" hint="pré-rempli avec tes km de l'année">
          <Input
            inputMode="numeric"
            suffix="km"
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />
        </Field>

        <label className="switch-row">
          <span>
            <span className="switch-title">Véhicule électrique</span>
            <span className="switch-sub">Majoration de 20 % du barème</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={electric}
            onChange={(e) => {
              setElectric(e.target.checked);
              persist({ electric: e.target.checked });
            }}
          />
        </label>

        <p className="settings-foot">
          Barème voitures {BAREME_YEAR} (frais réels). Estimation indicative — vérifie le barème en vigueur.
        </p>
      </div>
    </BottomSheet>
  );
}
