import type { Message } from './types.ts';

export type WindowState = {
  /** Bumped on every reset; used to key list remounts and discard stale loads. */
  generation: number;
  hasNewer: boolean;
  hasOlder: boolean;
  /** Always ascending: oldest first, newest last. */
  items: Message[];
  loadingNewer: boolean;
  loadingOlder: boolean;
};

export type WindowEdge = 'newer' | 'older';

export type WindowAction =
  | { type: 'loadStart'; edge: WindowEdge }
  | {
      type: 'loadEnd';
      edge: WindowEdge;
      page: Message[];
      pageSize: number;
      /** null means grow-only. */
      trimCap: number | null;
      /** When present and stale, the action is discarded. */
      generation?: number;
    }
  | { type: 'reset'; items: Message[]; hasOlder: boolean; hasNewer: boolean }
  | { type: 'append'; message: Message };

export const initialWindowState: WindowState = {
  generation: 0,
  hasNewer: true,
  hasOlder: true,
  items: [],
  loadingNewer: false,
  loadingOlder: false,
};

/**
 * Drops whole pages from one end until the window is at or under the cap.
 * Stops before the window would fall to a single page, so trimming can never
 * empty the list.
 */
function trim(
  items: Message[],
  pageSize: number,
  cap: number,
  dropFrom: WindowEdge,
): { dropped: boolean; items: Message[] } {
  let next = items;
  let dropped = false;
  while (next.length > cap && next.length - pageSize >= pageSize) {
    next = dropFrom === 'older' ? next.slice(pageSize) : next.slice(0, next.length - pageSize);
    dropped = true;
  }
  return { dropped, items: next };
}

export function windowReducer(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case 'reset':
      return {
        generation: state.generation + 1,
        hasNewer: action.hasNewer,
        hasOlder: action.hasOlder,
        items: [...action.items],
        loadingNewer: false,
        loadingOlder: false,
      };

    case 'loadStart':
      return action.edge === 'older'
        ? { ...state, loadingOlder: true }
        : { ...state, loadingNewer: true };

    case 'loadEnd': {
      if (action.generation !== undefined && action.generation !== state.generation) {
        return state;
      }

      const loadingCleared =
        action.edge === 'older' ? { loadingOlder: false } : { loadingNewer: false };

      if (action.page.length === 0) {
        return {
          ...state,
          ...loadingCleared,
          ...(action.edge === 'older' ? { hasOlder: false } : { hasNewer: false }),
        };
      }

      const merged =
        action.edge === 'older'
          ? [...action.page, ...state.items]
          : [...state.items, ...action.page];

      if (action.trimCap === null) {
        return { ...state, ...loadingCleared, items: merged };
      }

      // Trim from the end opposite the one that just loaded.
      const { dropped, items } = trim(
        merged,
        action.pageSize,
        action.trimCap,
        action.edge === 'older' ? 'newer' : 'older',
      );

      return {
        ...state,
        ...loadingCleared,
        items,
        ...(dropped && action.edge === 'older' ? { hasNewer: true } : null),
        ...(dropped && action.edge === 'newer' ? { hasOlder: true } : null),
      };
    }

    case 'append':
      return { ...state, items: [...state.items, action.message] };

    default:
      return state;
  }
}
