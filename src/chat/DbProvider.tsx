import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { ensureSeeded, openChatDb, reseed } from './db';
import { MESSAGE_COUNT } from './generator';

type DbValue = {
  db: SQLiteDatabase | null;
  progress: { done: number; total: number };
  ready: boolean;
  reseedNow: () => void;
};

const DbContext = createContext<DbValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: MESSAGE_COUNT });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opened = await openChatDb();
      if (cancelled) return;
      setDb(opened);
      await ensureSeeded(opened, (done, total) => {
        if (!cancelled) setProgress({ done, total });
      });
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reseedNow = useCallback(() => {
    if (!db) return;
    setReady(false);
    setProgress({ done: 0, total: MESSAGE_COUNT });
    void reseed(db, (done, total) => setProgress({ done, total })).then(() => setReady(true));
  }, [db]);

  const value = useMemo(() => ({ db, progress, ready, reseedNow }), [db, progress, ready, reseedNow]);

  return <DbContext value={value}>{children}</DbContext>;
}

export function useDb(): DbValue {
  const value = use(DbContext);
  if (!value) throw new Error('useDb must be used inside DbProvider');
  return value;
}
