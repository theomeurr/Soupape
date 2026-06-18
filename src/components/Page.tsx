import type { ReactNode } from 'react';
import { IconChart, IconChevron, IconPlus } from './Icons';

export function PageHeader({
  title,
  subtitle,
  onChart,
}: {
  title: string;
  subtitle?: string;
  onChart: () => void;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <button type="button" className="chart-btn" onClick={onChart} aria-label="Voir les graphiques">
        <IconChart size={20} />
      </button>
    </header>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="section">
      {title && <h2 className="section-title">{title}</h2>}
      {children}
    </section>
  );
}

export function Row({
  title,
  subtitle,
  value,
  meta,
  onClick,
}: {
  title: string;
  subtitle?: string;
  value: ReactNode;
  meta?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="row" onClick={onClick}>
      <div className="row-main">
        <span className="row-title">{title}</span>
        {subtitle && <span className="row-subtitle">{subtitle}</span>}
      </div>
      <div className="row-end">
        <span className="row-value">{value}</span>
        {meta && <span className="row-meta">{meta}</span>}
      </div>
      <IconChevron size={18} className="row-chevron" />
    </button>
  );
}

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="fab" onClick={onClick} aria-label="Ajouter">
      <IconPlus size={26} />
    </button>
  );
}
