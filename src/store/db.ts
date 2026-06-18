import type { AppData } from '../types';

const STORAGE_KEY = 'soupape:data';
const CURRENT_VERSION = 1;

export const DEFAULT_DATA: AppData = {
  version: CURRENT_VERSION,
  settings: { carName: 'Ma voiture', currency: 'EUR' },
  fuel: [],
  mileage: [],
  maintenance: [],
};

/** Load and migrate data from localStorage, falling back to defaults. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return migrate(parsed);
  } catch (err) {
    console.error('Soupape: lecture des données impossible, réinitialisation.', err);
    return structuredClone(DEFAULT_DATA);
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Soupape: sauvegarde impossible (stockage plein ?).', err);
  }
}

/** Bring any older/partial payload up to the current shape. */
function migrate(input: Partial<AppData>): AppData {
  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_DATA.settings, ...input.settings },
    fuel: input.fuel ?? [],
    mileage: input.mileage ?? [],
    maintenance: input.maintenance ?? [],
  };
}

/** Validate an imported payload before it replaces the live data. */
export function parseImported(text: string): AppData {
  const parsed = JSON.parse(text) as Partial<AppData>;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Fichier invalide');
  }
  if (!Array.isArray(parsed.fuel) && !Array.isArray(parsed.mileage) && !Array.isArray(parsed.maintenance)) {
    throw new Error('Aucune donnée Soupape reconnue dans ce fichier');
  }
  return migrate(parsed);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
