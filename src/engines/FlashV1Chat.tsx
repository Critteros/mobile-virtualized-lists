import { useImperativeHandle, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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
