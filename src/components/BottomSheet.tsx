import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Optional action shown top-right of the header (e.g. a delete button). */
  headerAction?: ReactNode;
}

export function BottomSheet({ open, onClose, title, children, headerAction }: BottomSheetProps) {
  const [render, setRender] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const id = setTimeout(() => setRender(false), 320);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!render) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [render, onClose]);

  if (!render) return null;

  return createPortal(
    <div className={`sheet-root ${visible ? 'is-open' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet glass" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" onClick={onClose} />
        {(title || headerAction) && (
          <header className="sheet-header">
            <h2>{title}</h2>
            {headerAction}
          </header>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
