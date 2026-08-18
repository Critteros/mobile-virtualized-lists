import assert from 'node:assert/strict';
import { test } from 'node:test';

import { messageItemType } from './item-type.ts';
import type { Message } from './types.ts';

const base: Message = {
  id: 'x',
  ts: 0,
  author: 0,
  kind: 'text',
  body: null,
  mediaUrl: null,
  posterUrl: null,
  mediaW: null,
  mediaH: null,
};

const text = (words: number): Message => ({ ...base, body: 'w '.repeat(words).trim() });

test('text buckets follow word count', () => {
  assert.equal(messageItemType(text(1)), 'text-short');
  assert.equal(messageItemType(text(3)), 'text-short');
  assert.equal(messageItemType(text(4)), 'text-medium');
  assert.equal(messageItemType(text(15)), 'text-medium');
  assert.equal(messageItemType(text(16)), 'text-long');
  assert.equal(messageItemType(text(60)), 'text-long');
  assert.equal(messageItemType(text(61)), 'text-xlong');
});

test('an empty body is a short text', () => {
  assert.equal(messageItemType(base), 'text-short');
});

test('images split on whether the row knows its dimensions', () => {
  const image = { ...base, kind: 'image' as const, mediaUrl: 'u' };
  assert.equal(messageItemType({ ...image, mediaW: 400, mediaH: 300 }), 'image');
  assert.equal(messageItemType(image), 'image-unsized');
});

test('video is its own type whatever it carries', () => {
  assert.equal(messageItemType({ ...base, kind: 'video', mediaW: 640, mediaH: 360 }), 'video');
});
