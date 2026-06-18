import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { DOCUMENT_TYPES, type DocumentItem, type DocumentType } from '../types';
import { formatDate } from '../lib/format';
import { BottomSheet } from './BottomSheet';
import { PhotoPicker } from './PhotoPicker';
import { Button, Field, Input, Select } from './UI';
import { IconFolder, IconPlus, IconTrash } from './Icons';

interface DForm {
  title: string;
  type: DocumentType;
  expiryDate: string;
  reference: string;
  note: string;
  photos: string[];
}

const emptyForm = (): DForm => ({ title: '', type: 'Carte grise', expiryDate: '', reference: '', note: '', photos: [] });

function expiryBadge(iso?: string): { text: string; cls: string } | null {
  if (!iso) return null;
  const days = Math.round((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: 'expiré', cls: 'overdue' };
  if (days <= 30) return { text: `dans ${days} j`, cls: 'soon' };
  return { text: formatDate(iso), cls: 'ok' };
}

export function DocumentsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, add, update, remove } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DForm>(emptyForm);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setEditOpen(true);
  }

  function openEdit(d: DocumentItem) {
    setEditingId(d.id);
    setForm({
      title: d.title,
      type: d.type,
      expiryDate: d.expiryDate ?? '',
      reference: d.reference ?? '',
      note: d.note ?? '',
      photos: d.photos ?? [],
    });
    setEditOpen(true);
  }

  function submit() {
    const payload: Omit<DocumentItem, 'id'> = {
      title: form.title.trim() || form.type,
      type: form.type,
      expiryDate: form.expiryDate || undefined,
      reference: form.reference.trim() || undefined,
      note: form.note.trim() || undefined,
      photos: form.photos.length ? form.photos : undefined,
    };
    if (editingId) update('documents', editingId, payload);
    else add('documents', payload);
    setEditOpen(false);
  }

  function del() {
    if (editingId) remove('documents', editingId);
    setEditOpen(false);
  }

  const docs = data.documents;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Documents"
      headerAction={
        <button type="button" className="icon-btn" onClick={openAdd} aria-label="Ajouter un document">
          <IconPlus size={20} />
        </button>
      }
    >
      {docs.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <IconFolder size={30} />
          </div>
          <h3>Aucun document</h3>
          <p>Range ici carte grise, assurance, contrôle technique, garanties…</p>
        </div>
      ) : (
        <div className="list">
          {docs.map((d) => {
            const badge = expiryBadge(d.expiryDate);
            return (
              <button key={d.id} type="button" className="row" onClick={() => openEdit(d)}>
                <div className="row-main">
                  <span className="row-title">{d.title}</span>
                  <span className="row-subtitle">
                    {d.type}
                    {d.photos?.length ? ` · 📎${d.photos.length}` : ''}
                  </span>
                </div>
                {badge && <span className={`doc-badge ${badge.cls}`}>{badge.text}</span>}
              </button>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editingId ? 'Modifier le document' : 'Nouveau document'}
        headerAction={
          editingId ? (
            <button type="button" className="icon-btn danger" onClick={del} aria-label="Supprimer">
              <IconTrash size={20} />
            </button>
          ) : undefined
        }
      >
        <div className="form">
          <div className="form-row">
            <Field label="Intitulé">
              <Input
                placeholder="Assurance auto"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DocumentType })}>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Échéance" hint="optionnel">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </Field>
            <Field label="Référence" hint="n° contrat, plaque…">
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </Field>
          </div>
          <Field label="Note">
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Field label="Photos / scans">
            <PhotoPicker value={form.photos} onChange={(photos) => setForm({ ...form, photos })} />
          </Field>
          <Button onClick={submit}>{editingId ? 'Enregistrer' : 'Ajouter le document'}</Button>
        </div>
      </BottomSheet>
    </BottomSheet>
  );
}
