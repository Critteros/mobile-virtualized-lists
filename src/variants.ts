export type EngineKey = 'flashlist-v2' | 'flatlist' | 'legend-v2' | 'legend-v3';

export type VariantKey =
  | 'flashlist-v2-inverted'
  | 'flashlist-v2-normal'
  | 'flatlist-inverted'
  | 'flatlist-normal'
  | 'legend-v2-inverted'
  | 'legend-v2-normal'
  | 'legend-v3-inverted'
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
    key: 'legend-v2-inverted',
    engine: 'legend-v2',
    group: 'Legend List v2 (2.0.19)',
    inverted: true,
    note: 'Manual inversion: scaleY(-1) on the list and on every row.',
    title: 'Inverted (scaleY -1)',
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
    key: 'legend-v3-inverted',
    engine: 'legend-v3',
    group: 'Legend List v3 (3.3.6)',
    inverted: true,
    note: 'Manual inversion: scaleY(-1) on the list and on every row.',
    title: 'Inverted (scaleY -1)',
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
