// Live French fuel prices via the official open-data API (Opendatasoft).
// Runs in the user's browser (CORS-enabled public API). Parsing is defensive:
// field names are read leniently so a minor schema change degrades gracefully.

import type { FuelType } from '../types';

export type ApiFuelKey = 'gazole' | 'sp95' | 'sp98' | 'e10' | 'e85' | 'gplc';

export const FUEL_KEYS: ApiFuelKey[] = ['gazole', 'sp95', 'sp98', 'e10', 'e85', 'gplc'];

export const FUEL_LABELS: Record<ApiFuelKey, string> = {
  gazole: 'Gazole',
  sp95: 'SP95',
  sp98: 'SP98',
  e10: 'E10',
  e85: 'E85',
  gplc: 'GPL',
};

export const API_TO_FUELTYPE: Record<ApiFuelKey, FuelType> = {
  gazole: 'Diesel',
  sp95: 'SP95',
  sp98: 'SP98',
  e10: 'SP95-E10',
  e85: 'E85',
  gplc: 'GPL',
};

export interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  cp: string;
  lat: number;
  lon: number;
  distanceKm: number;
  prices: Partial<Record<ApiFuelKey, number>>;
}

const DATASET = 'prix-des-carburants-en-france-flux-instantane-v2';
// Opendatasoft v1 search API: geofilter.distance=lat,lon,meters is simple and robust.
const BASE = 'https://data.economie.gouv.fr/api/records/1.0/search/';

export async function fetchNearbyStations(lat: number, lon: number, radiusKm = 8, limit = 40): Promise<Station[]> {
  const radiusM = Math.round(radiusKm * 1000);
  const url = `${BASE}?dataset=${DATASET}&geofilter.distance=${lat},${lon},${radiusM}&rows=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Service indisponible (${res.status})`);
  const data = await res.json();
  const records: ApiRecord[] = data.records ?? [];
  const stations = records
    .map((r) => parseStation(r))
    .filter((s): s is Station => s !== null)
    .map((s) => ({ ...s, distanceKm: haversine(lat, lon, s.lat, s.lon) }));
  return stations.sort((a, b) => a.distanceKm - b.distanceKm);
}

interface ApiRecord {
  recordid?: string;
  fields?: Record<string, unknown>;
  geometry?: { coordinates?: number[] };
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function parseStation(rec: ApiRecord): Station | null {
  const f = rec.fields ?? {};
  let lat: number | undefined;
  let lon: number | undefined;
  const pt = f.geo_point_borne; // v1 returns [lat, lon]
  if (Array.isArray(pt)) {
    lat = num(pt[0]);
    lon = num(pt[1]);
  } else if (rec.geometry?.coordinates) {
    lon = num(rec.geometry.coordinates[0]);
    lat = num(rec.geometry.coordinates[1]);
  }
  if (lat === undefined || lon === undefined) return null;

  const prices: Partial<Record<ApiFuelKey, number>> = {};
  for (const k of FUEL_KEYS) {
    const p = num(f[`${k}_prix`]);
    if (p !== undefined && p > 0 && p < 10) prices[k] = p;
  }

  return {
    id: String(rec.recordid ?? `${lat},${lon}`),
    name: String(f.adresse ?? f.enseigne ?? 'Station'),
    address: String(f.adresse ?? ''),
    city: String(f.ville ?? ''),
    cp: String(f.cp ?? ''),
    lat,
    lon,
    distanceKm: 0,
    prices,
  };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Géolocalisation indisponible sur cet appareil'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(new Error(e.code === e.PERMISSION_DENIED ? 'Localisation refusée' : 'Localisation impossible')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}
