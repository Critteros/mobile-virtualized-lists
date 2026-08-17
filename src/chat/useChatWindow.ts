import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getAround,
  getBounds,
  getFirstPage,
  getLatestPage,
  getMiddleId,
  getPageAfter,
  getPageBefore,
  insertOutgoing,
} from './db';
import { useSettings } from './settings';
import { initialWindowState, windowReducer, type WindowState } from './window-reducer';

export type JumpTarget = 'latest' | 'middle' | 'start';

export type ChatWindow = {
  jumpTo: (target: JumpTarget) => void;
  loadNewer: () => void;
  loadOlder: () => void;
  sendMessage: (body: string) => void;
  state: WindowState;
  /** Ascending index the list should be positioned at after the last reset. */
  targetIndex: number;
};

export function useChatWindow(db: SQLiteDatabase | null): ChatWindow {
  const { settings } = useSettings();
  const [state, dispatch] = useReducer(windowReducer, initialWindowState);
  const [targetIndex, setTargetIndex] = useState(0);

  // Mirrors which edges have a request in flight, so callbacks stay stable
  // and never fire twice for the same edge concurrently.
  const inFlight = useRef({ newer: false, older: false });

  const load = useCallback(
    async (edge: 'newer' | 'older') => {
      if (!db) return;
      if (inFlight.current[edge]) return;

      const items = state.items;
      if (items.length === 0) return;
      if (edge === 'older' && !state.hasOlder) return;
      if (edge === 'newer' && !state.hasNewer) return;

      inFlight.current[edge] = true;
      const requestGeneration = state.generation;
      dispatch({ type: 'loadStart', edge });

      try {
        const page =
          edge === 'older'
            ? await getPageBefore(db, items[0].id, settings.pageSize)
            : await getPageAfter(db, items[items.length - 1].id, settings.pageSize);

        dispatch({
          type: 'loadEnd',
          edge,
          page,
          pageSize: settings.pageSize,
          trimCap: settings.trimCap,
          generation: requestGeneration,
        });
      } catch (error) {
        console.warn(`[useChatWindow] load(${edge}) failed:`, error);
        dispatch({ type: 'loadFail', edge, generation: requestGeneration });
      } finally {
        inFlight.current[edge] = false;
      }
    },
    [
      db,
      settings.pageSize,
      settings.trimCap,
      state.generation,
      state.hasNewer,
      state.hasOlder,
      state.items,
    ],
  );

  const loadOlder = useCallback(() => {
    void load('older');
  }, [load]);

  const loadNewer = useCallback(() => {
    void load('newer');
  }, [load]);

  const jumpTo = useCallback(
    async (target: JumpTarget) => {
      if (!db) return;
      inFlight.current.newer = false;
      inFlight.current.older = false;

      if (target === 'start') {
        const items = await getFirstPage(db, settings.pageSize);
        dispatch({ type: 'reset', items, hasOlder: false, hasNewer: true });
        setTargetIndex(0);
        return;
      }

      if (target === 'latest') {
        const items = await getLatestPage(db, settings.pageSize);
        dispatch({ type: 'reset', items, hasOlder: true, hasNewer: false });
        setTargetIndex(Math.max(0, items.length - 1));
        return;
      }

      const middleId = await getMiddleId(db);
      if (!middleId) return;
      const items = await getAround(db, middleId, settings.pageSize);
      dispatch({ type: 'reset', items, hasOlder: true, hasNewer: true });
      setTargetIndex(items.findIndex((m) => m.id === middleId));
    },
    [db, settings.pageSize],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!db || body.trim().length === 0) return;
      const message = await insertOutgoing(db, body.trim());
      // Only meaningful when the window already reaches the newest message.
      if (!state.hasNewer) dispatch({ type: 'append', message });
    },
    [db, state.hasNewer],
  );

  // Open at the bottom of the channel.
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      const { count } = await getBounds(db);
      if (cancelled || count === 0) return;
      const items = await getLatestPage(db, settings.pageSize);
      if (cancelled) return;
      dispatch({ type: 'reset', items, hasOlder: true, hasNewer: false });
      setTargetIndex(Math.max(0, items.length - 1));
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally runs once per mount: the initial window is not re-fetched
    // when the page size changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  return {
    jumpTo: useCallback((target: JumpTarget) => void jumpTo(target), [jumpTo]),
    loadNewer,
    loadOlder,
    sendMessage: useCallback((body: string) => void sendMessage(body), [sendMessage]),
    state,
    targetIndex,
  };
}
