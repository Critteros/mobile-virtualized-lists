import type { Message, MessageKind } from './types.ts';

/** The raw row shape SQLite returns. Columns are snake_case. */
export type MessageRow = {
  author: number;
  body: string | null;
  id: string;
  kind: string;
  media_h: number | null;
  media_url: string | null;
  media_w: number | null;
  poster_url: string | null;
  ts: number;
};

export const CREATE_MESSAGES = `
CREATE TABLE IF NOT EXISTS messages (
  id         TEXT    PRIMARY KEY,
  ts         INTEGER NOT NULL,
  author     INTEGER NOT NULL,
  kind       TEXT    NOT NULL,
  body       TEXT,
  media_url  TEXT,
  poster_url TEXT,
  media_w    INTEGER,
  media_h    INTEGER
)`;

export const CREATE_META = `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`;

export const PRAGMA_WAL_MODE = `PRAGMA journal_mode = WAL`;

export const DROP_MESSAGES = `DROP TABLE IF EXISTS messages`;

export const INSERT_MESSAGE = `INSERT INTO messages (id, ts, author, kind, body, media_url, poster_url, media_w, media_h) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/** Newest-first; callers reverse to ascending. Exclusive of the cursor row. */
export const SELECT_PAGE_BEFORE = `SELECT * FROM messages WHERE id < ? ORDER BY id DESC LIMIT ?`;

export const SELECT_PAGE_AFTER = `SELECT * FROM messages WHERE id > ? ORDER BY id ASC LIMIT ?`;

export const SELECT_FIRST_PAGE = `SELECT * FROM messages ORDER BY id ASC LIMIT ?`;

/** Newest-first; callers reverse to ascending. */
export const SELECT_LATEST_PAGE = `SELECT * FROM messages ORDER BY id DESC LIMIT ?`;

/** The anchor row for a middle jump. */
export const SELECT_BY_ID = `SELECT * FROM messages WHERE id = ?`;

/** The only OFFSET query. Runs once per middle jump, never in the scroll path. */
export const SELECT_MIDDLE_ID = `SELECT id FROM messages ORDER BY id LIMIT 1 OFFSET ?`;

export const SELECT_BOUNDS = `SELECT MIN(id) AS minId, MAX(id) AS maxId, COUNT(*) AS count FROM messages`;

export const SELECT_META = `SELECT value FROM meta WHERE key = ?`;

export const UPSERT_META = `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;

export function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    ts: row.ts,
    author: row.author,
    kind: row.kind as MessageKind,
    body: row.body,
    mediaUrl: row.media_url,
    posterUrl: row.poster_url,
    mediaW: row.media_w,
    mediaH: row.media_h,
  };
}

export function insertParams(message: Message): (string | number | null)[] {
  return [
    message.id,
    message.ts,
    message.author,
    message.kind,
    message.body,
    message.mediaUrl,
    message.posterUrl,
    message.mediaW,
    message.mediaH,
  ];
}
