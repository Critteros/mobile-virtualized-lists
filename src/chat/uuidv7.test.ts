import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mulberry32 } from './random.ts';
import { createIdFactory, uuidv7 } from './uuidv7.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('uuidv7 has the canonical shape, version 7 and variant 10', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const id = uuidv7(Date.UTC(2024, 0, 1) + i, rng);
    assert.match(id, UUID_RE);
  }
});

test('uuidv7 is lowercase only', () => {
  const rng = mulberry32(2);
  const id = uuidv7(Date.UTC(2024, 0, 1), rng);
  assert.equal(id, id.toLowerCase());
});

test('uuidv7 encodes the timestamp in the leading 48 bits', () => {
  const rng = mulberry32(3);
  const ts = Date.UTC(2024, 5, 15, 12, 30, 45, 123);
  const id = uuidv7(ts, rng);
  const hex = id.replace(/-/g, '').slice(0, 12);
  assert.equal(Number.parseInt(hex, 16), ts);
});

test('uuidv7 is deterministic for the same seed and timestamp', () => {
  const ts = Date.UTC(2024, 0, 1);
  assert.equal(uuidv7(ts, mulberry32(9)), uuidv7(ts, mulberry32(9)));
});

test('createIdFactory forces strictly increasing timestamps', () => {
  const next = createIdFactory(mulberry32(4));
  const a = next(1000);
  const b = next(1000);
  const c = next(500);
  assert.equal(a.ts, 1000);
  assert.equal(b.ts, 1001);
  assert.equal(c.ts, 1002);
});

test('createIdFactory ids sort lexicographically in generation order', () => {
  const next = createIdFactory(mulberry32(5));
  const ids: string[] = [];
  let ts = Date.UTC(2023, 0, 1);
  for (let i = 0; i < 20_000; i++) {
    ts += Math.floor(mulberry32(i)() * 3);
    ids.push(next(ts).id);
  }
  for (let i = 1; i < ids.length; i++) {
    assert.ok(ids[i - 1] < ids[i], `order broke at ${i}: ${ids[i - 1]} !< ${ids[i]}`);
  }
});
