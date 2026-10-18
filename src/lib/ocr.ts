// On-device OCR of a fuel receipt (Tesseract.js, loaded from CDN on first use).
// The image never leaves the device — only the engine/lang files are fetched.
// Parsing is best-effort: the form lets the user review/correct before saving.

import type { FuelType } from '../types';

export interface ParsedReceipt {
  liters?: number;
  pricePerLiter?: number;
  totalCost?: number;
  date?: string;
  station?: string;
  fuelType?: FuelType;
  rawText: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Tesseract?: any;
  }
}

const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let loadPromise: Promise<any> | null = null;

function loadTesseract(): Promise<any> {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TESSERACT_SRC;
    s.async = true;
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => reject(new Error('Téléchargement du moteur OCR impossible (connexion requise au 1ᵉʳ scan)'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export async function scanReceipt(file: File, onProgress?: (pct: number) => void): Promise<ParsedReceipt> {
  const T = await loadTesseract();
  const worker = await T.createWorker('fra', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round((m.progress ?? 0) * 100));
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return { ...parseReceipt(data.text ?? ''), rawText: data.text ?? '' };
  } finally {
    await worker.terminate();
  }
}

const n = (s: string) => parseFloat(s.replace(',', '.'));

export function parseReceipt(raw: string): Omit<ParsedReceipt, 'rawText'> {
  const t = raw.replace(/ /g, ' ');
  const out: Omit<ParsedReceipt, 'rawText'> = {};

  // Litres : "42,50 L", "VOLUME 42,50", "Qté 42.50"
  const litersM =
    t.match(/(\d{1,3}[.,]\d{1,2})\s*L(?![A-Za-z])/i) ||
    t.match(/(?:volume|litres?|qte|quantit[ée])\D{0,8}(\d{1,3}[.,]\d{1,2})/i);
  if (litersM) {
    const v = n(litersM[1]);
    if (v >= 1 && v <= 200) out.liters = v;
  }

  // Prix au litre : 3 décimales, proche de /L ou PU ; sinon tout nombre à 3 décimales plausible
  const priceM =
    t.match(/(\d[.,]\d{3})\s*(?:€|eur)?\s*\/?\s*L\b/i) ||
    t.match(/(?:prix|p\.?\s?u|unitaire)\D{0,8}(\d[.,]\d{3})/i) ||
    t.match(/\b(\d[.,]\d{3})\b/);
  if (priceM) {
    const v = n(priceM[1]);
    if (v >= 0.3 && v <= 4) out.pricePerLiter = v;
  }

  // Total : proche de total/montant/ttc/net à payer ; sinon le plus gros montant en €
  const totalM = t.match(/(?:total|montant|ttc|net\s*[àa]?\s*payer)\D{0,12}(\d{1,4}[.,]\d{2})/i);
  if (totalM) {
    out.totalCost = n(totalM[1]);
  } else {
    const amounts = [...t.matchAll(/(\d{1,4}[.,]\d{2})\s*(?:€|eur)/gi)].map((m) => n(m[1])).filter((v) => v >= 1 && v <= 1000);
    if (amounts.length) out.totalCost = Math.max(...amounts);
  }

  // Date : jj/mm/aaaa (ou -, .)
  const dateM = t.match(/(\d{2})[\/.\-](\d{2})[\/.\-](\d{2,4})/);
  if (dateM) {
    const d = dateM[1];
    const mo = dateM[2];
    let y = dateM[3];
    if (y.length === 2) y = '20' + y;
    if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) out.date = `${y}-${mo}-${d}`;
  }

  // Enseigne
  const brands: [RegExp, string][] = [
    [/leclerc/i, 'Leclerc'],
    [/total|access/i, 'Total'],
    [/intermarch|roquette/i, 'Intermarché'],
    [/carrefour/i, 'Carrefour'],
    [/(syst[eè]me|super)\s*u\b|\bu\s*express/i, 'Système U'],
    [/auchan/i, 'Auchan'],
    [/esso/i, 'Esso'],
    [/\bbp\b/i, 'BP'],
    [/avia/i, 'Avia'],
    [/shell/i, 'Shell'],
  ];
  for (const [re, name] of brands) {
    if (re.test(t)) {
      out.station = name;
      break;
    }
  }

  // Carburant
  if (/e\s?85|super[eé]thanol/i.test(t)) out.fuelType = 'E85';
  else if (/e\s?10|95[\s-]*e10|sp\s?95[\s-]*e10/i.test(t)) out.fuelType = 'SP95-E10';
  else if (/sp\s?98|98/i.test(t)) out.fuelType = 'SP98';
  else if (/sp\s?95|95/i.test(t)) out.fuelType = 'SP95';
  else if (/gazole|gasoil|diesel|\bb7\b/i.test(t)) out.fuelType = 'Diesel';
  else if (/\bgpl\b/i.test(t)) out.fuelType = 'GPL';

  return out;
}
