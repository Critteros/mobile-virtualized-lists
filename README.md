# Mobile virtualized lists — chat comparison

This app compares virtualized list libraries on the hardest screen React Native
has: a chat log. One corpus, one row component, one pagination model. Only the
list engine changes between variants, so what you see is the engine.

## What it tests

A chat list must do four things at once, and each one breaks a different list:

- **Open in the middle.** A jump to an old message must land on that message, not
  near it.
- **Paginate at both ends.** Older messages prepend, newer messages append.
  A prepend must not move the content under your finger.
- **Absorb rows that change height.** Half the image rows carry no dimensions, so
  they grow after the picture loads.
- **Stay anchored at the newest message** while you sit at the live tail.

The corpus is 100,000 generated messages in SQLite: text of four length classes,
images, videos, day separators, and bursty timestamps. A seeded generator builds
it, so every engine sees the same data in the same order. Database reads run
through an adjustable delay, because a real chat waits on a network.

## Variants

| Engine                  | Variants                                                  |
| ----------------------- | --------------------------------------------------------- |
| FlatList (RN 0.86.2)    | Inverted · Normal + MVCP                                  |
| FlashList v2 (2.3.2)    | Inverted · Normal + MVCP                                  |
| Legend List v2 (2.0.19) | Inverted (scaleY -1) · alignItemsAtEnd                    |
| Legend List v3 (3.3.6)  | getFixedItemSize · Inverted (scaleY -1) · alignItemsAtEnd |

Legend List has no `inverted` prop, so it appears twice: once with its own
bottom anchoring (`alignItemsAtEnd`), once with the classic manual inversion
(`scaleY(-1)` on the list and back on every row).

The `getFixedItemSize` variant declares row heights instead of measuring them.
The estimator in `src/chat/item-size.ts` derives a height per item type. Its
constants are fitted to real `onLayout` heights, so it is accurate to about half
a point per row, except for the images whose dimensions the corpus hides.

## Debug settings

The **Debug** button in the chat header opens the runtime settings:

- **Page size** — how many messages each pagination step adds. Presets or any
  value from 1 to 1000.
- **Latency** — the artificial delay on every database read.
- **Image placeholders** — off makes every image ignore its known size and grow
  on load, which puts all image rows on the shifting path.
- **recycleItems** — Legend List view recycling.
- **Reseed corpus** — rebuild the database.

The window grows without a cap. A jump discards the whole loaded array and
starts again from the target message.

## Run it

Node 24 and Yarn 4 are required. `mise.toml` pins Node, and `package.json` pins
Yarn through `packageManager`, so `corepack` picks the right version by itself.
The install uses the `node-modules` linker, not Plug'n'Play.

```bash
node -v       # v24.x
yarn install
yarn ios      # or: yarn android
```

The app needs a development build, not Expo Go, because it uses native modules.

```bash
yarn test           # pagination, generator, and estimator unit tests
yarn format:check   # prettier
```

## Layout

| Path              | Holds                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `src/engines/`    | One component per list library. All satisfy `ChatListProps`.       |
| `src/chat/`       | Corpus generator, SQLite access, pagination window, row component. |
| `src/screens/`    | Variant menu, chat screen, debug sheet, seeding screen.            |
| `src/variants.ts` | The variant list the menu is built from.                           |

An engine receives ascending data, a `renderItem`, both edge callbacks and an
opening index. It decides everything else itself. The differences between the
libraries are the point, so nothing normalizes them away.
