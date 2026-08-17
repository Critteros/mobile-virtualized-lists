# List Comparison Chat Demo — Design

Date: 2026-08-17
Status: Approved design, ready for implementation planning

## Goal

Build a demo app that runs the same messenger-style chat screen on five list engines, so their behaviour can be observed side by side under conditions that defeat the usual optimisations: variable item heights, image and video attachments, double-ended infinite pagination, and jumps to arbitrary positions in a large history.

The deliverable is an app to observe, not a benchmark harness. Correctness of the shared data layer matters because a bug there would poison every comparison; beyond that, judgement is visual and external (React DevTools profiler, Argent's RN profiler, Instruments, Perfetto).

## Non-goals

- No in-app instrumentation. No FPS HUD, no metrics export, no measurement hooks inside the engines. Adapters stay clean so nothing we add perturbs what we are watching.
- No fixed-height optimisation anywhere. No `getItemLayout`, no uniform row heights, no per-item size overrides. Item heights must remain genuinely unknown until measured.
- No third-party chat API. All data is generated locally.
- No persistence across device reboots or cache clears. Persistence across the app lifecycle is required; the corpus lives in a cache-directory database.

## Engine matrix

Five engines, eight variants. Two libraries are compared across majors via package aliases.

| Engine | Version | `inverted` | `onStartReached` | `maintainVisibleContentPosition` | Size estimate | Native code |
|---|---|---|---|---|---|---|
| FlatList | RN 0.86.2 | yes | yes | yes | — | core |
| FlashList v1 | 1.8.3 | yes | **no** | **no** | `estimatedItemSize` | yes (codegen `rnflashlist`) |
| FlashList v2 | 2.3.2 | yes | yes | yes (built in) | none — removed | **no, pure JS** |
| Legend List v2 | 2.0.19 | **no** | yes | yes | optional | no, pure JS |
| Legend List v3 | 3.3.6 | **no** | yes | yes | optional | no, pure JS |

These capabilities were verified against the published type definitions, not documentation:

- FlatList inherits `onStartReached` / `onStartReachedThreshold` from `VirtualizedListProps` (`node_modules/@react-native/virtualized-lists/Lists/VirtualizedList.d.ts:318`).
- FlashList 1.8.3 declares `inverted`, `estimatedItemSize`, `estimatedListSize`, `initialScrollIndex`, `onEndReached`, `overrideItemLayout` — and no start-reached or MVCP prop.
- FlashList 2.3.2 ships no `ios/`, `android/`, or podspec and declares no `codegenConfig`; it is pure JavaScript. FlashList 1.8.3 does carry native code. Only one copy of FlashList in the tree has a podspec, so the alias does not create a duplicate-native-module collision.
- Legend List declares no `inverted` prop in either major. Bottom anchoring is `alignItemsAtEnd` + `maintainScrollAtEnd`.

Legend List 2.1.0 never left pre-release, so 2.0.19 is the newest stable v2.

The eight variants:

1. FlatList — inverted
2. FlatList — normal
3. FlashList v1 — inverted
4. FlashList v1 — normal
5. FlashList v2 — inverted
6. FlashList v2 — normal
7. Legend List v2 — normal (`alignItemsAtEnd`)
8. Legend List v3 — normal (`alignItemsAtEnd`)

## Architecture

Shared chrome and shared data, per-engine list wiring. A normalising adapter layer was rejected: a contract broad enough to cover all five would have to paper over FlashList v1's missing `onStartReached` and MVCP, erasing one of the findings the demo exists to produce.

```
src/
  variants.ts               registry of the 8 variants; feeds menu + route param
  screens/
    HomeScreen.tsx          grouped menu of variants
    ChatScreen.tsx          chrome: header, jump control, composer, debug sheet
    SeedingScreen.tsx       first-launch corpus generation progress
  chat/
    db.ts                   SQLite open, schema, seeding, cursor queries
    uuidv7.ts               deterministic time-ordered id generation
    generator.ts            seeded PRNG corpus generation
    useChatWindow.ts        loaded window, pagination, trimming, jump modes
    MessageRow.tsx          shared row: bubbles, day separator, image, video
    types.ts                Message, ChatListProps, ChatListHandle
  engines/
    FlatListChat.tsx
    FlashV1Chat.tsx
    FlashV2Chat.tsx
    LegendV2Chat.tsx
    LegendV3Chat.tsx
```

Navigation stays on the existing static `createNativeStackNavigator` config in `src/App.tsx`: `Home` plus a `Chat` route taking a variant key. Home groups variants by engine.

## Data layer

### Schema

```sql
CREATE TABLE messages (
  id         TEXT    PRIMARY KEY,  -- UUIDv7, time-ordered; doubles as cursor
  ts         INTEGER NOT NULL,     -- ms epoch, strictly ascending
  author     INTEGER NOT NULL,     -- 0 = me, 1..3 = other participants
  kind       TEXT    NOT NULL,     -- 'text' | 'image' | 'video'
  body       TEXT,
  media_url  TEXT,
  poster_url TEXT,
  media_w    INTEGER,              -- NULL = dimensions unknown until load
  media_h    INTEGER
);

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);  -- holds seed_version
```

`id` is the sole identity and the sole cursor. UUIDv7 is time-ordered, so lexicographic comparison of the hex string equals chronological order, and cursor pagination stays single-column: `WHERE id < ? ORDER BY id DESC LIMIT ?`.

### UUIDv7 generation

Hand-rolled in `chat/uuidv7.ts` — roughly 15 lines, no dependency. `expo-crypto`'s `randomUUID` produces v4: neither sortable nor deterministic, so it cannot be used here.

Layout: 48 bits of millisecond timestamp, version nibble `7`, 12 bits `rand_a`, variant bits `10`, 62 bits `rand_b`. All random bits come from the seeded PRNG, so the corpus is byte-identical on every reseed.

**Ordering invariant:** generated timestamps must be strictly increasing (minimum delta 1ms). Within a single millisecond, the random bits could otherwise invert lexicographic order and break cursor pagination. The generator enforces the delta; a unit test asserts monotonicity across the full corpus.

### Corpus generation

100,000 messages from `mulberry32(SEED)`, spread across roughly three years of synthetic timestamps with irregular gaps so day separators appear naturally.

Composition, chosen to defeat height estimation:

- 72% text, 18% image, 10% video.
- Text length buckets: 1–3 words (25%), 4–15 (40%), 16–60 (25%), 60–200 (10%). Bubble heights therefore range from one line to more than a screen.
- Authorship: about 40% from `me`, the rest split across three other participants.
- **Half of all image rows store `NULL` in `media_w` / `media_h`.** Those rows cannot be laid out until the image loads, so every engine faces a genuine post-load height change rather than an unknown-but-stable height.

Media sources:

- Images and video posters: `https://picsum.photos/seed/{id}/{w}/{h}`, seeded by message id so a given message always resolves to the same picture.
- Videos: the ten public `commondatastorage.googleapis.com/gtv-videos-bucket/sample/*.mp4` samples (roughly 15 seconds, a few MB each), assigned round-robin.

Seeding runs on first launch behind `SeedingScreen`, which reports percentage progress. Inserts use one prepared statement inside transactions of 5,000 rows, with `PRAGMA journal_mode = WAL`. A `seed_version` row in `meta` guards re-entry; bumping the constant or pressing **Reseed** in the debug sheet drops and rebuilds the table.

The database file lives in `cacheDirectory`, so it survives the app lifecycle and app restarts but not a cache clear — which satisfies "persisted across app lifecycle, need not survive reboots" while keeping the corpus identical across profiling runs.

### Query surface (`chat/db.ts`)

All cursor-based; no `OFFSET` in the hot path.

- `getPageBefore(id, n)` — `WHERE id < ? ORDER BY id DESC LIMIT n`, reversed to ascending before returning.
- `getPageAfter(id, n)` — `WHERE id > ? ORDER BY id ASC LIMIT n`.
- `getFirstPage(n)`, `getLatestPage(n)`.
- `getAround(id, n)` — two queries (half before, half after), concatenated in JS.
- `getMiddleId()` — `SELECT id FROM messages ORDER BY id LIMIT 1 OFFSET (count / 2)`. The one `OFFSET` query, run only on a middle jump.
- `getBounds()` — `{ minId, maxId, count }`.
- `insertOutgoing(body)` — appends a message from `me` with a fresh UUIDv7.

Every call passes through `withLatency()`, a configurable delay defaulting to 250ms, to keep pagination genuinely asynchronous. Adjustable live from the debug sheet.

## Window model (`chat/useChatWindow.ts`)

Owns the loaded slice; created per ChatScreen mount, so navigating back and in again is a clean start. The corpus is global, the window is not.

State: `items` (always ascending, oldest → newest), `hasOlder`, `hasNewer`, `loadingOlder`, `loadingNewer`, `generation`.

Actions: `loadOlder()`, `loadNewer()`, `jumpTo('start' | 'middle' | 'latest')`, `sendMessage(body)`.

Defaults, all adjustable live: page size 40, trim cap 300, latency 250ms, grow-only.

**Trimming.** Off by default (grow-only: the window only ever extends). When enabled, a load first appends its page, then — only if `items.length` now exceeds the cap — drops whole pages from the opposite end until it is back at or under the cap, and sets the corresponding `hasOlder` / `hasNewer` back to true. This is the harsher regime — every load both adds and removes, so scroll anchoring is under constant pressure — and the toggle exists so the same list can be watched under both without a rebuild.

**Jump modes.** Each jump replaces the window and bumps `generation`:

- `start` — first page ascending; `hasOlder` false, `hasNewer` true; target index 0.
- `middle` — `getAround(getMiddleId())`; both directions live. This is the double-ended test.
- `latest` — last page; `hasNewer` false; target is the last index.

**Jump execution** has two modes, toggleable, and this is where engines are expected to diverge most:

- **Remount** (default) — `generation` is used as the list's `key`, so the engine remounts and honours `initialScrollIndex`. Every engine supports this, and it is deterministic.
- **Imperative** — the list stays mounted, `items` is replaced wholesale, and `scrollToIndex` is called. No safety net; exposes how each engine copes with a full data replacement plus a scroll in one commit.

## Engines

One contract, deliberately minimal — it covers only what the screen genuinely needs, and nothing about how a list should be configured.

```ts
type ChatListProps = {
  items: Message[];                 // always ascending, oldest → newest
  renderItem: (m: Message, i: number) => ReactElement;
  onOlderNeeded(): void;
  onNewerNeeded(): void;
  loadingOlder: boolean;
  loadingNewer: boolean;
  initialScrollIndex?: number;      // in ascending-index space
  inverted?: boolean;
};

type ChatListHandle = {
  scrollToIndex(index: number, position?: 'top' | 'center' | 'bottom'): void;
  scrollToBottom(): void;
};
```

Inverted engines reverse `items` themselves and translate indices in both directions. The store never learns that inversion exists.

Per engine:

- **FlatList** — inverted variant maps `onEndReached` to older and `onStartReached` to newer; the normal variant maps them the other way and adds `maintainVisibleContentPosition={{ minIndexForVisible: 1 }}`.
- **FlashList v1** — `estimatedItemSize` set to a deliberately rough average; heights vary by design and the mismatch is part of what is being observed. No `onStartReached`, so the second pagination direction is an `onScroll` offset-threshold shim. No MVCP, so non-inverted prepends will visibly jump. Both limitations are stated in the variant's on-screen note rather than worked around.
- **FlashList v2** — native `onStartReached` / `onEndReached`, MVCP built in, no size estimate.
- **Legend List v2 / v3** — no inversion; normal orientation with `alignItemsAtEnd`, `maintainScrollAtEnd`, MVCP, and `initialScrollIndex`. `estimatedItemSize` is deliberately omitted so their own measurement path is exercised. `recycleItems` is exposed as a debug toggle.

## UI

`MessageRow` is shared and memoized. Bubble aligned left or right, avatar and display name for other participants, timestamp. **The day separator renders inside the row** when the previous message crosses a day boundary — never as a separate list item — so item count equals message count on every engine and the comparison stays like-for-like.

Image bubble: `expo-image`, with aspect ratio applied when `media_w` / `media_h` are known. When they are `NULL`, the row starts at a small placeholder and grows to real height on `onLoad`.

Video bubble: poster plus play badge. Tapping mounts a single shared `expo-video` player into that row; tapping another video moves the same player. Only one player exists at a time — video is tap-to-play, never autoplayed.

`ChatScreen` chrome: header with variant title and version, jump control (Start / Middle / Latest), and a composer that inserts through `insertOutgoing` and appends to the window.

Debug sheet: trim on/off and cap, page size, artificial latency, jump mode (remount vs imperative), `recycleItems` for the Legend variants, and Reseed. Built from the rn-reusables components and NativeWind already in the repo.

## Packaging

Aliases in `package.json` — yarn 4 resolves `npm:` protocol aliases directly:

```json
"@shopify/flash-list": "2.3.2",
"flash-list-v1": "npm:@shopify/flash-list@1.8.3",
"@legendapp/list": "3.3.6",
"legend-list-v2": "npm:@legendapp/list@2.0.19",
"expo-sqlite": "~57.0.1",
"expo-video": "~57.0.2"
```

`expo-image` is already a dependency. Legend List is pure JS in both majors, so that alias carries no native risk at all.

Native work required: `expo-sqlite`, `expo-video`, and FlashList v1 all add native code, so both platforms need a prebuild pass. Only `ios/` exists today; `android/` must be generated.

`app.json` has `experiments.reactCompiler: true`. It stays on — it affects all eight variants identically, and turning it off would make the demo less representative of a current app.

Per `AGENTS.md`, the versioned Expo documentation at `https://docs.expo.dev/versions/v57.0.0/` must be consulted before writing code against `expo-sqlite`, `expo-video`, or `expo-image` — the APIs have changed and memory is not a valid source.

## Risks

**FlashList v1 may not build against RN 0.86.** 1.8.3 was published 2025-06-17, roughly a year before this React Native version, and it carries Fabric native code. The first implementation task is a build probe: install the alias and build iOS before any feature work. Decision rule, in order: patch the incompatibility with a yarn patch if it is small and mechanical; otherwise drop the two v1 variants, leave a note in the home menu explaining why, and continue with the remaining six. The rest of the design is unaffected either way.

**Autolinking with an aliased native package.** The `flash-list-v1` directory contains a `package.json` whose `name` is `@shopify/flash-list`, which could confuse Expo autolinking's resolution. Since FlashList v2 ships no podspec, only one podspec exists in the tree, so this should resolve cleanly — but it is verified in the same build probe.

**Seed cost.** 100,000 inserts is a one-time cost of a few seconds on device, hidden behind the progress screen and paid once per seed version.

**`picsum.photos` rate limiting** under fast scrolling could produce failed image loads. If it becomes disruptive, switch to a small pool of fixed image URLs reused across messages — visual repetition is acceptable for this purpose, and the layout behaviour under unknown dimensions is unchanged.

## Verification

The data layer gets unit tests, because a silent bug in cursor or trim arithmetic would corrupt every comparison without looking wrong on screen. `jest-expo` is added for this; the tests cover UUIDv7 monotonicity across the corpus, cursor page boundaries (no gaps, no duplicates, in either direction), `getAround` symmetry, and the trim reducer's window arithmetic under both regimes.

Nothing else is unit tested. The UI is verified by running the app: each of the eight variants is opened, scrolled in both directions past several page loads, jumped to start and middle and back to latest under both jump modes, and exercised with trimming on and off. TypeScript and ESLint diagnostics are checked through MCP diagnostics rather than a CLI run, per the repository's instructions.
