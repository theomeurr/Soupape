// Generates PWA icons + favicon from a single vector gauge ("speedometer") mark.
// Run with: npm run icons
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const CX = 256;
const CY = 274;

const rad = (deg) => (deg * Math.PI) / 180;
const pol = (deg, r) => [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];
const f = (n) => Math.round(n * 100) / 100;

/** White speedometer mark (dial arc + ticks + needle + hub) at a given scale. */
function gauge(scale) {
  const R = 152 * scale;
  const [s1x, s1y] = pol(150, R);
  const [e1x, e1y] = pol(30, R); // 30 === 390, long way through the top (270)
  const dial = `M${f(s1x)} ${f(s1y)} A${f(R)} ${f(R)} 0 1 1 ${f(e1x)} ${f(e1y)}`;

  let ticks = '';
  for (let a = 150; a <= 390; a += 30) {
    const [ix, iy] = pol(a, R * 0.82);
    const [ox, oy] = pol(a, R * 0.97);
    ticks += `<line x1="${f(ix)}" y1="${f(iy)}" x2="${f(ox)}" y2="${f(oy)}" stroke="#fff" stroke-opacity="0.55" stroke-width="${f(
      8 * scale,
    )}" stroke-linecap="round"/>`;
  }

  const [tx, ty] = pol(312, R * 0.74); // needle tip, up-right
  const [bx, by] = pol(132, R * 0.16); // short tail
  const sw = 18 * scale;

  return `
    <path d="${dial}" fill="none" stroke="#fff" stroke-opacity="0.96" stroke-width="${f(22 * scale)}" stroke-linecap="round"/>
    ${ticks}
    <line x1="${f(bx)}" y1="${f(by)}" x2="${f(tx)}" y2="${f(ty)}" stroke="#fff" stroke-width="${f(sw)}" stroke-linecap="round"/>
    <circle cx="${CX}" cy="${CY}" r="${f(24 * scale)}" fill="#fff"/>
    <circle cx="${CX}" cy="${CY}" r="${f(10 * scale)}" fill="url(#bg)"/>
  `;
}

function svg({ gaugeScale = 1, rounded = false }) {
  const bg = rounded
    ? `<rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)"/>
       <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#glow)"/>`
    : `<rect width="512" height="512" fill="url(#bg)"/>
       <rect width="512" height="512" fill="url(#glow)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#201D19"/>
        <stop offset="1" stop-color="#201D19"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.3" cy="0.18" r="0.9">
        <stop offset="0" stop-color="#fff" stop-opacity="0.1"/>
        <stop offset="0.55" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${bg}
    ${gauge(gaugeScale)}
  </svg>`;
}

const fullSvg = svg({ gaugeScale: 1, rounded: false });
const maskableSvg = svg({ gaugeScale: 0.78, rounded: false });
const faviconSvg = svg({ gaugeScale: 1, rounded: true });

await mkdir(publicDir, { recursive: true });

async function png(source, size, name) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(join(publicDir, name));
  console.log('✓', name);
}

await png(fullSvg, 192, 'pwa-192.png');
await png(fullSvg, 512, 'pwa-512.png');
await png(maskableSvg, 512, 'pwa-512-maskable.png');
await png(fullSvg, 180, 'apple-touch-icon.png');
await writeFile(join(publicDir, 'favicon.svg'), faviconSvg.trim());
console.log('✓ favicon.svg');
