import type { AppData } from '../types';
import { idbGet, idbSet } from './idb';

const LEGACY_KEY = 'soupape:data'; // ancien stockage localStorage (migration)
const CURRENT_VERSION = 1;

export const DEFAULT_DATA: AppData = {
  version: CURRENT_VERSION,
  settings: { carName: 'Ma voiture', currency: 'EUR' },
  fuel: [],
  mileage: [],
  maintenance: [],
  reminders: [],
  documents: [],
};

/** Load data from IndexedDB, migrating any older localStorage payload on first run. */
export async function loadData(): Promise<AppData> {
  try {
    const stored = await idbGet<Partial<AppData>>();
    if (stored) return migrate(stored);

    // One-time migration from the previous localStorage-based version.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrate(JSON.parse(legacy) as Partial<AppData>);
      await idbSet(migrated);
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
    return structuredClone(DEFAULT_DATA);
  } catch (err) {
    console.error('Soupape: lecture des données impossible, réinitialisation.', err);
    return structuredClone(DEFAULT_DATA);
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await idbSet(data);
  } catch (err) {
    console.error('Soupape: sauvegarde impossible.', err);
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
    reminders: input.reminders ?? [],
    documents: input.documents ?? [],
  };
}

/** Validate an imported payload before it replaces the live data. */
export function parseImported(text: string): AppData {
  const parsed = JSON.parse(text) as Partial<AppData>;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Fichier invalide');
  }
  if (
    !Array.isArray(parsed.fuel) &&
    !Array.isArray(parsed.mileage) &&
    !Array.isArray(parsed.maintenance) &&
    !Array.isArray(parsed.reminders)
  ) {
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
