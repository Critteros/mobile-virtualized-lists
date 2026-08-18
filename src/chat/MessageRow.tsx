import { memo, useState, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView } from 'expo-video';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

import { isDayBoundary } from './day-boundary';
import { useSettings } from './settings';
import type { Message } from './types';
import { useVideo } from './VideoProvider';

const AUTHOR_NAMES = ['Me', 'Ada', 'Grace', 'Alan'];
const BUBBLE_WIDTH = 240;
const PLACEHOLDER_COLOR = 'rgba(120, 120, 128, 0.16)';

function ImageBubble({ message }: { message: Message }) {
  // Half the image rows arrive with unknown dimensions. Those start at a
  // placeholder height and grow when the image reports its real size — the
  // post-load height change every engine has to absorb. Turning the setting
  // off puts every image on that path.
  const imagePlaceholders = useSettings((s) => s.imagePlaceholders);
  // Keyed by id: a recycled row would otherwise keep the previous image's
  // ratio until the new one loads.
  const [loaded, setLoaded] = useState<{ id: string; ratio: number } | null>(null);
  const loadedRatio = loaded?.id === message.id ? loaded.ratio : null;
  const knownRatio =
    message.mediaW !== null && message.mediaH !== null ? message.mediaW / message.mediaH : null;
  const ratio = imagePlaceholders ? (knownRatio ?? loadedRatio) : loadedRatio;

  return (
    <Image
      source={{ uri: message.mediaUrl! }}
      recyclingKey={message.id}
      contentFit="cover"
      transition={100}
      onLoad={(event) =>
        setLoaded({ id: message.id, ratio: event.source.width / event.source.height })
      }
      style={{
        width: BUBBLE_WIDTH,
        height: ratio === null ? 80 : BUBBLE_WIDTH / ratio,
        borderRadius: 12,
        backgroundColor: PLACEHOLDER_COLOR,
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
        style={{
          width: BUBBLE_WIDTH,
          height,
          borderRadius: 12,
          backgroundColor: PLACEHOLDER_COLOR,
        }}
      />
      <View className="absolute inset-0 items-center justify-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-black/60">
          <Text className="text-white">▶</Text>
        </View>
      </View>
    </Pressable>
  );
}

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
            'max-w-[80%] rounded-2xl',
            message.kind === 'text' ? 'px-3 py-2' : 'p-1',
            mine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm bg-muted',
          )}>
          {message.kind === 'text' ? (
            <Text className={cn(mine && 'text-primary-foreground')}>{message.body}</Text>
          ) : message.kind === 'image' ? (
            <ImageBubble message={message} />
          ) : (
            <VideoBubble message={message} />
          )}
          <Text
            variant="muted"
            className={cn(
              'mt-1 text-[10px]',
              mine && 'text-primary-foreground/70',
              message.kind !== 'text' && 'px-2 pb-1',
            )}>
            {formatTime(message.ts)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const MessageRow = memo(MessageRowImpl);
