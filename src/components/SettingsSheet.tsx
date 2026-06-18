import { useRef, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { parseImported } from '../store/db';
import { todayISO } from '../lib/format';
import { backupToDrive, restoreFromDrive } from '../lib/drive';
import { downloadCSV, printCarnet } from '../lib/exporters';
import { BottomSheet } from './BottomSheet';
import { Button, Field, Input } from './UI';
import { IconCloud, IconDownload, IconFile, IconPrinter, IconUpload } from './Icons';

type Msg = { type: 'ok' | 'err'; text: string } | null;

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, updateSettings, replaceAll, resetAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

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

  const clientId = () => data.settings.driveClientId?.trim() ?? '';

  async function backup() {
    if (!clientId()) return setMsg({ type: 'err', text: 'Renseigne d’abord un Client ID Google ci-dessus.' });
    setBusy('backup');
    setMsg(null);
    try {
      await backupToDrive(clientId(), data);
      updateSettings({ lastBackupAt: new Date().toISOString() });
      setMsg({ type: 'ok', text: 'Sauvegardé sur Google Drive ✓' });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Échec de la sauvegarde' });
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (!clientId()) return setMsg({ type: 'err', text: 'Renseigne d’abord un Client ID Google ci-dessus.' });
    setBusy('restore');
    setMsg(null);
    try {
      const next = await restoreFromDrive(clientId());
      if (!next) {
        setMsg({ type: 'err', text: 'Aucune sauvegarde trouvée sur Drive.' });
      } else if (confirm('Remplacer les données locales par la sauvegarde Drive ?')) {
        replaceAll(next);
        onClose();
      }
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : 'Échec de la restauration' });
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    if (confirm('Tout effacer ? Cette action est irréversible.')) {
      resetAll();
      onClose();
    }
  }

  const counts = `${data.fuel.length} pleins · ${data.mileage.length} relevés · ${data.maintenance.length} entretiens · ${data.reminders.length} rappels`;

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
          <h3 className="settings-title">
            <IconCloud size={17} /> Sauvegarde Google Drive
          </h3>
          <Field label="Client ID OAuth Google" hint="Console Google Cloud → identifiants OAuth (origine = l'URL de l'app)">
            <Input
              placeholder="xxxx.apps.googleusercontent.com"
              value={data.settings.driveClientId ?? ''}
              onChange={(e) => updateSettings({ driveClientId: e.target.value })}
            />
          </Field>
          <div className="settings-actions">
            <Button variant="ghost" onClick={backup} disabled={!!busy}>
              <IconUpload size={18} /> {busy === 'backup' ? 'Sauvegarde…' : 'Sauvegarder'}
            </Button>
            <Button variant="ghost" onClick={restore} disabled={!!busy}>
              <IconDownload size={18} /> {busy === 'restore' ? 'Restauration…' : 'Restaurer'}
            </Button>
          </div>
          {msg && <p className={`settings-msg ${msg.type}`}>{msg.text}</p>}
          {data.settings.lastBackupAt && (
            <p className="settings-counts">Dernière sauvegarde : {formatDateTime(data.settings.lastBackupAt)}</p>
          )}
        </div>

        <div className="settings-group">
          <h3 className="settings-title">
            <IconFile size={17} /> Données & carnet
          </h3>
          <p className="settings-counts">{counts}</p>
          <Button variant="ghost" onClick={() => printCarnet(data)}>
            <IconPrinter size={18} /> Carnet d'entretien (PDF)
          </Button>
          <Button variant="ghost" onClick={() => downloadCSV(data)}>
            <IconFile size={18} /> Exporter en CSV
          </Button>
          <Button variant="ghost" onClick={exportData}>
            <IconDownload size={18} /> Exporter (JSON)
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <IconUpload size={18} /> Importer un fichier
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>

        <Button variant="danger" onClick={reset}>
          Réinitialiser l'application
        </Button>

        <p className="settings-foot">Soupape — données stockées sur cet appareil (sauf sauvegarde Drive).</p>
      </div>
    </BottomSheet>
  );
}
