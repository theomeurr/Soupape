// Domain model for Soupape — all amounts in EUR, distances in km, volumes in L.

export type CollectionKey = 'fuel' | 'mileage' | 'maintenance';

export type FuelType = 'SP95' | 'SP98' | 'SP95-E10' | 'Diesel' | 'E85' | 'GPL' | 'Électrique';

export const FUEL_TYPES: FuelType[] = [
  'SP95',
  'SP98',
  'SP95-E10',
  'Diesel',
  'E85',
  'GPL',
  'Électrique',
];

export interface FuelEntry {
  id: string;
  date: string; // ISO 'YYYY-MM-DD'
  odometer: number; // total km on the clock at fill-up
  liters: number;
  pricePerLiter: number; // €/L
  totalCost: number; // € (liters * pricePerLiter)
  fullTank: boolean; // plein complet ? (requis pour le calcul de conso)
  fuelType?: FuelType;
  station?: string;
  note?: string;
}

export interface MileageEntry {
  id: string;
  date: string;
  odometer: number; // relevé du compteur en km
  note?: string;
}

export type MaintenanceCategory =
  | 'Vidange'
  | 'Pneus'
  | 'Freins'
  | 'Révision'
  | 'Distribution'
  | 'Filtres'
  | 'Batterie'
  | 'Carrosserie'
  | 'Contrôle technique'
  | 'Lavage'
  | 'Autre';

export const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  'Vidange',
  'Pneus',
  'Freins',
  'Révision',
  'Distribution',
  'Filtres',
  'Batterie',
  'Carrosserie',
  'Contrôle technique',
  'Lavage',
  'Autre',
];

export interface MaintenanceEntry {
  id: string;
  date: string;
  category: MaintenanceCategory;
  title: string;
  cost: number; // €
  odometer?: number; // km au moment de l'intervention
  garage?: string;
  note?: string;
}

export interface Settings {
  carName: string;
  currency: string; // ISO code, e.g. 'EUR'
  tankCapacity?: number; // L (optionnel)
}

export interface AppData {
  version: number;
  settings: Settings;
  fuel: FuelEntry[];
  mileage: MileageEntry[];
  maintenance: MaintenanceEntry[];
}

export type EntryMap = {
  fuel: FuelEntry;
  mileage: MileageEntry;
  maintenance: MaintenanceEntry;
};
