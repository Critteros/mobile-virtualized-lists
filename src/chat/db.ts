import { Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import { CORPUS_START_TS, generateCorpusIter, MESSAGE_COUNT, SEED } from './generator';
import {
  CREATE_MESSAGES,
  CREATE_META,
  DROP_MESSAGES,
  INSERT_MESSAGE,
  insertParams,
  mapRow,
  SELECT_BOUNDS,
  SELECT_BY_ID,
  SELECT_FIRST_PAGE,
  SELECT_LATEST_PAGE,
  SELECT_META,
  SELECT_MIDDLE_ID,
  SELECT_PAGE_AFTER,
  SELECT_PAGE_BEFORE,
  UPSERT_META,
  type MessageRow,
} from './sql';
import type { Message } from './types';
import { createIdFactory } from './uuidv7';

export type SeedProgress = (done: number, total: number) => void;

const DATABASE_NAME = 'chat.db';
const SEED_VERSION = '1';
const BATCH_SIZE = 5000;

/** Artificial delay on every query, so pagination is genuinely asynchronous. */
let latencyMs = 250;

export function setLatency(ms: number): void {
  latencyMs = Math.max(0, ms);
}

export function getLatency(): number {
  return latencyMs;
}

function withLatency<T>(run: () => Promise<T>): Promise<T> {
  if (latencyMs === 0) return run();
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      run().then(resolve, reject);
    }, latencyMs);
  });
}

/**
 * The corpus lives in the cache directory: it survives app restarts but not a
 * cache clear, which is exactly the persistence the demo asks for.
 */
export async function openChatDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME, undefined, Paths.cache.uri);
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync(CREATE_META);
  await db.execAsync(CREATE_MESSAGES);
  return db;
}

async function seedVersion(db: SQLite.SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(SELECT_META, 'seed_version');
  return row?.value ?? null;
}

async function seed(db: SQLite.SQLiteDatabase, onProgress: SeedProgress): Promise<void> {
  const statement = await db.prepareAsync(INSERT_MESSAGE);
  try {
    let batch: Message[] = [];
    let done = 0;

    const flush = async () => {
      if (batch.length === 0) return;
      const pending = batch;
      batch = [];
      await db.withTransactionAsync(async () => {
        for (const message of pending) {
          await statement.executeAsync(insertParams(message));
        }
      });
      done += pending.length;
      onProgress(done, MESSAGE_COUNT);
    };

    // Driving the generator directly is the point: the flush is awaited
    // inside the loop, so peak memory is one batch rather than the whole
    // 100k-row corpus.
    for (const message of generateCorpusIter(MESSAGE_COUNT, SEED)) {
      batch.push(message);
      if (batch.length >= BATCH_SIZE) {
        await flush();
      }
    }
    await flush();
  } finally {
    await statement.finalizeAsync();
  }

  await db.runAsync(UPSERT_META, 'seed_version', SEED_VERSION);
}

export async function ensureSeeded(
  db: SQLite.SQLiteDatabase,
  onProgress: SeedProgress,
): Promise<void> {
  if ((await seedVersion(db)) === SEED_VERSION) {
    onProgress(MESSAGE_COUNT, MESSAGE_COUNT);
    return;
  }
  await db.execAsync(DROP_MESSAGES);
  await db.execAsync(CREATE_MESSAGES);
  await seed(db, onProgress);
}

export async function reseed(db: SQLite.SQLiteDatabase, onProgress: SeedProgress): Promise<void> {
  await db.runAsync(UPSERT_META, 'seed_version', '');
  await ensureSeeded(db, onProgress);
}

const query = (db: SQLite.SQLiteDatabase, sql: string, ...params: SQLite.SQLiteBindValue[]) =>
  withLatency(async () => (await db.getAllAsync<MessageRow>(sql, ...params)).map(mapRow));

/** Ascending: the n messages immediately older than `id`, excluding it. */
export async function getPageBefore(
  db: SQLite.SQLiteDatabase,
  id: string,
  n: number,
): Promise<Message[]> {
  return (await query(db, SELECT_PAGE_BEFORE, id, n)).reverse();
}

export function getPageAfter(
  db: SQLite.SQLiteDatabase,
  id: string,
  n: number,
): Promise<Message[]> {
  return query(db, SELECT_PAGE_AFTER, id, n);
}

export function getFirstPage(db: SQLite.SQLiteDatabase, n: number): Promise<Message[]> {
  return query(db, SELECT_FIRST_PAGE, n);
}

export async function getLatestPage(db: SQLite.SQLiteDatabase, n: number): Promise<Message[]> {
  return (await query(db, SELECT_LATEST_PAGE, n)).reverse();
}

/** Ascending window centred on `id`, which is included in the result. */
export async function getAround(
  db: SQLite.SQLiteDatabase,
  id: string,
  n: number,
): Promise<Message[]> {
  const half = Math.floor(n / 2);
  const [before, after] = await Promise.all([
    getPageBefore(db, id, half),
    getPageAfter(db, id, half),
  ]);
  const anchor = await withLatency(async () => {
    const row = await db.getFirstAsync<MessageRow>(SELECT_BY_ID, id);
    return row ? [mapRow(row)] : [];
  });
  return [...before, ...anchor, ...after];
}

export async function getMiddleId(db: SQLite.SQLiteDatabase): Promise<string | null> {
  const bounds = await getBounds(db);
  if (bounds.count === 0) return null;
  const row = await withLatency(() =>
    db.getFirstAsync<{ id: string }>(SELECT_MIDDLE_ID, Math.floor(bounds.count / 2)),
  );
  return row?.id ?? null;
}

export function getBounds(
  db: SQLite.SQLiteDatabase,
): Promise<{ count: number; maxId: string | null; minId: string | null }> {
  return withLatency(async () => {
    const row = await db.getFirstAsync<{
      count: number;
      maxId: string | null;
      minId: string | null;
    }>(SELECT_BOUNDS);
    return row ?? { count: 0, maxId: null, minId: null };
  });
}

/**
 * Outgoing messages use wall-clock time. The corpus starts at CORPUS_START_TS
 * and always ends well before today, so a fresh id sorts after every seeded
 * one; the guard keeps that true even if the corpus constants change.
 */
const nextOutgoingId = createIdFactory(() => Math.random());

export async function insertOutgoing(db: SQLite.SQLiteDatabase, body: string): Promise<Message> {
  const { count } = await getBounds(db);
  const { id, ts } = nextOutgoingId(Math.max(Date.now(), CORPUS_START_TS + count + 1));
  const message: Message = {
    id,
    ts,
    author: 0,
    kind: 'text',
    body,
    mediaUrl: null,
    posterUrl: null,
    mediaW: null,
    mediaH: null,
  };
  await db.runAsync(INSERT_MESSAGE, insertParams(message));
  return message;
}
