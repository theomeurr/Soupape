import { useId } from 'react';
import type { Bucket } from '../lib/date';

const W = 340;
const H = 168;
const PAD = { top: 18, right: 12, bottom: 22, left: 12 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

interface ChartProps {
  data: Bucket[];
  color: string;
  formatValue?: (v: number) => string;
}

/** Thin x-axis labels down to ~6 so they never overlap on a phone. */
function thinnedLabels(data: Bucket[]): Set<number> {
  const step = Math.ceil(data.length / 6);
  const keep = new Set<number>();
  for (let i = data.length - 1; i >= 0; i -= step) keep.add(i);
  return keep;
}

export function BarChart({ data, color, formatValue }: ChartProps) {
  const gid = useId();
  const max = Math.max(...data.map((d) => d.value), 1);
  const labels = thinnedLabels(data);
  const slot = innerW / data.length;
  const barW = Math.min(34, slot * 0.62);
  const showValues = data.length <= 7;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <line
        x1={PAD.left}
        y1={PAD.top + innerH + 0.5}
        x2={W - PAD.right}
        y2={PAD.top + innerH + 0.5}
        className="chart-axis"
      />
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * innerH : 0;
        const x = PAD.left + slot * i + (slot - barW) / 2;
        const y = PAD.top + innerH - h;
        const isLast = i === data.length - 1;
        return (
          <g key={d.key}>
            {d.value > 0 && (
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx={Math.min(6, barW / 2)}
                fill={`url(#bar-${gid})`}
                opacity={isLast ? 1 : 0.82}
              />
            )}
            {showValues && d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} className="chart-value" textAnchor="middle">
                {formatValue ? formatValue(d.value) : Math.round(d.value)}
              </text>
            )}
            {labels.has(i) && (
              <text
                x={PAD.left + slot * i + slot / 2}
                y={H - 6}
                className="chart-label"
                textAnchor="middle"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function LineChart({ data, color, formatValue }: ChartProps) {
  const gid = useId();
  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const labels = thinnedLabels(data);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const pts = data.map((d, i) => ({
    x: PAD.left + stepX * i + (data.length === 1 ? innerW / 2 : 0),
    y: PAD.top + innerH - ((d.value - min) / span) * innerH,
  }));
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length - 1].x},${PAD.top + innerH} L${pts[0].x},${PAD.top + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`line-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#line-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle
          key={data[i].key}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 4 : 2.5}
          fill={i === pts.length - 1 ? color : 'var(--bg-card)'}
          stroke={color}
          strokeWidth={1.5}
        />
      ))}
      {pts.length > 0 && (
        <text x={pts[pts.length - 1].x} y={Math.max(12, pts[pts.length - 1].y - 10)} className="chart-value" textAnchor="end">
          {formatValue ? formatValue(data[data.length - 1].value) : Math.round(data[data.length - 1].value)}
        </text>
      )}
      {data.map((d, i) =>
        labels.has(i) ? (
          <text key={`l-${d.key}`} x={pts[i].x} y={H - 6} className="chart-label" textAnchor="middle">
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
