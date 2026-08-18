import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimateRowHeight } from './item-size.ts';
import type { Message } from './types.ts';

const WIDTH = 390;
const DAY = 24 * 60 * 60 * 1000;

const base: Message = {
  id: 'x',
  ts: new Date(2024, 0, 2, 12).getTime(),
  author: 1,
  kind: 'text',
  body: 'hi',
  mediaUrl: null,
  posterUrl: null,
  mediaW: null,
  mediaH: null,
};
const sameDay: Message = { ...base, ts: base.ts - 60_000 };
const dayBefore: Message = { ...base, ts: base.ts - DAY };

test('a longer body wraps onto more lines', () => {
  const short = estimateRowHeight(base, sameDay, WIDTH);
  const long = estimateRowHeight({ ...base, body: 'w'.repeat(400) }, sameDay, WIDTH);
  assert.ok(long > short, `${long} should exceed ${short}`);
});

test('a narrower viewport wraps the same body onto more lines', () => {
  const body = { ...base, body: 'w'.repeat(200) };
  assert.ok(estimateRowHeight(body, sameDay, 320) > estimateRowHeight(body, sameDay, 768));
});

test('a day separator and an author label each add height', () => {
  const plain = estimateRowHeight(base, sameDay, WIDTH);
  assert.ok(estimateRowHeight(base, dayBefore, WIDTH) > plain, 'day separator');
  assert.ok(estimateRowHeight({ ...base, author: 0 }, sameDay, WIDTH) < plain, 'author label');
});

test('media height follows the aspect ratio the row declares', () => {
  const wide = { ...base, kind: 'image' as const, mediaW: 800, mediaH: 400 };
  const tall = { ...wide, mediaW: 400, mediaH: 800 };
  assert.ok(estimateRowHeight(tall, sameDay, WIDTH) > estimateRowHeight(wide, sameDay, WIDTH));
});

test('an image with no dimensions falls back to a nominal ratio', () => {
  const unsized = estimateRowHeight({ ...base, kind: 'image' }, sameDay, WIDTH);
  const wide = { ...base, kind: 'image' as const, mediaW: 1200, mediaH: 400 };
  const tall = { ...wide, mediaW: 400, mediaH: 1200 };
  assert.ok(unsized > estimateRowHeight(wide, sameDay, WIDTH));
  assert.ok(unsized < estimateRowHeight(tall, sameDay, WIDTH));
});
