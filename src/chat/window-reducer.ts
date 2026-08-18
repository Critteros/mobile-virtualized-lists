import type { Message } from './types.ts';

export type WindowState = {
  /** Bumped on every reset, which is how a jump discards stale loads. */
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
      /** When present and stale, the action is discarded. */
      generation?: number;
    }
  | { type: 'reset'; items: Message[]; hasOlder: boolean; hasNewer: boolean }
  | { type: 'append'; message: Message }
  | {
      type: 'loadFail';
      edge: WindowEdge;
      /** When present and stale, the action is discarded. */
      generation?: number;
    };

export const initialWindowState: WindowState = {
  generation: 0,
  hasNewer: true,
  hasOlder: true,
  items: [],
  loadingNewer: false,
  loadingOlder: false,
};

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

      const items =
        action.edge === 'older'
          ? [...action.page, ...state.items]
          : [...state.items, ...action.page];

      return { ...state, ...loadingCleared, items };
    }

    case 'append':
      return { ...state, items: [...state.items, action.message] };

    case 'loadFail': {
      if (action.generation !== undefined && action.generation !== state.generation) {
        return state;
      }

      return action.edge === 'older'
        ? { ...state, loadingOlder: false }
        : { ...state, loadingNewer: false };
    }

    default:
      return state;
  }
}
