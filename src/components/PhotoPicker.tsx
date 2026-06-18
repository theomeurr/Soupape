import { useRef, useState } from 'react';
import { fileToCompressedDataURL } from '../lib/image';
import { IconCamera, IconClose } from './Icons';

export function PhotoPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    const added: string[] = [];
    for (const f of files) {
      try {
        added.push(await fileToCompressedDataURL(f));
      } catch (err) {
        console.error('Photo illisible', err);
      }
    }
    onChange([...value, ...added]);
    setBusy(false);
    e.target.value = '';
  }

  return (
    <div className="photos-grid">
      {value.map((src, i) => (
        <div className="photo-thumb" key={i}>
          <img src={src} alt={`Facture ${i + 1}`} />
          <button
            type="button"
            className="photo-remove"
            aria-label="Retirer la photo"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="photo-add" onClick={() => inputRef.current?.click()} disabled={busy}>
        <IconCamera size={22} />
        <span>{busy ? '…' : 'Ajouter'}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
    </div>
  );
}
