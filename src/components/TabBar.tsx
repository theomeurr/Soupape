import type { ComponentType } from 'react';

export interface TabDef {
  id: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  accent: string;
}

interface TabBarProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));
  return (
    <nav
      className="tabbar glass"
      style={{ ['--tab-count' as string]: tabs.length, ['--active-index' as string]: index }}
    >
      <div className="tabbar-indicator" />
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`tabbar-item ${id === active ? 'is-active' : ''}`}
          onClick={() => onChange(id)}
          aria-current={id === active ? 'page' : undefined}
        >
          <span className="tabbar-icon">
            <Icon size={24} />
          </span>
          <span className="tabbar-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
