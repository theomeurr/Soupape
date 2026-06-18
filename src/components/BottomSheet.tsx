import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const CLOSE_THRESHOLD = 90; // px de glissement vers le bas pour fermer

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startY: 0, dy: 0 });

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

  // --- Drag-to-dismiss (grab the grip / header and slide down) ---
  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return; // laisse les boutons cliquables
    const el = sheetRef.current;
    if (!el) return;
    drag.current = { active: true, startY: e.clientY, dy: 0 };
    el.style.transition = 'none';
    el.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const el = sheetRef.current;
    if (!el) return;
    const dy = Math.max(0, e.clientY - drag.current.startY);
    drag.current.dy = dy;
    el.style.transform = `translateY(${dy}px)`;
  }

  function onPointerUp() {
    if (!drag.current.active) return;
    const el = sheetRef.current;
    drag.current.active = false;
    if (!el) return;
    el.style.transition = '';
    if (drag.current.dy > CLOSE_THRESHOLD) {
      el.style.transform = 'translateY(100%)';
      onClose();
    } else {
      el.style.transform = '';
    }
  }

  if (!render) return null;

  return createPortal(
    <div className={`sheet-root ${visible ? 'is-open' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet glass" ref={sheetRef} role="dialog" aria-modal="true" aria-label={title}>
        <div
          className="sheet-handle"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-grip" />
          {(title || headerAction) && (
            <header className="sheet-header">
              <h2>{title}</h2>
              {headerAction}
            </header>
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
