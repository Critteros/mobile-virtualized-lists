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
