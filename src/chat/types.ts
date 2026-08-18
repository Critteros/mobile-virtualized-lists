import type { ReactElement, Ref } from 'react';

export type MessageKind = 'text' | 'image' | 'video';

/** One chat message. Field names are camelCase; the SQLite columns are snake_case. */
export type Message = {
  /** UUIDv7. Sole identity and sole pagination cursor. */
  id: string;
  /** Milliseconds since epoch. Strictly increasing across the corpus. */
  ts: number;
  /** 0 = me, 1..3 = other participants. */
  author: number;
  kind: MessageKind;
  /** Text body for `text` messages, otherwise null. */
  body: string | null;
  /** Image or video URL, otherwise null. */
  mediaUrl: string | null;
  /** Poster URL for `video` messages, otherwise null. */
  posterUrl: string | null;
  /** Intrinsic media width, or null when the height is unknown until load. */
  mediaW: number | null;
  /** Intrinsic media height, or null when the height is unknown until load. */
  mediaH: number | null;
};

export type ChatListHandle = {
  scrollToBottom: () => void;
  scrollToIndex: (index: number, position?: 'bottom' | 'center' | 'top') => void;
};

/**
 * The whole surface an engine has to satisfy. Deliberately says nothing about
 * how a list should be configured — the differences between engines are the
 * point of the demo, not something to normalise away.
 */
export type ChatListProps = {
  /** Always ascending, oldest first. Engines reverse it themselves if inverted. */
  items: Message[];
  /** `index` is always in ascending-index space. */
  renderItem: (message: Message, index: number) => ReactElement;
  onOlderNeeded: () => void;
  onNewerNeeded: () => void;
  loadingOlder: boolean;
  loadingNewer: boolean;
  /** False once the window reaches the newest message in the corpus. */
  hasNewer: boolean;
  /** Ascending index to open at. */
  initialScrollIndex?: number;
  inverted?: boolean;
  ref?: Ref<ChatListHandle>;
};
