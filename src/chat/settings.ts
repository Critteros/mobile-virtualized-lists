import { create } from 'zustand';

import { setLatency } from './db';

export type ChatSettings = {
  /** Off makes every image ignore its known size and grow on load. */
  imagePlaceholders: boolean;
  latencyMs: number;
  pageSize: number;
  /** Legend List only. */
  recycleItems: boolean;
};

export const DEFAULT_SETTINGS: ChatSettings = {
  imagePlaceholders: true,
  latencyMs: 250,
  pageSize: 40,
  recycleItems: true,
};

type SettingsStore = ChatSettings & {
  update: (patch: Partial<ChatSettings>) => void;
};

/** Read one value at a time: `useSettings((s) => s.pageSize)`. */
export const useSettings = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  update: (patch) => {
    // Latency lives in a module value the query helpers read directly.
    if (patch.latencyMs !== undefined) setLatency(patch.latencyMs);
    set(patch);
  },
}));
