import { useRef, useState } from 'react';
import { fileToCompressedDataURL } from '../lib/image';
import { IconCamera, IconClose, IconFile } from './Icons';

const isPdf = (src: string) => src.startsWith('data:application/pdf');

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Lecture impossible'));
    r.readAsDataURL(file);
  });
}

/** Open a stored data URL — via a Blob URL, since iOS blocks navigating to data: URLs. */
function openAttachment(src: string) {
  try {
    const [meta, b64] = src.split(',');
    const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    console.error('Ouverture impossible', err);
  }
}

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
        const pdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        added.push(pdf ? await fileToDataURL(f) : await fileToCompressedDataURL(f));
      } catch (err) {
        console.error('Pièce jointe illisible', err);
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
          {isPdf(src) ? (
            <button type="button" className="photo-open" onClick={() => openAttachment(src)}>
              <IconFile size={22} />
              <span>PDF</span>
            </button>
          ) : (
            <img src={src} alt={`Pièce ${i + 1}`} onClick={() => openAttachment(src)} />
          )}
          <button
            type="button"
            className="photo-remove"
            aria-label="Retirer la pièce jointe"
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={onFiles}
      />
    </div>
  );
}
