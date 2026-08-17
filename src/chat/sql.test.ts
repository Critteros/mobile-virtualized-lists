import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

import { generateCorpus, SEED } from './generator.ts';
import {
  CREATE_MESSAGES,
  insertParams,
  mapRow,
  SELECT_BOUNDS,
  SELECT_FIRST_PAGE,
  SELECT_LATEST_PAGE,
  SELECT_MIDDLE_ID,
  SELECT_PAGE_AFTER,
  SELECT_PAGE_BEFORE,
  type MessageRow,
} from './sql.ts';
import type { Message } from './types.ts';

const CORPUS = generateCorpus(2000, SEED);

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(CREATE_MESSAGES);
  const insert = db.prepare(
    'INSERT INTO messages (id, ts, author, kind, body, media_url, poster_url, media_w, media_h) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  for (const message of CORPUS) {
    insert.run(...(insertParams(message) as never[]));
  }
  return db;
}

const rows = (db: DatabaseSync, sql: string, ...params: unknown[]): Message[] =>
  (db.prepare(sql).all(...(params as never[])) as unknown as MessageRow[]).map(mapRow);

test('rows come back in id order matching generation order', () => {
  const db = makeDb();
  const all = rows(db, SELECT_FIRST_PAGE, CORPUS.length);
  assert.deepEqual(
    all.map((m) => m.id),
    CORPUS.map((m) => m.id),
  );
});

test('mapRow round-trips every field', () => {
  const db = makeDb();
  const [first] = rows(db, SELECT_FIRST_PAGE, 1);
  assert.deepEqual(first, CORPUS[0]);
});

test('paging backwards covers the corpus exactly once', () => {
  const db = makeDb();
  const pageSize = 40;
  let page = rows(db, SELECT_LATEST_PAGE, pageSize).reverse();
  const seen: Message[] = [...page];

  while (page.length === pageSize) {
    page = rows(db, SELECT_PAGE_BEFORE, seen[0].id, pageSize).reverse();
    seen.unshift(...page);
  }

  assert.equal(seen.length, CORPUS.length);
  assert.deepEqual(
    seen.map((m) => m.id),
    CORPUS.map((m) => m.id),
  );
  assert.equal(new Set(seen.map((m) => m.id)).size, CORPUS.length);
});

test('paging forwards covers the corpus exactly once', () => {
  const db = makeDb();
  const pageSize = 40;
  let page = rows(db, SELECT_FIRST_PAGE, pageSize);
  const seen: Message[] = [...page];

  while (page.length === pageSize) {
    page = rows(db, SELECT_PAGE_AFTER, seen[seen.length - 1].id, pageSize);
    seen.push(...page);
  }

  assert.equal(seen.length, CORPUS.length);
  assert.deepEqual(
    seen.map((m) => m.id),
    CORPUS.map((m) => m.id),
  );
});

test('page boundaries are exclusive — no duplicate at the seam', () => {
  const db = makeDb();
  const first = rows(db, SELECT_FIRST_PAGE, 10);
  const second = rows(db, SELECT_PAGE_AFTER, first[9].id, 10);
  assert.equal(second[0].id, CORPUS[10].id);
  assert.ok(!second.some((m) => first.some((f) => f.id === m.id)));
});

test('getAround is symmetric and contiguous', () => {
  const db = makeDb();
  const middleId = (db.prepare(SELECT_MIDDLE_ID).get(Math.floor(CORPUS.length / 2)) as { id: string })
    .id;
  const half = 20;
  const before = rows(db, SELECT_PAGE_BEFORE, middleId, half).reverse();
  const after = rows(db, SELECT_PAGE_AFTER, middleId, half);
  const middleRow = rows(db, SELECT_PAGE_BEFORE, after[0].id, 1);
  const around = [...before, ...middleRow, ...after];

  assert.equal(before.length, half);
  assert.equal(after.length, half);

  const start = CORPUS.findIndex((m) => m.id === around[0].id);
  assert.deepEqual(
    around.map((m) => m.id),
    CORPUS.slice(start, start + around.length).map((m) => m.id),
  );
});

test('bounds report the true extremes and count', () => {
  const db = makeDb();
  const bounds = db.prepare(SELECT_BOUNDS).get() as {
    count: number;
    maxId: string;
    minId: string;
  };
  assert.equal(bounds.count, CORPUS.length);
  assert.equal(bounds.minId, CORPUS[0].id);
  assert.equal(bounds.maxId, CORPUS[CORPUS.length - 1].id);
});

test('paging past the ends returns empty, not an error', () => {
  const db = makeDb();
  assert.equal(rows(db, SELECT_PAGE_BEFORE, CORPUS[0].id, 40).length, 0);
  assert.equal(rows(db, SELECT_PAGE_AFTER, CORPUS[CORPUS.length - 1].id, 40).length, 0);
});
