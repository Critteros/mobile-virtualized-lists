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
