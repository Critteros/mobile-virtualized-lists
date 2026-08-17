import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CORPUS_START_TS, generateCorpus, generateCorpusIter, SEED } from './generator.ts';

test('generateCorpus is deterministic', () => {
  assert.deepEqual(generateCorpus(500, SEED), generateCorpus(500, SEED));
});

test('timestamps are strictly increasing and start at CORPUS_START_TS or later', () => {
  const rows = generateCorpus(5000, SEED);
  assert.ok(rows[0].ts >= CORPUS_START_TS);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1].ts < rows[i].ts, `ts not increasing at ${i}`);
  }
});

test('ids sort lexicographically in corpus order', () => {
  const rows = generateCorpus(5000, SEED);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1].id < rows[i].id, `id order broke at ${i}`);
  }
});

test('composition is roughly 72/18/10 text/image/video', () => {
  const rows = generateCorpus(20_000, SEED);
  const share = (kind: string) => rows.filter((r) => r.kind === kind).length / rows.length;
  assert.ok(Math.abs(share('text') - 0.72) < 0.02, `text share ${share('text')}`);
  assert.ok(Math.abs(share('image') - 0.18) < 0.02, `image share ${share('image')}`);
  assert.ok(Math.abs(share('video') - 0.1) < 0.02, `video share ${share('video')}`);
});

test('about half of image rows have unknown dimensions', () => {
  const images = generateCorpus(20_000, SEED).filter((r) => r.kind === 'image');
  const unknown = images.filter((r) => r.mediaW === null && r.mediaH === null).length;
  assert.ok(Math.abs(unknown / images.length - 0.5) < 0.05, `unknown share ${unknown / images.length}`);
});

test('text bodies span one word to hundreds', () => {
  const texts = generateCorpus(20_000, SEED).filter((r) => r.kind === 'text');
  const words = texts.map((r) => (r.body ?? '').split(' ').length);
  assert.ok(Math.min(...words) <= 3, `shortest was ${Math.min(...words)}`);
  assert.ok(Math.max(...words) >= 100, `longest was ${Math.max(...words)}`);
});

test('media rows carry the right fields', () => {
  for (const row of generateCorpus(5000, SEED)) {
    if (row.kind === 'text') {
      assert.ok(row.body !== null);
      assert.equal(row.mediaUrl, null);
    } else {
      assert.equal(row.body, null);
      assert.ok(row.mediaUrl !== null);
    }
    if (row.kind === 'video') {
      assert.ok(row.posterUrl !== null);
      assert.ok(row.mediaW !== null && row.mediaH !== null);
    }
  }
});

test('about 40% of messages are from me', () => {
  const rows = generateCorpus(20_000, SEED);
  const mine = rows.filter((r) => r.author === 0).length / rows.length;
  assert.ok(Math.abs(mine - 0.4) < 0.02, `mine share ${mine}`);
});

test('generateCorpusIter yields the same rows as generateCorpus', () => {
  const streamed = [...generateCorpusIter(300, SEED)];
  assert.deepEqual(streamed, generateCorpus(300, SEED));
});
