import type { Message } from './types.ts';

export type ItemType =
  'image' | 'image-unsized' | 'text-long' | 'text-medium' | 'text-short' | 'text-xlong' | 'video';

/** Word-count ceilings, mirroring the buckets the corpus generator draws from. */
const SHORT = 3;
const MEDIUM = 15;
const LONG = 60;

/**
 * Recycling pool a row belongs to. Rows of one type render the same shape and
 * a similar height, so a recycled view rarely has to change layout.
 */
export function messageItemType(message: Message): ItemType {
  if (message.kind === 'video') return 'video';
  if (message.kind === 'image') {
    return message.mediaW === null || message.mediaH === null ? 'image-unsized' : 'image';
  }

  const words = message.body ? message.body.trim().split(/\s+/).length : 0;
  if (words <= SHORT) return 'text-short';
  if (words <= MEDIUM) return 'text-medium';
  if (words <= LONG) return 'text-long';
  return 'text-xlong';
}
