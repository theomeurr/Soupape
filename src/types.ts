// Domain model for Soupape — all amounts in EUR, distances in km, volumes in L.

export type CollectionKey = 'fuel' | 'mileage' | 'maintenance' | 'reminders' | 'documents' | 'insurance';

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
  photos?: string[]; // factures / photos (data URLs JPEG compressées)
}

/** Recurring upkeep reminder, triggered by distance and/or elapsed time. */
export interface Reminder {
  id: string;
  title: string;
  category: MaintenanceCategory;
  intervalKm?: number; // tous les X km
  intervalMonths?: number; // tous les X mois
  anchorDate: string; // date du dernier entretien (point de départ)
  anchorOdometer?: number; // compteur du dernier entretien
  note?: string;
}

export type DocumentType =
  | 'Carte grise'
  | 'Assurance'
  | 'Contrôle technique'
  | 'Garantie'
  | 'Facture'
  | 'Autre';

export const DOCUMENT_TYPES: DocumentType[] = [
  'Carte grise',
  'Assurance',
  'Contrôle technique',
  'Garantie',
  'Facture',
  'Autre',
];

export interface DocumentItem {
  id: string;
  title: string;
  type: DocumentType;
  expiryDate?: string; // échéance (assurance, CT…)
  reference?: string; // n° de contrat, plaque…
  note?: string;
  photos?: string[]; // scans / photos (data URLs JPEG compressées)
}

export type InsuranceType = 'Tiers' | 'Tiers étendu' | 'Tous risques' | 'Autre';

export const INSURANCE_TYPES: InsuranceType[] = ['Tiers', 'Tiers étendu', 'Tous risques', 'Autre'];

export interface InsuranceEntry {
  id: string;
  date: string; // date du paiement / de la prime
  amount: number; // € payé
  insurer?: string; // assureur (MAIF, AXA…)
  formula?: InsuranceType;
  periodMonths?: number; // période couverte (1 mensuel, 12 annuel…)
  renewalDate?: string; // échéance / renouvellement du contrat
  note?: string;
  photos?: string[]; // pièces jointes (contrat, attestation… images ou PDF)
}

export interface Settings {
  carName: string;
  currency: string; // ISO code, e.g. 'EUR'
  tankCapacity?: number; // L (optionnel)
  fiscalCv?: string; // puissance fiscale pour le barème km
  isElectric?: boolean; // véhicule électrique (+20% barème)
  driveClientId?: string; // OAuth client ID Google (sauvegarde Drive)
  lastBackupAt?: string; // ISO datetime de la dernière sauvegarde Drive
}

export interface AppData {
  version: number;
  settings: Settings;
  fuel: FuelEntry[];
  mileage: MileageEntry[];
  maintenance: MaintenanceEntry[];
  reminders: Reminder[];
  documents: DocumentItem[];
  insurance: InsuranceEntry[];
}

export type EntryMap = {
  fuel: FuelEntry;
  mileage: MileageEntry;
  maintenance: MaintenanceEntry;
  reminders: Reminder;
  documents: DocumentItem;
  insurance: InsuranceEntry;
};
