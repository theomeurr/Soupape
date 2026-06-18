import { useEffect, useState } from 'react';
import { useStore } from './store/StoreContext';
import { TabBar, type TabDef } from './components/TabBar';
import { IconGauge, IconFuel, IconWrench, IconSettings } from './components/Icons';
import { MileagePage } from './pages/MileagePage';
import { FuelPage } from './pages/FuelPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { SettingsSheet } from './components/SettingsSheet';

const TABS: TabDef[] = [
  { id: 'mileage', label: 'Kilométrage', Icon: IconGauge, accent: '#007AFF' },
  { id: 'fuel', label: 'Essence', Icon: IconFuel, accent: '#FF9500' },
  { id: 'maintenance', label: 'Entretien', Icon: IconWrench, accent: '#AF52DE' },
];

export default function App() {
  const { data } = useStore();
  const [active, setActive] = useState('mileage');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const accent = TABS.find((t) => t.id === active)?.accent ?? '#007AFF';

  // Expose the active accent globally so portaled sheets inherit it too.
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  return (
    <div className="app" style={{ ['--accent' as string]: accent }}>
      <header className="app-header">
        <button type="button" className="brand" onClick={() => setSettingsOpen(true)}>
          <span className="brand-mark" />
          <span className="brand-name">{data.settings.carName || 'Soupape'}</span>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Réglages"
        >
          <IconSettings size={22} />
        </button>
      </header>

      <main className="app-main">
        {active === 'mileage' && <MileagePage />}
        {active === 'fuel' && <FuelPage />}
        {active === 'maintenance' && <MaintenancePage />}
      </main>

      <TabBar tabs={TABS} active={active} onChange={setActive} />

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
