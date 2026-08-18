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
