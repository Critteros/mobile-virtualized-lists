import { isDayBoundary } from './day-boundary.ts';
import type { Message } from './types.ts';

/**
 * Row heights derived from the item type instead of measured, for the variant
 * that feeds Legend List `getFixedItemSize`. Every constant here mirrors a
 * class in MessageRow, so the two have to be changed together.
 *
 * The numbers come from onLayout heights of 120 rows on an iPhone 17 Pro
 * (iOS 26.4). Against that sample the estimate is within half a point on
 * average, and never more than one text line out.
 */

/** Media bubbles are a fixed width, so their height follows the aspect ratio. */
const MEDIA_WIDTH = 240;
/** Mean measured ratio of the image rows whose dimensions the corpus hides. */
const UNSIZED_RATIO = 0.85;
const VIDEO_RATIO = 16 / 9;

const SCREEN_PADDING = 24;
const BUBBLE_MAX_FRACTION = 0.8;
const BUBBLE_TEXT_PADDING = 24;
/** Measured average glyph width at font size 16, fitted over the sample. */
const CHAR_WIDTH = 6.8;

const ROW_PADDING = 8;
const DAY_SEPARATOR = 42;
const AUTHOR_LINE = 15.67;
const TEXT_LINE = 21;
const TEXT_BUBBLE_PADDING = 16;
const MEDIA_BUBBLE_PADDING = 8;
const TIMESTAMP = 12.67;
const MEDIA_TIMESTAMP = 17;

function textHeight(body: string, viewportWidth: number): number {
  const bubbleWidth = (viewportWidth - SCREEN_PADDING) * BUBBLE_MAX_FRACTION;
  const perLine = Math.max(1, Math.floor((bubbleWidth - BUBBLE_TEXT_PADDING) / CHAR_WIDTH));
  const lines = Math.max(1, Math.ceil(body.length / perLine));
  return TEXT_BUBBLE_PADDING + lines * TEXT_LINE + TIMESTAMP;
}

function mediaHeight(message: Message): number {
  const ratio =
    message.kind === 'video'
      ? VIDEO_RATIO
      : message.mediaW !== null && message.mediaH !== null
        ? message.mediaW / message.mediaH
        : UNSIZED_RATIO;
  return MEDIA_BUBBLE_PADDING + MEDIA_WIDTH / ratio + MEDIA_TIMESTAMP;
}

/**
 * `previous` is the message one older in the window, which decides whether the
 * row also carries a day separator.
 */
export function estimateRowHeight(
  message: Message,
  previous: Message | null,
  viewportWidth: number,
): number {
  const chrome =
    ROW_PADDING +
    (isDayBoundary(message, previous) ? DAY_SEPARATOR : 0) +
    (message.author === 0 ? 0 : AUTHOR_LINE);

  return (
    chrome +
    (message.kind === 'text' ? textHeight(message.body ?? '', viewportWidth) : mediaHeight(message))
  );
}
