import { useRef } from 'react';
import { useStore } from '../store/StoreContext';
import { parseImported } from '../store/db';
import { todayISO } from '../lib/format';
import { BottomSheet } from './BottomSheet';
import { Button, Field, Input } from './UI';
import { IconDownload, IconUpload } from './Icons';

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, updateSettings, replaceAll, resetAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soupape-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const next = parseImported(await file.text());
      if (confirm('Remplacer toutes les données actuelles par ce fichier ?')) {
        replaceAll(next);
        onClose();
      }
    } catch (err) {
      alert('Import impossible : ' + (err instanceof Error ? err.message : 'fichier invalide'));
    } finally {
      e.target.value = '';
    }
  }

  function reset() {
    if (confirm('Tout effacer ? Cette action est irréversible.')) {
      resetAll();
      onClose();
    }
  }

  const counts = `${data.fuel.length} pleins · ${data.mileage.length} relevés · ${data.maintenance.length} entretiens`;

  return (
    <BottomSheet open={open} onClose={onClose} title="Réglages">
      <div className="form">
        <Field label="Nom du véhicule">
          <Input
            value={data.settings.carName}
            placeholder="Ma voiture"
            onChange={(e) => updateSettings({ carName: e.target.value })}
          />
        </Field>

        <div className="settings-group">
          <p className="settings-counts">{counts}</p>
          <Button variant="ghost" onClick={exportData}>
            <IconDownload size={18} /> Exporter mes données
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <IconUpload size={18} /> Importer un fichier
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>

        <Button variant="danger" onClick={reset}>
          Réinitialiser l'application
        </Button>

        <p className="settings-foot">Soupape — données stockées sur cet appareil uniquement.</p>
      </div>
    </BottomSheet>
  );
}
