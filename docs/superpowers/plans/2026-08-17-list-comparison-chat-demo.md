# List Comparison Chat Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demo app that renders the same messenger-style chat screen on five list engines (FlatList, FlashList v1, FlashList v2, Legend List v2, Legend List v3) across eight variants, so their behaviour can be compared under variable item heights, image/video attachments, double-ended infinite pagination, and jumps into a 100,000-message history.

**Architecture:** A single SQLite corpus generated deterministically on first launch is the shared source of truth. A pure reducer plus one hook (`useChatWindow`) owns the loaded window, pagination, trimming and jumps, and knows nothing about lists. Each engine gets its own thin component satisfying a minimal `ChatListProps` contract; engine-specific limitations (notably FlashList v1's missing `onStartReached` and `maintainVisibleContentPosition`) are surfaced on screen rather than papered over. Shared chrome (`ChatScreen`, `MessageRow`, debug sheet) is written once.

**Tech Stack:** Expo SDK 57, React Native 0.86.2, React 19.2.3 (React Compiler on), TypeScript 6, NativeWind v5 + rn-reusables, `expo-sqlite`, `expo-video`, `expo-image`, `expo-file-system`, `@shopify/flash-list` (2.3.2 + 1.8.3 alias), `@legendapp/list` (3.3.6 + 2.0.19 alias). Tests run on Node's built-in test runner with native TypeScript type stripping — no jest, no babel config.

**Spec:** `docs/superpowers/specs/2026-08-17-list-comparison-chat-demo-design.md`

## Global Constraints

- Package manager is **yarn** (`yarn@4.18.0`). Never run `npm install`/`npx` for project dependencies.
- TypeScript and lint problems are checked through **MCP diagnostics**, not by running `tsc`/`eslint` in a shell.
- Before writing code against `expo-sqlite`, `expo-video`, `expo-image`, or `expo-file-system`, consult **https://docs.expo.dev/versions/v57.0.0/** for that module. Memory of older SDKs is not a valid source (`AGENTS.md`).
- **Verify on device with argent** at the end of every task that changes visible UI. Never derive tap coordinates from a screenshot — call `describe` (or `debugger-component-tree`) first, tap coordinates from its output.
- Commit messages are **semantic** (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- **No fixed-height optimisation anywhere.** No `getItemLayout`, no uniform row heights, no `overrideItemLayout`. Only FlashList v1's `estimatedItemSize` is set, deliberately rough.
- **No in-app instrumentation.** No FPS HUD, no metrics collection, no timing hooks inside engines.
- Path alias `@/*` maps to `./src/*`. **Files under test must use relative imports with explicit `.ts` extensions** — Node's resolver does not know the alias.
- Hex in UUIDs is **always lowercase**; mixed case breaks SQLite's binary ordering and therefore cursor pagination.
- Message ids are UUIDv7 and are the sole cursor. Every generated `ts` is **strictly greater** than the previous one.
- Corpus constants are fixed, never derived from `Date.now()`: `SEED = 20260817`, `MESSAGE_COUNT = 100_000`, `CORPUS_START_TS = Date.UTC(2023, 0, 1)`.

## Deviations From the Spec (approved changes, called out for the reviewer)

1. **Test runner.** The spec named `jest-expo`. This plan uses `node --test` with Node 24's native TypeScript type stripping and `node:sqlite`. Verified working on this machine (Node v24.6.0). This is strictly better for the spec's stated goal: the cursor-pagination tests run the *actual SQL strings the app ships* against a real SQLite engine, rather than a mock. It also adds zero runtime dependencies and no babel/jest configuration.
2. **Seeding is a provider, not a route.** The spec's file layout listed `screens/SeedingScreen.tsx` as a screen. It is implemented as `chat/DbProvider.tsx` + `screens/SeedingScreen.tsx`, where the provider gates the navigator. This is required anyway for the debug sheet's **Reseed** action, which must be able to return the app to the seeding state.
3. **Legend List v3 has no root export.** Verified against the published package: `@legendapp/list@3.3.6` `exports` has no `"."` entry. Import path is `@legendapp/list/react-native`. v2 (`legend-list-v2`) keeps the root import.

## File Structure

| File | Responsibility |
|---|---|
| `src/chat/types.ts` | `Message`, `MessageKind`, `ChatListProps`, `ChatListHandle`. No logic. |
| `src/chat/random.ts` | `mulberry32` seeded PRNG. Pure, tested. |
| `src/chat/uuidv7.ts` | `uuidv7(tsMs, rng)` and `createIdFactory(rng)`. Pure, tested. |
| `src/chat/generator.ts` | Deterministic corpus rows. Pure, tested. |
| `src/chat/sql.ts` | SQL strings + `mapRow`. Engine-agnostic so tests can run them on `node:sqlite`. Tested. |
| `src/chat/db.ts` | `expo-sqlite` open/seed/reset + the async query surface + `withLatency`. Device-only. |
| `src/chat/window-reducer.ts` | Pure window state machine: load, trim, reset, append. Tested. |
| `src/chat/useChatWindow.ts` | Wires `db.ts` to `window-reducer.ts`; owns request sequencing. |
| `src/chat/DbProvider.tsx` | Opens the DB, runs seeding, exposes `reseed()`. |
| `src/chat/settings.tsx` | Runtime settings context (page size, trim cap, latency, jump mode, recycleItems). |
| `src/chat/VideoProvider.tsx` | The single shared `expo-video` player and which message owns it. |
| `src/chat/MessageRow.tsx` | One row: day separator, bubble, text/image/video content. |
| `src/variants.ts` | The eight variants; feeds the menu and the route param. |
| `src/screens/HomeScreen.tsx` | Grouped variant menu. |
| `src/screens/SeedingScreen.tsx` | Seeding progress. |
| `src/screens/ChatScreen.tsx` | Chrome: header, jump control, composer, debug sheet, engine selection. |
| `src/screens/DebugSheet.tsx` | The settings modal. |
| `src/engines/FlatListChat.tsx` | FlatList wiring (both orientations). |
| `src/engines/FlashV1Chat.tsx` | FlashList 1.8.3 wiring + `onScroll` start-reached shim. |
| `src/engines/FlashV2Chat.tsx` | FlashList 2.3.2 wiring. |
| `src/engines/LegendV2Chat.tsx` | `legend-list-v2` wiring. |
| `src/engines/LegendV3Chat.tsx` | `@legendapp/list/react-native` wiring. |

---

### Task 1: Dependencies and the FlashList v1 native build probe

The riskiest item in the spec goes first. FlashList 1.8.3 was published roughly a year before React Native 0.86 and ships Fabric native code; if it cannot build, two of the eight variants are dropped and everything else proceeds unchanged.

**Files:**
- Modify: `package.json`
- Create: `android/` (generated by prebuild)

**Interfaces:**
- Consumes: nothing.
- Produces: installed packages `expo-sqlite`, `expo-video`, `expo-file-system`, `@shopify/flash-list` (2.3.2), `flash-list-v1` (1.8.3), `@legendapp/list` (3.3.6), `legend-list-v2` (2.0.19), `@types/node`; a recorded yes/no decision on whether FlashList v1 variants ship.

- [ ] **Step 1: Add the runtime dependencies**

```bash
yarn add expo-sqlite@~57.0.1 expo-video@~57.0.2 expo-file-system@~57.0.4
yarn add @shopify/flash-list@2.3.2 @legendapp/list@3.3.6
```

- [ ] **Step 2: Add the aliased older majors**

```bash
yarn add flash-list-v1@npm:@shopify/flash-list@1.8.3
yarn add legend-list-v2@npm:@legendapp/list@2.0.19
```

- [ ] **Step 3: Add the type-only dev dependency for the Node test runner**

```bash
yarn add -D @types/node
```

- [ ] **Step 4: Confirm the aliases resolved to distinct copies**

```bash
ls node_modules/flash-list-v1/package.json node_modules/@shopify/flash-list/package.json
node -e "console.log(require('./node_modules/flash-list-v1/package.json').version, require('./node_modules/@shopify/flash-list/package.json').version)"
node -e "console.log(require('./node_modules/legend-list-v2/package.json').version, require('./node_modules/@legendapp/list/package.json').version)"
```

Expected: `1.8.3 2.3.2` and `2.0.19 3.3.6`.

- [ ] **Step 5: Confirm exactly one FlashList podspec exists in the tree**

```bash
find node_modules -name "RNFlashList.podspec" -not -path "*/node_modules/*/node_modules/*"
```

Expected: exactly one line, under `node_modules/flash-list-v1/`. FlashList 2.3.2 is pure JavaScript and ships no podspec, so autolinking has only one native FlashList to register. If two appear, stop — the alias plan is unsound and the v1 variants must be dropped.

- [ ] **Step 6: Generate the Android project**

Only `ios/` exists today.

```bash
yarn expo prebuild --platform android
```

- [ ] **Step 7: Build and run on iOS**

```bash
yarn ios
```

Expected: the app compiles, including `flash-list-v1`'s Swift/ObjC sources and its `rnflashlist` codegen output, and the existing Home screen appears.

- [ ] **Step 8: If the iOS build fails inside flash-list-v1**

Read the compiler error. Apply this decision rule, in order:

1. If it is small and mechanical (a renamed React Native header, a removed Fabric type alias, a missing import), fix it with a yarn patch:
   ```bash
   yarn patch flash-list-v1
   # edit the files in the printed temp directory, then:
   yarn patch-commit -s <printed-path>
   ```
   Re-run `yarn ios`.
2. Otherwise, remove the dependency and drop the two v1 variants:
   ```bash
   yarn remove flash-list-v1
   ```
   Record the exact compiler error in `docs/superpowers/plans/flashlist-v1-probe.md`. Task 16 then becomes a no-op, and Task 8's variant registry omits the two v1 entries and shows the reason in the menu.

- [ ] **Step 9: Verify the app runs with argent**

```
list-devices              → pick the booted iOS simulator (or boot one)
launch-app                → bundleId dev.critteros.testList
describe                  → confirm the Home screen text is present
screenshot
```

- [ ] **Step 10: Commit**

```bash
git add package.json yarn.lock android
git commit -m "chore: add list engines, sqlite, video and file-system dependencies"
```

If the probe failed and v1 was dropped, also `git add docs/superpowers/plans/flashlist-v1-probe.md`.

---

### Task 2: Node test harness, seeded PRNG, and UUIDv7

**Files:**
- Modify: `package.json` (scripts)
- Create: `src/chat/random.ts`, `src/chat/random.test.ts`, `src/chat/uuidv7.ts`, `src/chat/uuidv7.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `mulberry32(seed: number): () => number` — returns floats in `[0, 1)`.
  - `uuidv7(tsMs: number, rng: () => number): string` — lowercase canonical UUID string.
  - `createIdFactory(rng: () => number): (tsMs: number) => { id: string; ts: number }` — enforces strictly increasing `ts`.

- [ ] **Step 1: Add the test script**

In `package.json` `scripts`, add:

```json
"test": "node --test --experimental-strip-types 'src/**/*.test.ts'"
```

Node 24 strips types by default, but the flag makes the requirement explicit and keeps the script working if the default changes.

- [ ] **Step 2: Write the failing PRNG test**

Create `src/chat/random.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to see it fail**

Run: `yarn test`
Expected: FAIL — `Cannot find module './random.ts'`.

- [ ] **Step 4: Implement the PRNG**

Create `src/chat/random.ts`:

```ts
/**
 * mulberry32 — a small, fast, seeded PRNG. Deterministic for a given seed,
 * which is what makes the generated corpus byte-identical across reseeds.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `yarn test`
Expected: 3 passing.

- [ ] **Step 6: Write the failing UUIDv7 test**

Create `src/chat/uuidv7.test.ts`:

```ts
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
```

The last test is the one that matters. Lexicographic order over lowercase hex equals numeric order (ASCII `0`–`9` sort before `a`–`f`), and SQLite's default `BINARY` collation compares the same way — so this test is what guarantees `WHERE id < ?` paginates chronologically.

- [ ] **Step 7: Run it to see it fail**

Run: `yarn test`
Expected: FAIL — `Cannot find module './uuidv7.ts'`.

- [ ] **Step 8: Implement UUIDv7**

Create `src/chat/uuidv7.ts`:

```ts
/**
 * UUIDv7: 48 bits of millisecond timestamp, then version/variant bits, then
 * random payload. Time-ordered, so the id is also the pagination cursor.
 *
 * expo-crypto's randomUUID produces v4, which is neither sortable nor
 * reproducible from a seed, so it cannot be used here.
 */
export function uuidv7(tsMs: number, rng: () => number): string {
  const bytes = new Uint8Array(16);

  bytes[0] = Math.floor(tsMs / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(tsMs / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(tsMs / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(tsMs / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(tsMs / 2 ** 8) & 0xff;
  bytes[5] = tsMs & 0xff;

  for (let i = 6; i < 16; i++) {
    bytes[i] = Math.floor(rng() * 256) & 0xff;
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  let hex = '';
  for (let i = 0; i < 16; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Wraps uuidv7 with the ordering invariant the cursor depends on: each call
 * returns a timestamp strictly greater than the previous one, so two messages
 * can never share a millisecond and let random bits invert their order.
 */
export function createIdFactory(rng: () => number): (tsMs: number) => { id: string; ts: number } {
  let last = -1;
  return function next(tsMs: number) {
    const ts = tsMs > last ? tsMs : last + 1;
    last = ts;
    return { id: uuidv7(ts, rng), ts };
  };
}
```

- [ ] **Step 9: Run the tests to see them pass**

Run: `yarn test`
Expected: 9 passing, 0 failing.

- [ ] **Step 10: Check diagnostics and commit**

Check MCP diagnostics for `src/chat/random.ts`, `src/chat/uuidv7.ts` and both test files. Fix anything reported.

```bash
git add package.json src/chat/random.ts src/chat/random.test.ts src/chat/uuidv7.ts src/chat/uuidv7.test.ts
git commit -m "feat: add seeded PRNG and monotonic UUIDv7 generation"
```

---

### Task 3: Message types and the deterministic corpus generator

**Files:**
- Create: `src/chat/types.ts`, `src/chat/generator.ts`, `src/chat/generator.test.ts`

**Interfaces:**
- Consumes: `mulberry32` from `./random.ts`, `createIdFactory` from `./uuidv7.ts`.
- Produces:
  - `type Message = { id: string; ts: number; author: number; kind: MessageKind; body: string | null; mediaUrl: string | null; posterUrl: string | null; mediaW: number | null; mediaH: number | null }`
  - `type MessageKind = 'text' | 'image' | 'video'`
  - `SEED`, `MESSAGE_COUNT`, `CORPUS_START_TS` constants
  - `generateCorpus(count?: number, seed?: number): Message[]`
  - `generateCorpusIter(count: number, seed: number): Generator<Message>` — streaming form, used by seeding so 100k rows are never all in memory at once. It is a generator rather than a callback sink specifically so the consumer can `await` a database flush between batches; a synchronous sink cannot be awaited, which would force the seeder to buffer the whole corpus first.

- [ ] **Step 1: Write the types**

Create `src/chat/types.ts`:

```ts
export type MessageKind = 'text' | 'image' | 'video';

/** One chat message. Field names are camelCase; the SQLite columns are snake_case. */
export type Message = {
  /** UUIDv7. Sole identity and sole pagination cursor. */
  id: string;
  /** Milliseconds since epoch. Strictly increasing across the corpus. */
  ts: number;
  /** 0 = me, 1..3 = other participants. */
  author: number;
  kind: MessageKind;
  /** Text body for `text` messages, otherwise null. */
  body: string | null;
  /** Image or video URL, otherwise null. */
  mediaUrl: string | null;
  /** Poster URL for `video` messages, otherwise null. */
  posterUrl: string | null;
  /** Intrinsic media width, or null when the height is unknown until load. */
  mediaW: number | null;
  /** Intrinsic media height, or null when the height is unknown until load. */
  mediaH: number | null;
};
```

- [ ] **Step 2: Write the failing generator test**

Create `src/chat/generator.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to see it fail**

Run: `yarn test`
Expected: FAIL — `Cannot find module './generator.ts'`.

- [ ] **Step 4: Implement the generator**

Create `src/chat/generator.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `yarn test`
Expected: all passing. If a share assertion fails narrowly, do not widen the tolerance — check the `pickKind`/`author` thresholds first, since a real bug looks exactly like this.

- [ ] **Step 6: Check diagnostics and commit**

Check MCP diagnostics for the three new files.

```bash
git add src/chat/types.ts src/chat/generator.ts src/chat/generator.test.ts
git commit -m "feat: add deterministic chat corpus generator"
```

---

### Task 4: SQL statements and cursor pagination, tested against real SQLite

The SQL lives in its own module with no Expo imports, so the test can run the exact strings the app ships against `node:sqlite`. This is the task that protects every later comparison from a silent pagination bug.

**Files:**
- Create: `src/chat/sql.ts`, `src/chat/sql.test.ts`

**Interfaces:**
- Consumes: `Message` from `./types.ts`, `generateCorpus` from `./generator.ts`.
- Produces:
  - `CREATE_MESSAGES`, `CREATE_META`, `DROP_MESSAGES`, `INSERT_MESSAGE`, `SELECT_PAGE_BEFORE`, `SELECT_PAGE_AFTER`, `SELECT_FIRST_PAGE`, `SELECT_LATEST_PAGE`, `SELECT_BY_ID`, `SELECT_MIDDLE_ID`, `SELECT_BOUNDS`, `SELECT_META`, `UPSERT_META` — all `string`.
  - `type MessageRow` — the raw snake_case row shape.
  - `mapRow(row: MessageRow): Message`
  - `insertParams(m: Message): (string | number | null)[]`

- [ ] **Step 1: Write the failing SQL test**

Create `src/chat/sql.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `yarn test`
Expected: FAIL — `Cannot find module './sql.ts'`.

- [ ] **Step 3: Implement the SQL module**

Create `src/chat/sql.ts`:

```ts
import type { Message, MessageKind } from './types.ts';

/** The raw row shape SQLite returns. Columns are snake_case. */
export type MessageRow = {
  author: number;
  body: string | null;
  id: string;
  kind: string;
  media_h: number | null;
  media_url: string | null;
  media_w: number | null;
  poster_url: string | null;
  ts: number;
};

export const CREATE_MESSAGES = `
CREATE TABLE IF NOT EXISTS messages (
  id         TEXT    PRIMARY KEY,
  ts         INTEGER NOT NULL,
  author     INTEGER NOT NULL,
  kind       TEXT    NOT NULL,
  body       TEXT,
  media_url  TEXT,
  poster_url TEXT,
  media_w    INTEGER,
  media_h    INTEGER
)`;

export const CREATE_META = `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`;

export const DROP_MESSAGES = `DROP TABLE IF EXISTS messages`;

export const INSERT_MESSAGE = `INSERT INTO messages (id, ts, author, kind, body, media_url, poster_url, media_w, media_h) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/** Newest-first; callers reverse to ascending. Exclusive of the cursor row. */
export const SELECT_PAGE_BEFORE = `SELECT * FROM messages WHERE id < ? ORDER BY id DESC LIMIT ?`;

export const SELECT_PAGE_AFTER = `SELECT * FROM messages WHERE id > ? ORDER BY id ASC LIMIT ?`;

export const SELECT_FIRST_PAGE = `SELECT * FROM messages ORDER BY id ASC LIMIT ?`;

/** Newest-first; callers reverse to ascending. */
export const SELECT_LATEST_PAGE = `SELECT * FROM messages ORDER BY id DESC LIMIT ?`;

/** The anchor row for a middle jump. */
export const SELECT_BY_ID = `SELECT * FROM messages WHERE id = ?`;

/** The only OFFSET query. Runs once per middle jump, never in the scroll path. */
export const SELECT_MIDDLE_ID = `SELECT id FROM messages ORDER BY id LIMIT 1 OFFSET ?`;

export const SELECT_BOUNDS = `SELECT MIN(id) AS minId, MAX(id) AS maxId, COUNT(*) AS count FROM messages`;

export const SELECT_META = `SELECT value FROM meta WHERE key = ?`;

export const UPSERT_META = `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;

export function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    ts: row.ts,
    author: row.author,
    kind: row.kind as MessageKind,
    body: row.body,
    mediaUrl: row.media_url,
    posterUrl: row.poster_url,
    mediaW: row.media_w,
    mediaH: row.media_h,
  };
}

export function insertParams(message: Message): (string | number | null)[] {
  return [
    message.id,
    message.ts,
    message.author,
    message.kind,
    message.body,
    message.mediaUrl,
    message.posterUrl,
    message.mediaW,
    message.mediaH,
  ];
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `yarn test`
Expected: all passing.

- [ ] **Step 5: Check diagnostics and commit**

```bash
git add src/chat/sql.ts src/chat/sql.test.ts
git commit -m "feat: add cursor pagination SQL with real-sqlite tests"
```

---

### Task 5: The SQLite store

**Files:**
- Create: `src/chat/db.ts`

**Interfaces:**
- Consumes: `sql.ts` exports, `generateCorpusIter`, `MESSAGE_COUNT`, `SEED`, `CORPUS_START_TS` from `./generator.ts`, `createIdFactory` from `./uuidv7.ts`.
- Produces:
  - `openChatDb(): Promise<SQLiteDatabase>`
  - `ensureSeeded(db: SQLiteDatabase, onProgress: (done: number, total: number) => void): Promise<void>`
  - `reseed(db: SQLiteDatabase, onProgress: (done: number, total: number) => void): Promise<void>`
  - `setLatency(ms: number): void` / `getLatency(): number`
  - `getPageBefore(db, id: string, n: number): Promise<Message[]>` — **ascending**
  - `getPageAfter(db, id: string, n: number): Promise<Message[]>` — ascending
  - `getFirstPage(db, n: number): Promise<Message[]>` — ascending
  - `getLatestPage(db, n: number): Promise<Message[]>` — ascending
  - `getAround(db, id: string, n: number): Promise<Message[]>` — ascending, includes the anchor row
  - `getMiddleId(db): Promise<string | null>`
  - `getBounds(db): Promise<{ count: number; maxId: string | null; minId: string | null }>`
  - `insertOutgoing(db, body: string): Promise<Message>`

- [ ] **Step 1: Read the SDK 57 docs**

Read https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/ and https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/ before writing this file. The relevant surface is `openDatabaseAsync(name, options?, directory?)`, `execAsync`, `prepareAsync`/`executeAsync`/`finalizeAsync`, `getAllAsync`, `getFirstAsync`, `runAsync`, `withTransactionAsync`, and `Paths.cache`.

- [ ] **Step 2: Implement the store**

Create `src/chat/db.ts`:

```ts
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

export async function reseed(
  db: SQLite.SQLiteDatabase,
  onProgress: SeedProgress,
): Promise<void> {
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

export async function insertOutgoing(
  db: SQLite.SQLiteDatabase,
  body: string,
): Promise<Message> {
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
```

- [ ] **Step 3: Check diagnostics**

Check MCP diagnostics for `src/chat/db.ts`. Two things commonly need adjusting against the installed types, and the installed `.d.ts` is the authority, not this plan:

- `SQLite.openDatabaseAsync`'s third parameter. If `Paths.cache.uri` is rejected or throws at runtime, create the directory first and pass it:
  ```ts
  import { Directory, Paths } from 'expo-file-system';
  const dir = new Directory(Paths.cache, 'SQLite');
  if (!dir.exists) dir.create({ intermediates: true });
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME, undefined, dir.uri);
  ```
- The bind-value type name (`SQLiteBindValue` vs `SQLiteBindParams`). Read `node_modules/expo-sqlite/build/*.d.ts` and use whatever is exported.

- [ ] **Step 4: Commit**

```bash
git add src/chat/db.ts
git commit -m "feat: add sqlite chat store with seeding and cursor queries"
```

---

### Task 6: The window reducer

**Files:**
- Create: `src/chat/window-reducer.ts`, `src/chat/window-reducer.test.ts`

**Interfaces:**
- Consumes: `Message` from `./types.ts`.
- Produces:
  - `type WindowState = { generation: number; hasNewer: boolean; hasOlder: boolean; items: Message[]; loadingNewer: boolean; loadingOlder: boolean }`
  - `type WindowAction`
  - `initialWindowState: WindowState`
  - `windowReducer(state: WindowState, action: WindowAction): WindowState`

- [ ] **Step 1: Write the failing reducer test**

Create `src/chat/window-reducer.test.ts`:

```ts
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

test('grow-only prepends older pages without dropping anything', () => {
  let state = reset(page(500, 40));
  for (let i = 1; i <= 5; i++) {
    state = windowReducer(state, {
      type: 'loadEnd',
      edge: 'older',
      page: page(500 - i * 40, 40),
      pageSize: 40,
      trimCap: null,
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
    pageSize: 40,
    trimCap: null,
  });
  assert.equal(state.items.length, 80);
  assert.equal(state.items[79].id, CORPUS[579].id);
});

test('an empty page clears the flag for that edge only', () => {
  const state = windowReducer(reset(page(0, 40)), {
    type: 'loadEnd',
    edge: 'older',
    page: [],
    pageSize: 40,
    trimCap: null,
  });
  assert.equal(state.hasOlder, false);
  assert.equal(state.hasNewer, true);
  assert.equal(state.items.length, 40);
});

test('trimming keeps the window at or under the cap and reopens the far edge', () => {
  let state = reset(page(500, 40), true, false);
  for (let i = 1; i <= 10; i++) {
    state = windowReducer(state, {
      type: 'loadEnd',
      edge: 'older',
      page: page(500 - i * 40, 40),
      pageSize: 40,
      trimCap: 300,
    });
    assert.ok(state.items.length <= 300, `window grew to ${state.items.length}`);
  }
  assert.equal(state.hasNewer, true, 'dropping newer items must reopen hasNewer');
  assert.equal(state.items.length % 40, 0, 'trimming drops whole pages');
});

test('trimming from the newer edge drops the oldest items and reopens hasOlder', () => {
  let state = reset(page(100, 40), false, true);
  for (let i = 1; i <= 10; i++) {
    state = windowReducer(state, {
      type: 'loadEnd',
      edge: 'newer',
      page: page(100 + i * 40, 40),
      pageSize: 40,
      trimCap: 300,
    });
  }
  assert.ok(state.items.length <= 300);
  assert.equal(state.hasOlder, true);
});

test('trimming never empties the window', () => {
  let state = reset(page(500, 40));
  state = windowReducer(state, {
    type: 'loadEnd',
    edge: 'older',
    page: page(460, 40),
    pageSize: 40,
    trimCap: 10,
  });
  assert.ok(state.items.length >= 40, `window collapsed to ${state.items.length}`);
});

test('append adds to the newer end and never trims', () => {
  const base = reset(page(500, 40), true, false);
  const state = windowReducer(base, { type: 'append', message: CORPUS[999] });
  assert.equal(state.items.length, 41);
  assert.equal(state.items[40].id, CORPUS[999].id);
});

test('a stale load for a superseded generation is ignored', () => {
  const first = reset(page(500, 40));
  const second = windowReducer(first, { type: 'reset', items: page(0, 40), hasOlder: false, hasNewer: true });
  const stale = windowReducer(second, {
    type: 'loadEnd',
    edge: 'older',
    page: page(460, 40),
    pageSize: 40,
    trimCap: null,
    generation: first.generation,
  });
  assert.deepEqual(stale.items, second.items);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `yarn test`
Expected: FAIL — `Cannot find module './window-reducer.ts'`.

- [ ] **Step 3: Implement the reducer**

Create `src/chat/window-reducer.ts`:

```ts
import type { Message } from './types.ts';

export type WindowState = {
  /** Bumped on every reset; used to key list remounts and discard stale loads. */
  generation: number;
  hasNewer: boolean;
  hasOlder: boolean;
  /** Always ascending: oldest first, newest last. */
  items: Message[];
  loadingNewer: boolean;
  loadingOlder: boolean;
};

export type WindowEdge = 'newer' | 'older';

export type WindowAction =
  | { type: 'loadStart'; edge: WindowEdge }
  | {
      type: 'loadEnd';
      edge: WindowEdge;
      page: Message[];
      pageSize: number;
      /** null means grow-only. */
      trimCap: number | null;
      /** When present and stale, the action is discarded. */
      generation?: number;
    }
  | { type: 'reset'; items: Message[]; hasOlder: boolean; hasNewer: boolean }
  | { type: 'append'; message: Message };

export const initialWindowState: WindowState = {
  generation: 0,
  hasNewer: true,
  hasOlder: true,
  items: [],
  loadingNewer: false,
  loadingOlder: false,
};

/**
 * Drops whole pages from one end until the window is at or under the cap.
 * Stops before the window would fall to a single page, so trimming can never
 * empty the list.
 */
function trim(
  items: Message[],
  pageSize: number,
  cap: number,
  dropFrom: WindowEdge,
): { dropped: boolean; items: Message[] } {
  let next = items;
  let dropped = false;
  while (next.length > cap && next.length > pageSize) {
    next = dropFrom === 'older' ? next.slice(pageSize) : next.slice(0, next.length - pageSize);
    dropped = true;
  }
  return { dropped, items: next };
}

export function windowReducer(state: WindowState, action: WindowAction): WindowState {
  switch (action.type) {
    case 'reset':
      return {
        generation: state.generation + 1,
        hasNewer: action.hasNewer,
        hasOlder: action.hasOlder,
        items: action.items,
        loadingNewer: false,
        loadingOlder: false,
      };

    case 'loadStart':
      return action.edge === 'older'
        ? { ...state, loadingOlder: true }
        : { ...state, loadingNewer: true };

    case 'loadEnd': {
      if (action.generation !== undefined && action.generation !== state.generation) {
        return state;
      }

      const loadingCleared =
        action.edge === 'older' ? { loadingOlder: false } : { loadingNewer: false };

      if (action.page.length === 0) {
        return {
          ...state,
          ...loadingCleared,
          ...(action.edge === 'older' ? { hasOlder: false } : { hasNewer: false }),
        };
      }

      const merged =
        action.edge === 'older'
          ? [...action.page, ...state.items]
          : [...state.items, ...action.page];

      if (action.trimCap === null) {
        return { ...state, ...loadingCleared, items: merged };
      }

      // Trim from the end opposite the one that just loaded.
      const { dropped, items } = trim(
        merged,
        action.pageSize,
        action.trimCap,
        action.edge === 'older' ? 'newer' : 'older',
      );

      return {
        ...state,
        ...loadingCleared,
        items,
        ...(dropped && action.edge === 'older' ? { hasNewer: true } : null),
        ...(dropped && action.edge === 'newer' ? { hasOlder: true } : null),
      };
    }

    case 'append':
      return { ...state, items: [...state.items, action.message] };

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `yarn test`
Expected: all passing.

- [ ] **Step 5: Check diagnostics and commit**

```bash
git add src/chat/window-reducer.ts src/chat/window-reducer.test.ts
git commit -m "feat: add chat window reducer with pagination and trimming"
```

---

### Task 7: Settings context and the `useChatWindow` hook

**Files:**
- Create: `src/chat/settings.tsx`, `src/chat/useChatWindow.ts`

**Interfaces:**
- Consumes: `db.ts` query functions, `window-reducer.ts`.
- Produces:
  - `type JumpTarget = 'latest' | 'middle' | 'start'`
  - `type JumpMode = 'imperative' | 'remount'`
  - `type ChatSettings = { jumpMode: JumpMode; latencyMs: number; pageSize: number; recycleItems: boolean; trimCap: number | null }`
  - `DEFAULT_SETTINGS: ChatSettings`
  - `SettingsProvider`, `useSettings(): { settings: ChatSettings; update: (patch: Partial<ChatSettings>) => void }`
  - `useChatWindow(db: SQLiteDatabase | null): { jumpTo: (t: JumpTarget) => void; loadNewer: () => void; loadOlder: () => void; sendMessage: (body: string) => void; state: WindowState; targetIndex: number }`

- [ ] **Step 1: Implement the settings context**

Create `src/chat/settings.tsx`:

```tsx
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { setLatency } from './db';

export type JumpMode = 'imperative' | 'remount';

export type ChatSettings = {
  /** Remount keys the list on `generation`; imperative replaces data and scrolls. */
  jumpMode: JumpMode;
  latencyMs: number;
  pageSize: number;
  /** Legend List only. */
  recycleItems: boolean;
  /** null means grow-only. */
  trimCap: number | null;
};

export const DEFAULT_SETTINGS: ChatSettings = {
  jumpMode: 'remount',
  latencyMs: 250,
  pageSize: 40,
  recycleItems: true,
  trimCap: null,
};

type SettingsValue = {
  settings: ChatSettings;
  update: (patch: Partial<ChatSettings>) => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);

  const update = useCallback((patch: Partial<ChatSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      if (patch.latencyMs !== undefined) setLatency(patch.latencyMs);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);

  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings(): SettingsValue {
  const value = use(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
```

- [ ] **Step 2: Implement the hook**

Create `src/chat/useChatWindow.ts`:

```ts
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getAround,
  getBounds,
  getFirstPage,
  getLatestPage,
  getMiddleId,
  getPageAfter,
  getPageBefore,
  insertOutgoing,
} from './db';
import { useSettings } from './settings';
import { initialWindowState, windowReducer, type WindowState } from './window-reducer';

export type JumpTarget = 'latest' | 'middle' | 'start';

export type ChatWindow = {
  jumpTo: (target: JumpTarget) => void;
  loadNewer: () => void;
  loadOlder: () => void;
  sendMessage: (body: string) => void;
  state: WindowState;
  /** Ascending index the list should be positioned at after the last reset. */
  targetIndex: number;
};

export function useChatWindow(db: SQLiteDatabase | null): ChatWindow {
  const { settings } = useSettings();
  const [state, dispatch] = useReducer(windowReducer, initialWindowState);
  const [targetIndex, setTargetIndex] = useState(0);

  // Mirrors of reducer state, so callbacks stay stable and never fire twice
  // for the same edge while a request is in flight.
  const inFlight = useRef({ newer: false, older: false });
  const generation = useRef(0);
  generation.current = state.generation;

  const load = useCallback(
    async (edge: 'newer' | 'older') => {
      if (!db) return;
      if (inFlight.current[edge]) return;

      const items = state.items;
      if (items.length === 0) return;
      if (edge === 'older' && !state.hasOlder) return;
      if (edge === 'newer' && !state.hasNewer) return;

      inFlight.current[edge] = true;
      const requestGeneration = generation.current;
      dispatch({ type: 'loadStart', edge });

      try {
        const page =
          edge === 'older'
            ? await getPageBefore(db, items[0].id, settings.pageSize)
            : await getPageAfter(db, items[items.length - 1].id, settings.pageSize);

        dispatch({
          type: 'loadEnd',
          edge,
          page,
          pageSize: settings.pageSize,
          trimCap: settings.trimCap,
          generation: requestGeneration,
        });
      } finally {
        inFlight.current[edge] = false;
      }
    },
    [db, settings.pageSize, settings.trimCap, state.hasNewer, state.hasOlder, state.items],
  );

  const loadOlder = useCallback(() => {
    void load('older');
  }, [load]);

  const loadNewer = useCallback(() => {
    void load('newer');
  }, [load]);

  const jumpTo = useCallback(
    async (target: JumpTarget) => {
      if (!db) return;
      inFlight.current.newer = false;
      inFlight.current.older = false;

      if (target === 'start') {
        const items = await getFirstPage(db, settings.pageSize);
        dispatch({ type: 'reset', items, hasOlder: false, hasNewer: true });
        setTargetIndex(0);
        return;
      }

      if (target === 'latest') {
        const items = await getLatestPage(db, settings.pageSize);
        dispatch({ type: 'reset', items, hasOlder: true, hasNewer: false });
        setTargetIndex(Math.max(0, items.length - 1));
        return;
      }

      const middleId = await getMiddleId(db);
      if (!middleId) return;
      const items = await getAround(db, middleId, settings.pageSize);
      dispatch({ type: 'reset', items, hasOlder: true, hasNewer: true });
      setTargetIndex(items.findIndex((m) => m.id === middleId));
    },
    [db, settings.pageSize],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!db || body.trim().length === 0) return;
      const message = await insertOutgoing(db, body.trim());
      // Only meaningful when the window already reaches the newest message.
      if (!state.hasNewer) dispatch({ type: 'append', message });
    },
    [db, state.hasNewer],
  );

  // Open at the bottom of the channel.
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    (async () => {
      const { count } = await getBounds(db);
      if (cancelled || count === 0) return;
      const items = await getLatestPage(db, settings.pageSize);
      if (cancelled) return;
      dispatch({ type: 'reset', items, hasOlder: true, hasNewer: false });
      setTargetIndex(Math.max(0, items.length - 1));
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally runs once per mount: the initial window is not re-fetched
    // when the page size changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  return {
    jumpTo: useCallback((target: JumpTarget) => void jumpTo(target), [jumpTo]),
    loadNewer,
    loadOlder,
    sendMessage: useCallback((body: string) => void sendMessage(body), [sendMessage]),
    state,
    targetIndex,
  };
}
```

- [ ] **Step 3: Check diagnostics and commit**

Check MCP diagnostics for both files. With React Compiler enabled, verify no compiler bailout warnings appear for `useChatWindow`.

```bash
git add src/chat/settings.tsx src/chat/useChatWindow.ts
git commit -m "feat: add chat settings context and window hook"
```

---

### Task 8: Seeding gate, variant registry, navigation and the Home menu

First on-device milestone: the corpus actually gets built and the menu lists every variant.

**Files:**
- Create: `src/chat/DbProvider.tsx`, `src/variants.ts`, `src/screens/SeedingScreen.tsx`
- Modify: `src/screens/HomeScreen.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `openChatDb`, `ensureSeeded`, `reseed` from `chat/db`; `SettingsProvider`.
- Produces:
  - `type EngineKey = 'flatlist' | 'flashlist-v1' | 'flashlist-v2' | 'legend-v2' | 'legend-v3'`
  - `type VariantKey` (the eight string literals below)
  - `type Variant = { engine: EngineKey; group: string; inverted: boolean; key: VariantKey; note?: string; title: string }`
  - `VARIANTS: Variant[]`, `getVariant(key: VariantKey): Variant`
  - `useDb(): { db: SQLiteDatabase | null; progress: { done: number; total: number }; ready: boolean; reseedNow: () => void }`

- [ ] **Step 1: Write the variant registry**

Create `src/variants.ts`:

```ts
export type EngineKey =
  | 'flashlist-v1'
  | 'flashlist-v2'
  | 'flatlist'
  | 'legend-v2'
  | 'legend-v3';

export type VariantKey =
  | 'flashlist-v1-inverted'
  | 'flashlist-v1-normal'
  | 'flashlist-v2-inverted'
  | 'flashlist-v2-normal'
  | 'flatlist-inverted'
  | 'flatlist-normal'
  | 'legend-v2-normal'
  | 'legend-v3-normal';

export type Variant = {
  engine: EngineKey;
  /** Menu section heading. */
  group: string;
  inverted: boolean;
  key: VariantKey;
  /** Shown in the chat header when the engine has a relevant limitation. */
  note?: string;
  title: string;
};

export const VARIANTS: Variant[] = [
  {
    key: 'flatlist-inverted',
    engine: 'flatlist',
    group: 'FlatList (RN 0.86.2)',
    inverted: true,
    title: 'Inverted',
  },
  {
    key: 'flatlist-normal',
    engine: 'flatlist',
    group: 'FlatList (RN 0.86.2)',
    inverted: false,
    title: 'Normal + MVCP',
  },
  {
    key: 'flashlist-v1-inverted',
    engine: 'flashlist-v1',
    group: 'FlashList v1 (1.8.3)',
    inverted: true,
    note: 'No onStartReached (onScroll shim). No maintainVisibleContentPosition.',
    title: 'Inverted',
  },
  {
    key: 'flashlist-v1-normal',
    engine: 'flashlist-v1',
    group: 'FlashList v1 (1.8.3)',
    inverted: false,
    note: 'No onStartReached (onScroll shim). No MVCP — prepends will jump.',
    title: 'Normal',
  },
  {
    key: 'flashlist-v2-inverted',
    engine: 'flashlist-v2',
    group: 'FlashList v2 (2.3.2)',
    inverted: true,
    title: 'Inverted',
  },
  {
    key: 'flashlist-v2-normal',
    engine: 'flashlist-v2',
    group: 'FlashList v2 (2.3.2)',
    inverted: false,
    title: 'Normal + MVCP',
  },
  {
    key: 'legend-v2-normal',
    engine: 'legend-v2',
    group: 'Legend List v2 (2.0.19)',
    inverted: false,
    note: 'No inverted prop — bottom anchoring via alignItemsAtEnd.',
    title: 'alignItemsAtEnd',
  },
  {
    key: 'legend-v3-normal',
    engine: 'legend-v3',
    group: 'Legend List v3 (3.3.6)',
    inverted: false,
    note: 'No inverted prop — bottom anchoring via alignItemsAtEnd.',
    title: 'alignItemsAtEnd',
  },
];

export function getVariant(key: VariantKey): Variant {
  const variant = VARIANTS.find((v) => v.key === key);
  if (!variant) throw new Error(`Unknown variant: ${key}`);
  return variant;
}
```

If Task 1's probe dropped FlashList v1, delete the two `flashlist-v1-*` entries here and add a disabled row in `HomeScreen` reading `FlashList v1 (1.8.3) — dropped, does not build against RN 0.86`.

- [ ] **Step 2: Implement the DB provider**

Create `src/chat/DbProvider.tsx`:

```tsx
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { ensureSeeded, openChatDb, reseed } from './db';
import { MESSAGE_COUNT } from './generator';

type DbValue = {
  db: SQLiteDatabase | null;
  progress: { done: number; total: number };
  ready: boolean;
  reseedNow: () => void;
};

const DbContext = createContext<DbValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: MESSAGE_COUNT });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opened = await openChatDb();
      if (cancelled) return;
      setDb(opened);
      await ensureSeeded(opened, (done, total) => {
        if (!cancelled) setProgress({ done, total });
      });
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reseedNow = useCallback(() => {
    if (!db) return;
    setReady(false);
    setProgress({ done: 0, total: MESSAGE_COUNT });
    void reseed(db, (done, total) => setProgress({ done, total })).then(() => setReady(true));
  }, [db]);

  const value = useMemo(() => ({ db, progress, ready, reseedNow }), [db, progress, ready, reseedNow]);

  return <DbContext value={value}>{children}</DbContext>;
}

export function useDb(): DbValue {
  const value = use(DbContext);
  if (!value) throw new Error('useDb must be used inside DbProvider');
  return value;
}
```

- [ ] **Step 3: Implement the seeding screen**

Create `src/screens/SeedingScreen.tsx`:

```tsx
import { View } from 'react-native';

import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';

export default function SeedingScreen({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <Text variant="h4">Generating messages</Text>
      <Text variant="muted">
        {done.toLocaleString()} / {total.toLocaleString()}
      </Text>
      <Progress value={percent} className="w-full" />
    </View>
  );
}
```

Check `src/components/ui/progress.tsx` for its actual prop name before writing this; if it does not take `value`, use a plain `View` with a width percentage instead.

- [ ] **Step 4: Implement the Home menu**

Replace `src/screens/HomeScreen.tsx`:

```tsx
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VARIANTS, type Variant } from '@/variants';

export default function HomeScreen() {
  const navigation = useNavigation();

  const groups = VARIANTS.reduce<Record<string, Variant[]>>((acc, variant) => {
    (acc[variant.group] ??= []).push(variant);
    return acc;
  }, {});

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <Text variant="muted">
        100,000 messages, variable heights, image and video attachments, double-ended pagination.
      </Text>
      {Object.entries(groups).map(([group, variants]) => (
        <View key={group} className="gap-2">
          <Text variant="large">{group}</Text>
          {variants.map((variant) => (
            <Button
              key={variant.key}
              variant="outline"
              className="h-auto items-start py-3"
              onPress={() => navigation.navigate('Chat', { variant: variant.key })}>
              <View className="gap-1">
                <Text>{variant.title}</Text>
                {variant.note ? <Text variant="muted">{variant.note}</Text> : null}
              </View>
            </Button>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
```

- [ ] **Step 5: Wire navigation and the providers**

Replace the navigator section of `src/App.tsx`:

```tsx
import { useColorScheme } from 'react-native';
import { createStaticNavigation, type StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';

import './global.css';

import { useEffect } from 'react';

import { DbProvider, useDb } from '@/chat/DbProvider';
import { SettingsProvider } from '@/chat/settings';
import { NAV_THEME } from '@/lib/theme';
import ChatScreen from '@/screens/ChatScreen';
import HomeScreen from '@/screens/HomeScreen';
import SeedingScreen from '@/screens/SeedingScreen';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: { screen: HomeScreen, options: { title: 'List comparison' } },
    Chat: ChatScreen,
  },
});

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Navigation = createStaticNavigation(RootStack);

SplashScreen.preventAutoHideAsync();

function Root() {
  const colorScheme = useColorScheme();
  const { progress, ready } = useDb();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!ready) {
    return <SeedingScreen done={progress.done} total={progress.total} />;
  }

  return <Navigation theme={colorScheme === 'dark' ? NAV_THEME.dark : NAV_THEME.light} />;
}

export default function App() {
  return (
    <DbProvider>
      <SettingsProvider>
        <Root />
        <PortalHost />
      </SettingsProvider>
    </DbProvider>
  );
}
```

`ChatScreen` does not exist yet — create a stub so this compiles; Task 9 replaces it:

```tsx
// src/screens/ChatScreen.tsx
import { View } from 'react-native';
import type { StaticScreenProps } from '@react-navigation/native';

import { Text } from '@/components/ui/text';
import type { VariantKey } from '@/variants';

export type ChatScreenProps = StaticScreenProps<{ variant: VariantKey }>;

export default function ChatScreen({ route }: ChatScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text>{route.params.variant}</Text>
    </View>
  );
}
```

- [ ] **Step 6: Run and watch the seed complete**

```bash
yarn ios
```

Expected: the seeding screen counts to 100,000 and the menu appears. Note how long seeding takes; if it exceeds roughly 30 seconds, raise `BATCH_SIZE` in `db.ts` and re-measure.

- [ ] **Step 7: Verify with argent**

```
list-devices                       → the booted simulator
launch-app  dev.critteros.testList
await-ui-element  { condition: "text", selector: { text: "FlatList" }, expectedText: "FlatList", timeoutMs: 120000 }
describe                           → confirm all eight variant rows are listed
screenshot
```

Then tap one variant using coordinates taken **from the `describe` output** (never from the screenshot) and confirm the stub screen shows the variant key. Go back.

- [ ] **Step 8: Confirm persistence across a restart**

```
restart-app  dev.critteros.testList
await-ui-element  { condition: "text", selector: { text: "FlatList" }, expectedText: "FlatList", timeoutMs: 15000 }
```

Expected: no seeding screen the second time — the corpus survived the app lifecycle.

- [ ] **Step 9: Check diagnostics and commit**

```bash
git add src/variants.ts src/chat/DbProvider.tsx src/screens/SeedingScreen.tsx src/screens/HomeScreen.tsx src/screens/ChatScreen.tsx src/App.tsx
git commit -m "feat: add variant menu, seeding gate and chat route"
```

---

### Task 9: Message rows, chat chrome, and the FlatList engine

The first working chat screen. Text bubbles only; media arrives in Task 11.

**Files:**
- Create: `src/engines/FlatListChat.tsx`, `src/chat/MessageRow.tsx`, `src/chat/day-boundary.ts`, `src/chat/day-boundary.test.ts`
- Modify: `src/chat/types.ts`, `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `useChatWindow`, `useDb`, `useSettings`, `getVariant`.
- Produces:
  - `type ChatListProps` and `type ChatListHandle` (added to `chat/types.ts`)
  - `FlatListChat: (props: ChatListProps) => ReactElement`
  - `MessageRow: (props: { message: Message; previous: Message | null }) => ReactElement`
  - `isDayBoundary(current: Message, previous: Message | null): boolean`

- [ ] **Step 1: Add the engine contract to `chat/types.ts`**

The `import` line goes at the **top** of the file; the type declarations are appended after the existing `Message` type.

```ts
import type { ReactElement, Ref } from 'react';

export type ChatListHandle = {
  scrollToBottom: () => void;
  scrollToIndex: (index: number, position?: 'bottom' | 'center' | 'top') => void;
};

/**
 * The whole surface an engine has to satisfy. Deliberately says nothing about
 * how a list should be configured — the differences between engines are the
 * point of the demo, not something to normalise away.
 */
export type ChatListProps = {
  /** Always ascending, oldest first. Engines reverse it themselves if inverted. */
  items: Message[];
  /** `index` is always in ascending-index space. */
  renderItem: (message: Message, index: number) => ReactElement;
  onOlderNeeded: () => void;
  onNewerNeeded: () => void;
  loadingOlder: boolean;
  loadingNewer: boolean;
  /** Ascending index to open at. */
  initialScrollIndex?: number;
  inverted?: boolean;
  ref?: Ref<ChatListHandle>;
};
```

- [ ] **Step 2: Write the failing day-boundary test**

Create `src/chat/day-boundary.test.ts`:

```ts
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
  const a = at(Date.UTC(2024, 0, 1, 1));
  const b = at(Date.UTC(2024, 0, 1, 23));
  assert.equal(isDayBoundary(b, a), false);
});

test('crossing midnight is a boundary', () => {
  const a = at(Date.UTC(2024, 0, 1, 23, 59));
  const b = at(Date.UTC(2024, 0, 2, 0, 1));
  assert.equal(isDayBoundary(b, a), true);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `yarn test`
Expected: FAIL — `Cannot find module './day-boundary.ts'`.

- [ ] **Step 4: Implement the helper**

Create `src/chat/day-boundary.ts`:

```ts
import type { Message } from './types.ts';

/** True when `current` is the first message of its calendar day in the window. */
export function isDayBoundary(current: Message, previous: Message | null): boolean {
  if (!previous) return true;
  const a = new Date(previous.ts);
  const b = new Date(current.ts);
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `yarn test`
Expected: all passing.

- [ ] **Step 6: Implement `MessageRow`**

Create `src/chat/MessageRow.tsx`:

```tsx
import { memo, type ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

import { isDayBoundary } from './day-boundary';
import type { Message } from './types';

const AUTHOR_NAMES = ['Me', 'Ada', 'Grace', 'Alan'];

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export type MessageRowProps = {
  message: Message;
  /** The message immediately older than this one in the window, if loaded. */
  previous: Message | null;
};

/**
 * The day separator renders INSIDE the row, never as its own list item, so
 * item count equals message count on every engine and the comparison stays
 * like-for-like.
 */
function MessageRowImpl({ message, previous }: MessageRowProps): ReactElement {
  const mine = message.author === 0;

  return (
    <View className="px-3">
      {isDayBoundary(message, previous) ? (
        <View className="items-center py-3">
          <Text variant="muted" className="rounded-full bg-muted px-3 py-1 text-xs">
            {formatDay(message.ts)}
          </Text>
        </View>
      ) : null}

      <View className={cn('py-1', mine ? 'items-end' : 'items-start')}>
        {!mine ? (
          <Text variant="muted" className="mb-0.5 ml-2 text-xs">
            {AUTHOR_NAMES[message.author] ?? `User ${message.author}`}
          </Text>
        ) : null}

        <View
          className={cn(
            'max-w-[80%] rounded-2xl px-3 py-2',
            mine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-muted',
          )}>
          {message.body ? (
            <Text className={cn(mine && 'text-primary-foreground')}>{message.body}</Text>
          ) : null}
          <Text
            variant="muted"
            className={cn('mt-1 text-[10px]', mine && 'text-primary-foreground/70')}>
            {formatTime(message.ts)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const MessageRow = memo(MessageRowImpl);
```

- [ ] **Step 7: Implement the FlatList engine**

Create `src/engines/FlatListChat.tsx`:

```tsx
import { useImperativeHandle, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';

const POSITION: Record<'bottom' | 'center' | 'top', number> = {
  bottom: 1,
  center: 0.5,
  top: 0,
};

export function FlatListChat({
  items,
  renderItem,
  onOlderNeeded,
  onNewerNeeded,
  loadingOlder,
  loadingNewer,
  initialScrollIndex,
  inverted = false,
  ref,
}: ChatListProps) {
  const listRef = useRef<FlatList<Message>>(null);

  // Inverted lists render newest first; the store never learns about that.
  const data = useMemo(() => (inverted ? [...items].reverse() : items), [inverted, items]);
  const toListIndex = (ascendingIndex: number) =>
    inverted ? items.length - 1 - ascendingIndex : ascendingIndex;

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => {
        if (inverted) listRef.current?.scrollToOffset({ offset: 0, animated: false });
        else listRef.current?.scrollToEnd({ animated: false });
      },
      scrollToIndex: (index, position = 'center') => {
        listRef.current?.scrollToIndex({
          index: toListIndex(index),
          animated: false,
          viewPosition: POSITION[position],
        });
      },
    }),
    // toListIndex is derived from items.length and inverted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inverted, items.length],
  );

  const Spinner = ({ visible }: { visible: boolean }) =>
    visible ? (
      <View className="items-center py-4">
        <ActivityIndicator />
      </View>
    ) : null;

  return (
    <FlatList
      ref={listRef}
      data={data}
      inverted={inverted}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) =>
        renderItem(item, inverted ? items.length - 1 - index : index)
      }
      initialScrollIndex={
        initialScrollIndex === undefined ? undefined : toListIndex(initialScrollIndex)
      }
      // In an inverted list the visual top is the end of the data, so the
      // edges swap: end = older, start = newer.
      onEndReached={inverted ? onOlderNeeded : onNewerNeeded}
      onStartReached={inverted ? onNewerNeeded : onOlderNeeded}
      onEndReachedThreshold={0.5}
      onStartReachedThreshold={0.5}
      ListHeaderComponent={<Spinner visible={inverted ? loadingNewer : loadingOlder} />}
      ListFooterComponent={<Spinner visible={inverted ? loadingOlder : loadingNewer} />}
      // Non-inverted lists need an anchor so prepending older pages does not
      // shove the viewport down.
      maintainVisibleContentPosition={inverted ? undefined : { minIndexForVisible: 1 }}
      onScrollToIndexFailed={({ index }) => {
        setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 50);
      }}
    />
  );
}
```

- [ ] **Step 8: Implement the chat screen**

Replace `src/screens/ChatScreen.tsx`:

```tsx
import { useCallback, useRef, type ReactElement } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StaticScreenProps } from '@react-navigation/native';

import { Text } from '@/components/ui/text';
import { MessageRow } from '@/chat/MessageRow';
import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';
import { useChatWindow } from '@/chat/useChatWindow';
import { useDb } from '@/chat/DbProvider';
import { FlatListChat } from '@/engines/FlatListChat';
import { getVariant, type EngineKey, type VariantKey } from '@/variants';

export type ChatScreenProps = StaticScreenProps<{ variant: VariantKey }>;

const ENGINES: Partial<Record<EngineKey, (props: ChatListProps) => ReactElement>> = {
  flatlist: FlatListChat,
};

export default function ChatScreen({ route }: ChatScreenProps) {
  const variant = getVariant(route.params.variant);
  const { db } = useDb();
  const { state, loadOlder, loadNewer, targetIndex } = useChatWindow(db);
  const listRef = useRef<ChatListHandle>(null);
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    (message: Message, index: number) => (
      <MessageRow message={message} previous={index > 0 ? state.items[index - 1] : null} />
    ),
    [state.items],
  );

  const Engine = ENGINES[variant.engine];

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <View className="border-b border-border px-4 py-2">
        <Text variant="small">
          {variant.group} — {variant.title}
        </Text>
        {variant.note ? <Text variant="muted" className="text-xs">{variant.note}</Text> : null}
      </View>

      {Engine ? (
        <Engine
          ref={listRef}
          items={state.items}
          renderItem={renderItem}
          onOlderNeeded={loadOlder}
          onNewerNeeded={loadNewer}
          loadingOlder={state.loadingOlder}
          loadingNewer={state.loadingNewer}
          initialScrollIndex={targetIndex}
          inverted={variant.inverted}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text variant="muted">Engine not implemented yet</Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 9: Verify both FlatList variants with argent**

```bash
yarn ios
```

Then:

```
launch-app  dev.critteros.testList
describe                                   → find the "Inverted" row under FlatList
gesture-tap  <coords from describe>
describe                                   → confirm message bubbles rendered
screenshot
```

Check, for the inverted variant:
- the newest message is at the bottom on open;
- swiping down (`gesture-swipe` from `{fromY: 0.3, toY: 0.8}`) loads older pages and the spinner appears at the top;
- day separators appear between days;
- bubble heights visibly differ.

Then go back and repeat for **Normal + MVCP**, watching specifically whether the viewport stays put when an older page is prepended.

- [ ] **Step 10: Check diagnostics and commit**

```bash
git add src/chat/types.ts src/chat/day-boundary.ts src/chat/day-boundary.test.ts src/chat/MessageRow.tsx src/engines/FlatListChat.tsx src/screens/ChatScreen.tsx
git commit -m "feat: add message rows, chat screen and FlatList engine"
```

---

### Task 10: Image and video attachments

**Files:**
- Create: `src/chat/VideoProvider.tsx`
- Modify: `src/chat/MessageRow.tsx`, `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `expo-image`, `expo-video`.
- Produces:
  - `VideoProvider`, `useVideo(): { activeId: string | null; play: (message: Message) => void; player: VideoPlayer }`

- [ ] **Step 1: Read the SDK 57 docs**

Read https://docs.expo.dev/versions/v57.0.0/sdk/video/ and https://docs.expo.dev/versions/v57.0.0/sdk/image/ before writing this task. The relevant surface is `useVideoPlayer(source, setup?)`, `player.replaceAsync(source)`, `player.play()`, `<VideoView player nativeControls contentFit />`, and `<Image onLoad={(e) => e.source.width} recyclingKey contentFit />`.

Note the documented Android limitation: mounting more than one `VideoView` against the same player does not work. That is fine here — exactly one row ever holds the player.

- [ ] **Step 2: Implement the shared player**

Create `src/chat/VideoProvider.tsx`:

```tsx
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';

import type { Message } from './types';

type VideoValue = {
  /** The message currently holding the player, if any. */
  activeId: string | null;
  play: (message: Message) => void;
  player: VideoPlayer;
};

const VideoContext = createContext<VideoValue | null>(null);

/**
 * One player for the whole screen. Tapping another video moves the same
 * instance rather than mounting a second one — video is tap-to-play only and
 * is never autoplayed.
 */
export function VideoProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
  });

  const play = useCallback(
    (message: Message) => {
      if (!message.mediaUrl) return;
      setActiveId(message.id);
      void player.replaceAsync({ uri: message.mediaUrl }).then(() => player.play());
    },
    [player],
  );

  const value = useMemo(() => ({ activeId, play, player }), [activeId, play, player]);

  return <VideoContext value={value}>{children}</VideoContext>;
}

export function useVideo(): VideoValue {
  const value = use(VideoContext);
  if (!value) throw new Error('useVideo must be used inside VideoProvider');
  return value;
}
```

- [ ] **Step 3: Add media bubbles to `MessageRow`**

Add these imports and the two components to `src/chat/MessageRow.tsx`, and render them from `MessageRowImpl` in place of the text body when `message.kind !== 'text'`:

```tsx
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Image } from 'expo-image';
import { VideoView } from 'expo-video';

import { useVideo } from './VideoProvider';

const BUBBLE_WIDTH = 240;

function ImageBubble({ message }: { message: Message }) {
  // Half the image rows arrive with unknown dimensions. Those start at a
  // placeholder height and grow when the image reports its real size — the
  // post-load height change every engine has to absorb.
  const known = message.mediaW !== null && message.mediaH !== null;
  const [ratio, setRatio] = useState<number | null>(
    known ? message.mediaW! / message.mediaH! : null,
  );

  return (
    <Image
      source={{ uri: message.mediaUrl! }}
      recyclingKey={message.id}
      contentFit="cover"
      transition={100}
      onLoad={(event) => {
        if (ratio === null) setRatio(event.source.width / event.source.height);
      }}
      style={{
        width: BUBBLE_WIDTH,
        height: ratio === null ? 80 : BUBBLE_WIDTH / ratio,
        borderRadius: 12,
      }}
    />
  );
}

function VideoBubble({ message }: { message: Message }) {
  const { activeId, play, player } = useVideo();
  const ratio = (message.mediaW ?? 16) / (message.mediaH ?? 9);
  const height = BUBBLE_WIDTH / ratio;

  if (activeId === message.id) {
    return (
      <VideoView
        player={player}
        nativeControls
        contentFit="contain"
        style={{ width: BUBBLE_WIDTH, height, borderRadius: 12 }}
      />
    );
  }

  return (
    <Pressable onPress={() => play(message)}>
      <Image
        source={{ uri: message.posterUrl! }}
        recyclingKey={message.id}
        contentFit="cover"
        style={{ width: BUBBLE_WIDTH, height, borderRadius: 12 }}
      />
      <View className="absolute inset-0 items-center justify-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-black/60">
          <Text className="text-white">▶</Text>
        </View>
      </View>
    </Pressable>
  );
}
```

In `MessageRowImpl`, replace the body block with:

```tsx
{message.kind === 'text' ? (
  <Text className={cn(mine && 'text-primary-foreground')}>{message.body}</Text>
) : message.kind === 'image' ? (
  <ImageBubble message={message} />
) : (
  <VideoBubble message={message} />
)}
```

and change the bubble container's `max-w-[80%] px-3 py-2` to `max-w-[80%] p-1` when the message is not text, so media is not inset by bubble padding.

- [ ] **Step 4: Wrap the chat screen in the video provider**

The provider belongs on the screen, not the app, so leaving the chat disposes the player. In `src/screens/ChatScreen.tsx`, rename the existing component to `ChatScreenBody` and add a wrapper as the default export:

```tsx
import { VideoProvider } from '@/chat/VideoProvider';

function ChatScreenBody({ route }: ChatScreenProps) {
  // …the existing component body, unchanged…
}

export default function ChatScreen(props: ChatScreenProps) {
  return (
    <VideoProvider>
      <ChatScreenBody {...props} />
    </VideoProvider>
  );
}
```

- [ ] **Step 5: Verify with argent**

```bash
yarn ios
```

```
launch-app  dev.critteros.testList
describe                          → tap FlatList → Inverted
gesture-swipe                     → scroll until images and video posters are visible
screenshot
describe                          → locate a video poster row
gesture-tap  <coords from describe>
await-ui-element  { condition: "visible", selector: { role: "AXVideo" }, timeoutMs: 8000 }
screenshot                        → the player replaced the poster in that row
```

Confirm:
- images with known dimensions render at full height immediately;
- images with unknown dimensions start short and **visibly grow**, shifting the rows below (this is the intended stressor, not a bug);
- tapping a second video moves the player rather than mounting a second one.

- [ ] **Step 6: Handle picsum rate limiting if it shows up**

Scroll fast for 30 seconds and watch for images that never resolve. `picsum.photos` may rate-limit under that load. If a meaningful share of images fail, replace the per-message URL in `generator.ts` with a small fixed pool reused across messages, keeping the requested dimensions so layout behaviour is unchanged:

```ts
const IMAGE_POOL_SIZE = 24;
// …inside the image branch, replacing the seeded URL:
mediaUrl: `https://picsum.photos/id/${10 + (i % IMAGE_POOL_SIZE)}/${width}/${height}`,
```

Visual repetition is acceptable here; unknown-dimension layout behaviour is what matters. Changing the generator changes the corpus, so also bump `SEED_VERSION` in `db.ts` and re-run `yarn test` (the generator tests assert on composition, not URLs, so they should still pass).

- [ ] **Step 7: Check diagnostics and commit**

```bash
git add src/chat/VideoProvider.tsx src/chat/MessageRow.tsx src/screens/ChatScreen.tsx
git commit -m "feat: add image and tap-to-play video attachments"
```

---

### Task 11: Jump control and both jump execution modes

**Files:**
- Modify: `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `jumpTo`, `targetIndex`, `state.generation` from `useChatWindow`; `settings.jumpMode`.
- Produces: nothing new; the screen gains a Start / Middle / Latest control and honours both jump modes.

- [ ] **Step 1: Add the jump bar and mode handling**

In `src/screens/ChatScreen.tsx`, add these imports:

```tsx
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useSettings } from '@/chat/settings';
```

pull `jumpTo` out of the hook alongside the rest:

```tsx
const { state, loadOlder, loadNewer, jumpTo, sendMessage, targetIndex } = useChatWindow(db);
```

and add below the header:

```tsx
<View className="flex-row gap-2 border-b border-border px-3 py-2">
  {(['start', 'middle', 'latest'] as const).map((target) => (
    <Button key={target} size="sm" variant="secondary" onPress={() => jumpTo(target)}>
      <Text>{target === 'start' ? 'Channel start' : target === 'middle' ? 'Middle' : 'Latest'}</Text>
    </Button>
  ))}
</View>
```

and drive the two modes from `settings.jumpMode`:

```tsx
const { settings } = useSettings();

// Remount mode: keying on generation forces the engine to rebuild and honour
// initialScrollIndex. Imperative mode: the list stays mounted, the data is
// swapped wholesale, and we ask it to scroll — no safety net, which is the
// point.
useEffect(() => {
  if (settings.jumpMode !== 'imperative') return;
  if (state.items.length === 0) return;
  listRef.current?.scrollToIndex(targetIndex, 'center');
}, [settings.jumpMode, state.generation, state.items.length, targetIndex]);
```

and on the engine element:

```tsx
<Engine
  key={settings.jumpMode === 'remount' ? state.generation : 'stable'}
  ref={listRef}
  items={state.items}
  renderItem={renderItem}
  onOlderNeeded={loadOlder}
  onNewerNeeded={loadNewer}
  loadingOlder={state.loadingOlder}
  loadingNewer={state.loadingNewer}
  initialScrollIndex={settings.jumpMode === 'remount' ? targetIndex : undefined}
  inverted={variant.inverted}
/>
```

- [ ] **Step 2: Verify with argent**

```bash
yarn ios
```

For the FlatList inverted variant, in remount mode (the default):

```
describe                     → locate "Channel start"
gesture-tap  <coords>
await-ui-element  { condition: "hidden", selector: { role: "AXActivityIndicator" }, timeoutMs: 8000 }
screenshot                   → the oldest message is on screen
```

Then confirm at channel start that scrolling **up** loads nothing (`hasOlder` is false) and scrolling down loads newer pages. Then tap **Middle** and confirm both directions load — this is the double-ended test. Then **Latest** and confirm the newest message is at the bottom.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ChatScreen.tsx
git commit -m "feat: add start/middle/latest jump control with remount and imperative modes"
```

---

### Task 12: Composer and the debug sheet

**Files:**
- Create: `src/screens/DebugSheet.tsx`
- Modify: `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `useSettings`, `useDb().reseedNow`, `sendMessage` from `useChatWindow`.
- Produces: `DebugSheet: (props: { onClose: () => void; visible: boolean }) => ReactElement`

- [ ] **Step 1: Add the composer**

Add the imports:

```tsx
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { DebugSheet } from '@/screens/DebugSheet';
```

then, at the bottom of `ChatScreen`'s tree:

```tsx
<View className="flex-row items-center gap-2 border-t border-border px-3 py-2">
  <Input
    className="flex-1"
    value={draft}
    onChangeText={setDraft}
    placeholder="Message"
    onSubmitEditing={submit}
  />
  <Button size="sm" onPress={submit}>
    <Text>Send</Text>
  </Button>
</View>
```

with:

```tsx
const [draft, setDraft] = useState('');
const submit = () => {
  sendMessage(draft);
  setDraft('');
};
```

- [ ] **Step 2: Implement the debug sheet**

Create `src/screens/DebugSheet.tsx`:

```tsx
import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useDb } from '@/chat/DbProvider';
import { useSettings } from '@/chat/settings';

const PAGE_SIZES = [20, 40, 80];
const TRIM_CAPS: (number | null)[] = [null, 200, 300, 500];
const LATENCIES = [0, 100, 250, 800];

function Row({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text variant="small">{label}</Text>
      <View className="flex-row items-center gap-2">{children}</View>
    </View>
  );
}

function Choice<T>({
  onSelect,
  options,
  render,
  value,
}: {
  onSelect: (option: T) => void;
  options: T[];
  render: (option: T) => string;
  value: T;
}) {
  return (
    <>
      {options.map((option) => (
        <Button
          key={render(option)}
          size="sm"
          variant={option === value ? 'default' : 'outline'}
          onPress={() => onSelect(option)}>
          <Text>{render(option)}</Text>
        </Button>
      ))}
    </>
  );
}

export function DebugSheet({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  const { settings, update } = useSettings();
  const { reseedNow } = useDb();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="gap-1 rounded-t-2xl bg-background p-4">
          <Text variant="h4">Debug</Text>
          <Separator className="my-2" />

          <Row label="Page size">
            <Choice
              options={PAGE_SIZES}
              value={settings.pageSize}
              render={(n) => String(n)}
              onSelect={(pageSize) => update({ pageSize })}
            />
          </Row>

          <Row label="Trim cap">
            <Choice
              options={TRIM_CAPS}
              value={settings.trimCap}
              render={(n) => (n === null ? 'Grow only' : String(n))}
              onSelect={(trimCap) => update({ trimCap })}
            />
          </Row>

          <Row label="Latency (ms)">
            <Choice
              options={LATENCIES}
              value={settings.latencyMs}
              render={(n) => String(n)}
              onSelect={(latencyMs) => update({ latencyMs })}
            />
          </Row>

          <Row label="Jump mode">
            <Choice
              options={['remount', 'imperative'] as const}
              value={settings.jumpMode}
              render={(m) => m}
              onSelect={(jumpMode) => update({ jumpMode })}
            />
          </Row>

          <Row label="recycleItems (Legend)">
            <Switch
              checked={settings.recycleItems}
              onCheckedChange={(recycleItems) => update({ recycleItems })}
            />
          </Row>

          <Separator className="my-2" />
          <Button variant="destructive" onPress={reseedNow}>
            <Text>Reseed corpus</Text>
          </Button>
          <Button variant="ghost" onPress={onClose}>
            <Text>Close</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
```

Check `src/components/ui/switch.tsx` for its actual prop names (`checked`/`onCheckedChange` vs `value`/`onValueChange`) and match them.

- [ ] **Step 3: Add the sheet trigger to the header**

In `ChatScreenBody`, add the state:

```tsx
const [sheetOpen, setSheetOpen] = useState(false);
```

change the header block to make room for the trigger:

```tsx
<View className="flex-row items-center justify-between border-b border-border px-4 py-2">
  <View className="flex-1">
    <Text variant="small">
      {variant.group} — {variant.title}
    </Text>
    {variant.note ? <Text variant="muted" className="text-xs">{variant.note}</Text> : null}
  </View>
  <Button size="sm" variant="ghost" onPress={() => setSheetOpen(true)}>
    <Text>Debug</Text>
  </Button>
</View>
```

and render the sheet as the last child of the screen's root `View`:

```tsx
<DebugSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
```

- [ ] **Step 4: Verify with argent**

```bash
yarn ios
```

```
describe                → open a variant, then locate "Debug"
gesture-tap  <coords>
describe                → confirm every control is listed
gesture-tap  <coords of "300" under Trim cap>
gesture-tap  <coords of "Close">
gesture-swipe           → scroll far enough to load several pages
```

Confirm with trimming on that the list stops growing (the far-edge spinner reappears once trimmed content is needed again), and that setting latency to 0 makes pagination visibly snappier. Send a message from the composer and confirm it appears at the newest end.

- [ ] **Step 5: Check diagnostics and commit**

```bash
git add src/screens/DebugSheet.tsx src/screens/ChatScreen.tsx
git commit -m "feat: add composer and runtime debug settings sheet"
```

---

### Task 13: FlashList v2 engine

**Files:**
- Create: `src/engines/FlashV2Chat.tsx`
- Modify: `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `ChatListProps`, `ChatListHandle`.
- Produces: `FlashV2Chat: (props: ChatListProps) => ReactElement`

- [ ] **Step 1: Implement the engine**

Create `src/engines/FlashV2Chat.tsx`:

```tsx
import { useImperativeHandle, useMemo, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';

import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;

export function FlashV2Chat({
  items,
  renderItem,
  onOlderNeeded,
  onNewerNeeded,
  loadingOlder,
  loadingNewer,
  initialScrollIndex,
  inverted = false,
  ref,
}: ChatListProps) {
  const listRef = useRef<FlashListRef<Message>>(null);
  const data = useMemo(() => (inverted ? [...items].reverse() : items), [inverted, items]);
  const toListIndex = (ascendingIndex: number) =>
    inverted ? items.length - 1 - ascendingIndex : ascendingIndex;

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => {
        if (inverted) listRef.current?.scrollToTop({ animated: false });
        else listRef.current?.scrollToEnd({ animated: false });
      },
      scrollToIndex: (index, position = 'center') => {
        void listRef.current?.scrollToIndex({
          index: toListIndex(index),
          animated: false,
          viewPosition: POSITION[position],
        });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inverted, items.length],
  );

  const Spinner = ({ visible }: { visible: boolean }) =>
    visible ? (
      <View className="items-center py-4">
        <ActivityIndicator />
      </View>
    ) : null;

  return (
    <FlashList
      ref={listRef}
      data={data}
      inverted={inverted}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) =>
        renderItem(item, inverted ? items.length - 1 - index : index)
      }
      initialScrollIndex={
        initialScrollIndex === undefined ? undefined : toListIndex(initialScrollIndex)
      }
      onEndReached={inverted ? onOlderNeeded : onNewerNeeded}
      onStartReached={inverted ? onNewerNeeded : onOlderNeeded}
      onEndReachedThreshold={0.5}
      onStartReachedThreshold={0.5}
      ListHeaderComponent={<Spinner visible={inverted ? loadingNewer : loadingOlder} />}
      ListFooterComponent={<Spinner visible={inverted ? loadingOlder : loadingNewer} />}
      // v2 has MVCP built in; only the non-inverted variant needs it configured.
      maintainVisibleContentPosition={inverted ? undefined : { startRenderingFromBottom: false }}
    />
  );
}
```

There is deliberately **no `estimatedItemSize`** — v2 removed it, and no size hint is given anywhere.

- [ ] **Step 2: Register it**

In `ChatScreen`, add `'flashlist-v2': FlashV2Chat` to `ENGINES`.

- [ ] **Step 3: Verify both v2 variants with argent**

Run the same checks as Task 9 Step 9 plus Task 11 Step 2 (all three jumps), for **FlashList v2 → Inverted** and **FlashList v2 → Normal + MVCP**.

- [ ] **Step 4: Check diagnostics and commit**

```bash
git add src/engines/FlashV2Chat.tsx src/screens/ChatScreen.tsx
git commit -m "feat: add FlashList v2 engine"
```

---

### Task 14: FlashList v1 engine with the start-reached shim

Skip this task entirely if Task 1's probe dropped `flash-list-v1`.

**Files:**
- Create: `src/engines/FlashV1Chat.tsx`
- Modify: `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `ChatListProps`, `ChatListHandle`.
- Produces: `FlashV1Chat: (props: ChatListProps) => ReactElement`

- [ ] **Step 1: Implement the engine**

Create `src/engines/FlashV1Chat.tsx`:

```tsx
import { useImperativeHandle, useMemo, useRef } from 'react';
import { ActivityIndicator, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { FlashList } from 'flash-list-v1';

import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;
/** How close to offset 0 counts as "reached the start", in points. */
const START_THRESHOLD = 400;
/**
 * Deliberately rough. Rows here run from one line to more than a screen, so
 * this estimate is wrong most of the time — observing what that costs is the
 * point of including v1.
 */
const ESTIMATED_ITEM_SIZE = 80;

export function FlashV1Chat({
  items,
  renderItem,
  onOlderNeeded,
  onNewerNeeded,
  loadingOlder,
  loadingNewer,
  initialScrollIndex,
  inverted = false,
  ref,
}: ChatListProps) {
  const listRef = useRef<FlashList<Message>>(null);
  const data = useMemo(() => (inverted ? [...items].reverse() : items), [inverted, items]);
  const toListIndex = (ascendingIndex: number) =>
    inverted ? items.length - 1 - ascendingIndex : ascendingIndex;
  const startFired = useRef(false);

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => {
        if (inverted) listRef.current?.scrollToOffset({ offset: 0, animated: false });
        else listRef.current?.scrollToEnd({ animated: false });
      },
      scrollToIndex: (index, position = 'center') => {
        listRef.current?.scrollToIndex({
          index: toListIndex(index),
          animated: false,
          viewPosition: POSITION[position],
        });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inverted, items.length],
  );

  // v1 has no onStartReached, so the second pagination direction is an
  // offset-threshold shim over onScroll. It is intentionally left visible
  // rather than hidden behind an abstraction.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y;
    if (offset < START_THRESHOLD) {
      if (!startFired.current) {
        startFired.current = true;
        if (inverted) onNewerNeeded();
        else onOlderNeeded();
      }
    } else {
      startFired.current = false;
    }
  };

  const Spinner = ({ visible }: { visible: boolean }) =>
    visible ? (
      <View className="items-center py-4">
        <ActivityIndicator />
      </View>
    ) : null;

  return (
    <FlashList
      ref={listRef}
      data={data}
      inverted={inverted}
      estimatedItemSize={ESTIMATED_ITEM_SIZE}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) =>
        renderItem(item, inverted ? items.length - 1 - index : index)
      }
      initialScrollIndex={
        initialScrollIndex === undefined ? undefined : toListIndex(initialScrollIndex)
      }
      onEndReached={inverted ? onOlderNeeded : onNewerNeeded}
      onEndReachedThreshold={0.5}
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListHeaderComponent={<Spinner visible={inverted ? loadingNewer : loadingOlder} />}
      ListFooterComponent={<Spinner visible={inverted ? loadingOlder : loadingNewer} />}
      // No maintainVisibleContentPosition prop exists in 1.8.3. The
      // non-inverted variant will visibly jump when older pages prepend.
    />
  );
}
```

- [ ] **Step 2: Register it**

In `ChatScreen`, add `'flashlist-v1': FlashV1Chat` to `ENGINES`.

- [ ] **Step 3: Verify both v1 variants with argent**

Same checks as Task 13 Step 3, and additionally record the two expected differences so they are confirmed rather than assumed:

- **Non-inverted, prepending older pages:** take a `screenshot` before triggering an older load and another after it lands. The viewport is expected to jump, because there is no MVCP. Confirm it does.
- **Start-reached shim:** confirm the second direction paginates at all, and note whether it fires late compared with v2.

- [ ] **Step 4: Check diagnostics and commit**

```bash
git add src/engines/FlashV1Chat.tsx src/screens/ChatScreen.tsx
git commit -m "feat: add FlashList v1 engine with onScroll start-reached shim"
```

---

### Task 15: Legend List v3 and v2 engines

Both are done in one task: they differ only in import path and one prop type, and they share every verification step.

**Files:**
- Create: `src/engines/LegendV3Chat.tsx`, `src/engines/LegendV2Chat.tsx`
- Modify: `src/screens/ChatScreen.tsx`

**Interfaces:**
- Consumes: `ChatListProps`, `ChatListHandle`, `useSettings().settings.recycleItems`.
- Produces: `LegendV3Chat`, `LegendV2Chat` — both `(props: ChatListProps) => ReactElement`.

- [ ] **Step 1: Implement the v3 engine**

Note the import path: `@legendapp/list@3.3.6` publishes **no root export**, only subpath exports. Importing from `'@legendapp/list'` fails.

Create `src/engines/LegendV3Chat.tsx`:

```tsx
import { useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LegendList, type LegendListRef } from '@legendapp/list/react-native';

import { useSettings } from '@/chat/settings';
import type { ChatListHandle, ChatListProps } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;

export function LegendV3Chat({
  items,
  renderItem,
  onOlderNeeded,
  onNewerNeeded,
  loadingOlder,
  loadingNewer,
  initialScrollIndex,
  ref,
}: ChatListProps) {
  const listRef = useRef<LegendListRef>(null);
  const { settings } = useSettings();

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => void listRef.current?.scrollToEnd({ animated: false }),
      scrollToIndex: (index, position = 'center') =>
        void listRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: POSITION[position],
        }),
    }),
    [],
  );

  return (
    <LegendList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => renderItem(item, index)}
      initialScrollIndex={initialScrollIndex}
      // Legend List has no `inverted` prop in either major. Bottom anchoring
      // is these two props instead.
      alignItemsAtEnd
      maintainScrollAtEnd
      maintainVisibleContentPosition
      recycleItems={settings.recycleItems}
      // No estimatedItemSize on purpose: its own measurement path is what we
      // want to observe.
      onStartReached={onOlderNeeded}
      onEndReached={onNewerNeeded}
      onStartReachedThreshold={0.5}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        loadingOlder ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
      ListFooterComponent={
        loadingNewer ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}
```

- [ ] **Step 2: Implement the v2 engine**

Written out in full rather than shared with v3: the two majors are allowed to drift, and a parameterised component would hide exactly the differences the demo exists to show. The only differences today are the import path (v2 has a root export, v3 does not) and that `maintainVisibleContentPosition` is a plain `boolean` in 2.0.19 — it accepts a config object only in v3.

Create `src/engines/LegendV2Chat.tsx`:

```tsx
import { useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LegendList, type LegendListRef } from 'legend-list-v2';

import { useSettings } from '@/chat/settings';
import type { ChatListHandle, ChatListProps } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;

export function LegendV2Chat({
  items,
  renderItem,
  onOlderNeeded,
  onNewerNeeded,
  loadingOlder,
  loadingNewer,
  initialScrollIndex,
  ref,
}: ChatListProps) {
  const listRef = useRef<LegendListRef>(null);
  const { settings } = useSettings();

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => listRef.current?.scrollToEnd({ animated: false }),
      scrollToIndex: (index, position = 'center') =>
        listRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: POSITION[position],
        }),
    }),
    [],
  );

  return (
    <LegendList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => renderItem(item, index)}
      initialScrollIndex={initialScrollIndex}
      // No `inverted` prop in v2 either. Bottom anchoring is these two props.
      alignItemsAtEnd
      maintainScrollAtEnd
      maintainVisibleContentPosition
      recycleItems={settings.recycleItems}
      // No estimatedItemSize on purpose.
      onStartReached={onOlderNeeded}
      onEndReached={onNewerNeeded}
      onStartReachedThreshold={0.5}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        loadingOlder ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
      ListFooterComponent={
        loadingNewer ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}
```

`scrollToIndex`/`scrollToEnd` return `void` in v2 and `Promise<void>` in v3, which is why the v3 file needs the `void` operator on those calls and this one does not.

- [ ] **Step 3: Register both**

In `ChatScreen`, add `'legend-v2': LegendV2Chat` and `'legend-v3': LegendV3Chat` to `ENGINES`.

- [ ] **Step 4: If Metro cannot resolve `@legendapp/list/react-native`**

Expo SDK 57 enables Metro package exports by default. If resolution fails anyway, add to `metro.config.js` before the `withNativewind` call:

```js
config.resolver.unstable_enablePackageExports = true;
```

- [ ] **Step 5: Verify both Legend variants with argent**

Same checks as Task 13 Step 3. Pay attention to:
- whether `alignItemsAtEnd` really lands at the newest message on open;
- whether older-page prepends hold position (`maintainVisibleContentPosition`);
- toggling `recycleItems` in the debug sheet and re-scrolling past images.

- [ ] **Step 6: Check diagnostics and commit**

```bash
git add src/engines/LegendV3Chat.tsx src/engines/LegendV2Chat.tsx src/screens/ChatScreen.tsx
git commit -m "feat: add Legend List v2 and v3 engines"
```

---

### Task 16: Full sweep across all variants and Android

**Files:**
- Create: `docs/superpowers/plans/findings.md`
- Modify: whatever the sweep turns up

**Interfaces:**
- Consumes: everything.
- Produces: a findings document and a green diagnostics run.

- [ ] **Step 1: Run the full test suite**

Run: `yarn test`
Expected: every test passing.

- [ ] **Step 2: Check MCP diagnostics across the project**

Check diagnostics for every file under `src/`. Fix everything reported. Do not run `tsc` or `eslint` in a shell.

- [ ] **Step 3: Sweep every variant on iOS with argent**

For each of the eight variants (six if v1 was dropped), with `describe` before every tap:

1. Open the variant; confirm it opens at the newest message.
2. Scroll up past at least three older page loads.
3. Scroll back down past at least two newer page loads.
4. Jump to **Channel start**; confirm only the newer direction paginates.
5. Jump to **Middle**; confirm **both** directions paginate.
6. Jump to **Latest**.
7. In the debug sheet set trim cap to 300; repeat steps 2–3 and confirm the window stops growing.
8. Set jump mode to imperative; repeat steps 4–6.
9. Take a `screenshot` at the end of each variant.

- [ ] **Step 4: Sweep on Android**

```bash
yarn android
```

Repeat Step 3 on the Android emulator. Watch specifically for the documented `expo-video` single-`VideoView` behaviour and for any FlashList v1 native differences.

- [ ] **Step 5: Write up the findings**

Create `docs/superpowers/plans/findings.md` recording, per variant: whether double-ended pagination works, whether the viewport holds position when older pages prepend, how jumps behave in both modes, and what happens when unknown-dimension images resize. This is the actual output of the exercise.

- [ ] **Step 6: Release the simulators**

```
stop-all-simulator-servers  { devices: [<the ids this session used>] }
```

Pass the device list explicitly — one tool server is shared with other agents, so an unscoped call would tear down their devices too.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/plans/findings.md
git commit -m "docs: record list engine comparison findings"
```
