import { mulberry32 } from './random.ts';
import type { Message, MessageKind } from './types.ts';
import { createIdFactory } from './uuidv7.ts';

export const SEED = 20260817;
export const MESSAGE_COUNT = 100_000;
/** Fixed so the corpus never depends on the wall clock. */
export const CORPUS_START_TS = Date.UTC(2023, 0, 1);

const VOCABULARY = [
  'the', 'quick', 'meeting', 'notes', 'yesterday', 'shipped', 'build', 'again',
  'let', 'me', 'check', 'that', 'branch', 'before', 'lunch', 'sorry', 'about',
  'delay', 'looks', 'good', 'to', 'merge', 'can', 'you', 'take', 'another',
  'look', 'when', 'free', 'thanks', 'for', 'the', 'quick', 'turnaround', 'we',
  'should', 'probably', 'split', 'this', 'into', 'smaller', 'pieces', 'and',
  'revisit', 'next', 'week', 'here', 'is', 'what', 'changed', 'since', 'last',
  'release', 'nothing', 'urgent', 'but', 'worth', 'reading', 'while', 'waiting',
  'on', 'ci', 'which', 'is', 'slow', 'today', 'as', 'usual', 'anyway', 'talk',
  'soon', 'coffee', 'later', 'maybe', 'tomorrow', 'morning', 'works', 'better',
];

const VIDEO_URLS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

const VIDEO_W = 640;
const VIDEO_H = 360;

/** Word-count ranges and their cumulative probabilities. */
const TEXT_BUCKETS: { max: number; min: number; upTo: number }[] = [
  { min: 1, max: 3, upTo: 0.25 },
  { min: 4, max: 15, upTo: 0.65 },
  { min: 16, max: 60, upTo: 0.9 },
  { min: 60, max: 200, upTo: 1 },
];

function pickKind(r: number): MessageKind {
  if (r < 0.72) return 'text';
  if (r < 0.9) return 'image';
  return 'video';
}

function buildBody(rng: () => number): string {
  const r = rng();
  const bucket = TEXT_BUCKETS.find((b) => r < b.upTo) ?? TEXT_BUCKETS[TEXT_BUCKETS.length - 1];
  const count = bucket.min + Math.floor(rng() * (bucket.max - bucket.min + 1));
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(VOCABULARY[Math.floor(rng() * VOCABULARY.length)]);
  }
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * Streams the corpus so seeding never holds 100k objects at once.
 * Rows are yielded oldest first, with strictly increasing timestamps.
 *
 * A generator rather than a callback sink: the seeder has to await a database
 * flush every few thousand rows, and a synchronous sink cannot be awaited.
 */
export function* generateCorpusIter(count: number, seed: number): Generator<Message> {
  const rng = mulberry32(seed);
  const nextId = createIdFactory(mulberry32(seed ^ 0x5f3759df));
  let cursor = CORPUS_START_TS;

  for (let i = 0; i < count; i++) {
    // Bursty gaps: mostly seconds apart, occasionally hours, so day
    // separators land at irregular intervals.
    cursor += 1 + Math.floor(rng() ** 4 * 4_000_000);
    const { id, ts } = nextId(cursor);
    const kind = pickKind(rng());
    const author = rng() < 0.4 ? 0 : 1 + Math.floor(rng() * 3);

    if (kind === 'text') {
      yield {
        id, ts, author, kind,
        body: buildBody(rng),
        mediaUrl: null, posterUrl: null, mediaW: null, mediaH: null,
      };
      continue;
    }

    if (kind === 'image') {
      const width = 400 + Math.floor(rng() * 800);
      const height = 300 + Math.floor(rng() * 900);
      // Half the image rows hide their dimensions: those rows cannot be laid
      // out until the image loads, which is the post-load height change every
      // engine has to cope with.
      const known = rng() < 0.5;
      yield {
        id, ts, author, kind,
        body: null,
        mediaUrl: `https://picsum.photos/seed/${id}/${width}/${height}`,
        posterUrl: null,
        mediaW: known ? width : null,
        mediaH: known ? height : null,
      };
      continue;
    }

    yield {
      id, ts, author, kind,
      body: null,
      mediaUrl: VIDEO_URLS[i % VIDEO_URLS.length],
      posterUrl: `https://picsum.photos/seed/${id}/${VIDEO_W}/${VIDEO_H}`,
      mediaW: VIDEO_W,
      mediaH: VIDEO_H,
    };
  }
}

/** Convenience wrapper for tests and small corpora. */
export function generateCorpus(count = MESSAGE_COUNT, seed = SEED): Message[] {
  return [...generateCorpusIter(count, seed)];
}
