import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mulberry32 } from './random.ts';

test('mulberry32 is deterministic for a given seed', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const first = Array.from({ length: 100 }, () => a());
  const second = Array.from({ length: 100 }, () => b());
  assert.deepEqual(first, second);
});

test('mulberry32 produces values in [0, 1)', () => {
  const rng = mulberry32(7);
  for (let i = 0; i < 10_000; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1, `out of range: ${value}`);
  }
});

test('different seeds produce different streams', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  assert.notEqual(a(), b());
});
