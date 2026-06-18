import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppData, CollectionKey, EntryMap, Settings } from '../types';
import { DEFAULT_DATA, loadData, newId, saveData } from './db';

interface StoreContextValue {
  data: AppData;
  /** Add an entry to a collection, returning the generated id. */
  add<K extends CollectionKey>(key: K, entry: Omit<EntryMap[K], 'id'>): string;
  update<K extends CollectionKey>(key: K, id: string, patch: Partial<EntryMap[K]>): void;
  remove(key: CollectionKey, id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  replaceAll(next: AppData): void;
  resetAll(): void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    loadData().then(setData);
  }, []);

  // Persist on change (debounced to the next frame to batch bursts).
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (!data) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => void saveData(data));
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [data]);

  const add = useCallback(<K extends CollectionKey>(key: K, entry: Omit<EntryMap[K], 'id'>) => {
    const id = newId();
    setData((prev) =>
      prev ? { ...prev, [key]: [...(prev[key] as EntryMap[K][]), { ...entry, id } as EntryMap[K]] } : prev,
    );
    return id;
  }, []);

  const update = useCallback(
    <K extends CollectionKey>(key: K, id: string, patch: Partial<EntryMap[K]>) => {
      setData((prev) =>
        prev
          ? { ...prev, [key]: (prev[key] as EntryMap[K][]).map((e) => (e.id === id ? { ...e, ...patch } : e)) }
          : prev,
      );
    },
    [],
  );

  const remove = useCallback((key: CollectionKey, id: string) => {
    setData((prev) =>
      prev ? { ...prev, [key]: (prev[key] as { id: string }[]).filter((e) => e.id !== id) } : prev,
    );
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...patch } } : prev));
  }, []);

  const replaceAll = useCallback((next: AppData) => setData(next), []);
  const resetAll = useCallback(() => setData(structuredClone(DEFAULT_DATA)), []);

  const value = useMemo<StoreContextValue>(
    () => ({ data: data ?? DEFAULT_DATA, add, update, remove, updateSettings, replaceAll, resetAll }),
    [data, add, update, remove, updateSettings, replaceAll, resetAll],
  );

  if (!data) {
    return (
      <div className="splash">
        <span className="splash-mark" />
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return ctx;
}
