import { useMemo, useState } from 'react';
import { fetchNearbyStations, getLocation, type ApiFuelKey, type Station } from '../lib/fuelPrices';
import { BottomSheet } from './BottomSheet';
import { Button, Segmented } from './UI';
import { IconFuel } from './Icons';

const fmtPrice = (v: number) => `${v.toFixed(3).replace('.', ',')} €`;
const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`);

const FUEL_OPTIONS: { value: ApiFuelKey; label: string }[] = [
  { value: 'gazole', label: 'Gazole' },
  { value: 'sp95', label: 'SP95' },
  { value: 'e10', label: 'E10' },
  { value: 'sp98', label: 'SP98' },
];

export function StationsSheet({
  open,
  onClose,
  onUseStation,
}: {
  open: boolean;
  onClose: () => void;
  onUseStation: (station: Station, fuel: ApiFuelKey) => void;
}) {
  const [fuel, setFuel] = useState<ApiFuelKey>('gazole');
  const [stations, setStations] = useState<Station[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function locate() {
    setLoading(true);
    setError(null);
    try {
      const { lat, lon } = await getLocation();
      setStations(await fetchNearbyStations(lat, lon));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setStations(null);
    } finally {
      setLoading(false);
    }
  }

  const ranked = useMemo(() => {
    if (!stations) return [];
    return stations
      .filter((s) => s.prices[fuel] !== undefined)
      .sort((a, b) => (a.prices[fuel] as number) - (b.prices[fuel] as number))
      .slice(0, 20);
  }, [stations, fuel]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Prix à la pompe">
      <div className="stations">
        <Segmented options={FUEL_OPTIONS} value={fuel} onChange={setFuel} />

        {!stations && !loading && (
          <div className="stations-intro">
            <p>Trouve la station la moins chère autour de toi (données officielles).</p>
            <Button onClick={locate}>📍 Me localiser</Button>
          </div>
        )}

        {loading && <p className="chart-empty">Recherche des stations…</p>}
        {error && <p className="settings-msg err">{error}</p>}

        {stations && !loading && (
          <>
            {ranked.length === 0 ? (
              <p className="chart-empty">Aucune station avec ce carburant à proximité.</p>
            ) : (
              <div className="list">
                {ranked.map((s, i) => (
                  <button key={s.id} type="button" className="station" onClick={() => onUseStation(s, fuel)}>
                    <div className="station-main">
                      <span className="station-name">
                        {s.name}
                        {i === 0 && <span className="station-badge">le - cher</span>}
                      </span>
                      <span className="station-sub">
                        {s.city} · {fmtDist(s.distanceKm)}
                      </span>
                    </div>
                    <span className="station-price">{fmtPrice(s.prices[fuel] as number)}</span>
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="stations-relocate" onClick={locate}>
              Actualiser ma position
            </button>
          </>
        )}

        <p className="stations-foot">
          <IconFuel size={13} /> Source : prix-carburants.gouv.fr · touche une station pour pré-remplir un plein.
        </p>
      </div>
    </BottomSheet>
  );
}
