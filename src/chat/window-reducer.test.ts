import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateCorpus, SEED } from './generator.ts';
import type { Message } from './types.ts';
import { initialWindowState, windowReducer, type WindowState } from './window-reducer.ts';

const CORPUS = generateCorpus(1000, SEED);
const page = (from: number, size: number): Message[] => CORPUS.slice(from, from + size);

const reset = (items: Message[], hasOlder = true, hasNewer = true): WindowState =>
  windowReducer(initialWindowState, { type: 'reset', items, hasOlder, hasNewer });

test('reset replaces the window and bumps the generation', () => {
  const state = reset(page(500, 40));
  assert.equal(state.items.length, 40);
  assert.equal(state.generation, 1);
  assert.equal(state.loadingOlder, false);
  assert.equal(state.loadingNewer, false);
});

test('loadStart flags only its own edge', () => {
  const state = windowReducer(reset(page(500, 40)), { type: 'loadStart', edge: 'older' });
  assert.equal(state.loadingOlder, true);
  assert.equal(state.loadingNewer, false);
});

test('loadEnd clears only its own edge, leaving the other edge loading', () => {
  let state = reset(page(500, 40));
  state = windowReducer(state, { type: 'loadStart', edge: 'older' });
  state = windowReducer(state, { type: 'loadStart', edge: 'newer' });
  state = windowReducer(state, {
    type: 'loadEnd',
    edge: 'older',
    page: page(460, 40),
  });
  assert.equal(state.loadingOlder, false);
  assert.equal(state.loadingNewer, true);
});

test('grow-only prepends older pages without dropping anything', () => {
  let state = reset(page(500, 40));
  for (let i = 1; i <= 5; i++) {
    state = windowReducer(state, {
      type: 'loadEnd',
      edge: 'older',
      page: page(500 - i * 40, 40),
    });
  }
  assert.equal(state.items.length, 240);
  assert.equal(state.items[0].id, CORPUS[300].id);
  assert.equal(state.hasNewer, true);
});

test('grow-only appends newer pages in order', () => {
  let state = reset(page(500, 40));
  state = windowReducer(state, {
    type: 'loadEnd',
    edge: 'newer',
    page: page(540, 40),
  });
  assert.equal(state.items.length, 80);
  assert.equal(state.items[79].id, CORPUS[579].id);
});

test('an empty page clears the flag for that edge only', () => {
  const state = windowReducer(reset(page(0, 40)), {
    type: 'loadEnd',
    edge: 'older',
    page: [],
  });
  assert.equal(state.hasOlder, false);
  assert.equal(state.hasNewer, true);
  assert.equal(state.items.length, 40);
});

test('append adds to the newer end', () => {
  const base = reset(page(500, 40), true, false);
  const state = windowReducer(base, { type: 'append', message: CORPUS[999] });
  assert.equal(state.items.length, 41);
  assert.equal(state.items[40].id, CORPUS[999].id);
});

test('loadFail clears the loading flag for its edge and leaves everything else untouched', () => {
  let state = reset(page(500, 40));
  state = windowReducer(state, { type: 'loadStart', edge: 'older' });
  state = windowReducer(state, { type: 'loadStart', edge: 'newer' });
  const before = state;
  state = windowReducer(state, { type: 'loadFail', edge: 'older' });
  assert.equal(state.loadingOlder, false);
  assert.equal(state.loadingNewer, true);
  assert.equal(state.items, before.items);
  assert.equal(state.hasOlder, before.hasOlder);
  assert.equal(state.hasNewer, before.hasNewer);
});

test('loadFail with a stale generation is discarded', () => {
  let state = reset(page(500, 40));
  state = windowReducer(state, { type: 'loadStart', edge: 'older' });
  const before = state;
  const stale = windowReducer(state, {
    type: 'loadFail',
    edge: 'older',
    generation: before.generation - 1,
  });
  assert.equal(stale.loadingOlder, true);
  assert.equal(
    stale,
    before,
    'a stale loadFail must return the identical state object, not a copy',
  );
});

test('a stale load for a superseded generation is ignored', () => {
  const first = reset(page(500, 40));
  const second = windowReducer(first, {
    type: 'reset',
    items: page(0, 40),
    hasOlder: false,
    hasNewer: true,
  });
  const stale = windowReducer(second, {
    type: 'loadEnd',
    edge: 'older',
    page: page(460, 40),
    generation: first.generation,
  });
  assert.deepEqual(stale.items, second.items);
  assert.equal(stale, second, 'a stale loadEnd must return the identical state object, not a copy');
});
