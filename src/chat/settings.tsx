import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { setLatency } from './db';

export type JumpMode = 'imperative' | 'remount';

export type ChatSettings = {
  /** Remount keys the list on `generation`; imperative replaces data and scrolls. */
  jumpMode: JumpMode;
  latencyMs: number;
  pageSize: number;
  /** Legend List only. */
  recycleItems: boolean;
  /** null means grow-only. */
  trimCap: number | null;
};

export const DEFAULT_SETTINGS: ChatSettings = {
  jumpMode: 'remount',
  latencyMs: 250,
  pageSize: 40,
  recycleItems: true,
  trimCap: null,
};

type SettingsValue = {
  settings: ChatSettings;
  update: (patch: Partial<ChatSettings>) => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);

  const update = useCallback((patch: Partial<ChatSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (patch.latencyMs !== undefined) setLatency(patch.latencyMs);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);

  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings(): SettingsValue {
  const value = use(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
