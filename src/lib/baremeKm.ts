// Barème kilométrique (frais réels, voitures). Coefficients du barème 2025
// (revenus 2024). À mettre à jour chaque année si besoin. Bonus +20 % pour
// les véhicules électriques.

export type CvBracket = '3' | '4' | '5' | '6' | '7';

export const CV_OPTIONS: { value: CvBracket; label: string }[] = [
  { value: '3', label: '3 CV et moins' },
  { value: '4', label: '4 CV' },
  { value: '5', label: '5 CV' },
  { value: '6', label: '6 CV' },
  { value: '7', label: '7 CV et plus' },
];

export const BAREME_YEAR = 2025;

// [≤5000 → d×a1] [5001–20000 → d×a2 + b2] [>20000 → d×a3]
const TABLE: Record<CvBracket, [number, number, number, number]> = {
  '3': [0.529, 0.316, 1065, 0.37],
  '4': [0.606, 0.34, 1330, 0.407],
  '5': [0.636, 0.357, 1395, 0.427],
  '6': [0.665, 0.374, 1457, 0.447],
  '7': [0.697, 0.394, 1515, 0.47],
};

export function baremeKm(cv: CvBracket, km: number, electric: boolean): number {
  const [a1, a2, b2, a3] = TABLE[cv];
  let value = km <= 5000 ? km * a1 : km <= 20000 ? km * a2 + b2 : km * a3;
  if (electric) value *= 1.2;
  return Math.max(0, value);
}
