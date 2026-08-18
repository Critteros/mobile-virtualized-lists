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
