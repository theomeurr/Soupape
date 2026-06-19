import type { AppData } from '../types';
import { formatCurrency, formatDate, formatKm, todayISO } from './format';

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- CSV ---------- */

function cell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function table(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

export function downloadCSV(data: AppData) {
  const blocks: string[] = [];

  blocks.push(
    '# Essence\r\n' +
      table(
        ['Date', 'Compteur (km)', 'Litres', 'Prix/L (€)', 'Total (€)', 'Plein', 'Carburant', 'Station', 'Note'],
        [...data.fuel]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((f) => [f.date, f.odometer, f.liters, f.pricePerLiter.toFixed(3), f.totalCost.toFixed(2), f.fullTank ? 'oui' : 'non', f.fuelType ?? '', f.station ?? '', f.note ?? '']),
      ),
  );

  blocks.push(
    '# Kilométrage\r\n' +
      table(
        ['Date', 'Compteur (km)', 'Note'],
        [...data.mileage].sort((a, b) => a.date.localeCompare(b.date)).map((m) => [m.date, m.odometer, m.note ?? '']),
      ),
  );

  blocks.push(
    '# Entretien\r\n' +
      table(
        ['Date', 'Catégorie', 'Intitulé', 'Coût (€)', 'Compteur (km)', 'Garage', 'Note'],
        [...data.maintenance]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((m) => [m.date, m.category, m.title, m.cost.toFixed(2), m.odometer ?? '', m.garage ?? '', m.note ?? '']),
      ),
  );

  triggerDownload('﻿' + blocks.join('\r\n\r\n'), `soupape-${todayISO()}.csv`, 'text/csv;charset=utf-8');
}

/* ---------- Printable maintenance logbook (PDF via system print) ---------- */

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function printCarnet(data: AppData) {
  const items = [...data.maintenance].sort((a, b) => b.date.localeCompare(a.date));
  const total = items.reduce((s, m) => s + m.cost, 0);

  const rows = items
    .map(
      (m) => `
      <article class="entry">
        <div class="entry-head">
          <div>
            <h3>${esc(m.title)}</h3>
            <p class="meta">${esc(m.category)} · ${esc(formatDate(m.date))}${m.odometer ? ' · ' + esc(formatKm(m.odometer)) : ''}${m.garage ? ' · ' + esc(m.garage) : ''}</p>
          </div>
          <span class="cost">${esc(formatCurrency(m.cost, data.settings.currency))}</span>
        </div>
        ${m.note ? `<p class="note">${esc(m.note)}</p>` : ''}
        ${(() => {
          const imgs = (m.photos ?? []).filter((p) => !p.startsWith('data:application/pdf'));
          return imgs.length ? `<div class="photos">${imgs.map((p) => `<img src="${p}" alt=""/>`).join('')}</div>` : '';
        })()}
      </article>`,
    )
    .join('');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
  <title>Carnet d'entretien — ${esc(data.settings.carName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; color: #111; margin: 32px; }
    header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:20px; }
    h1 { margin:0; font-size:22px; } h2 { margin:0; font-size:13px; font-weight:500; color:#666; }
    .summary { font-size:13px; color:#444; margin-bottom:18px; }
    .entry { border:1px solid #ddd; border-radius:10px; padding:14px 16px; margin-bottom:12px; break-inside:avoid; }
    .entry-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .entry h3 { margin:0; font-size:15px; }
    .meta { margin:3px 0 0; font-size:12px; color:#666; }
    .cost { font-weight:700; font-size:15px; white-space:nowrap; }
    .note { margin:8px 0 0; font-size:13px; color:#333; }
    .photos { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
    .photos img { width:140px; height:140px; object-fit:cover; border-radius:8px; border:1px solid #eee; }
    footer { margin-top:24px; font-size:11px; color:#999; text-align:center; }
  </style></head><body>
    <header>
      <div><h1>Carnet d'entretien</h1><h2>${esc(data.settings.carName)}</h2></div>
      <div style="text-align:right"><h2>Total ${esc(formatCurrency(total, data.settings.currency))}</h2><h2>${items.length} interventions</h2></div>
    </header>
    <p class="summary">Édité le ${esc(formatDate(todayISO()))} · Soupape</p>
    ${rows || '<p>Aucune intervention enregistrée.</p>'}
    <footer>Généré par Soupape</footer>
  </body></html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 350);
  };
}
