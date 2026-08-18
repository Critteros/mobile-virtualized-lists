import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isDayBoundary } from './day-boundary.ts';
import type { Message } from './types.ts';

const at = (ts: number): Message => ({
  id: 'x', ts, author: 0, kind: 'text', body: 'hi',
  mediaUrl: null, posterUrl: null, mediaW: null, mediaH: null,
});

test('the first message always starts a day', () => {
  assert.equal(isDayBoundary(at(Date.UTC(2024, 0, 1)), null), true);
});

test('same calendar day is not a boundary', () => {
  // isDayBoundary reads local calendar-day getters, so these fixtures use the
  // local Date constructor (not Date.UTC) to stay timezone-independent.
  const a = at(new Date(2024, 0, 1, 1).getTime());
  const b = at(new Date(2024, 0, 1, 23).getTime());
  assert.equal(isDayBoundary(b, a), false);
});

test('crossing midnight is a boundary', () => {
  const a = at(new Date(2024, 0, 1, 23, 59).getTime());
  const b = at(new Date(2024, 0, 2, 0, 1).getTime());
  assert.equal(isDayBoundary(b, a), true);
});
