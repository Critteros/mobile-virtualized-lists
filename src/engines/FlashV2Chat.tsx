import { useImperativeHandle, useMemo, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';

import { messageItemType } from '@/chat/item-type';
import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;

export function FlashV2Chat({
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
  const listRef = useRef<FlashListRef<Message>>(null);
  const data = useMemo(() => (inverted ? [...items].reverse() : items), [inverted, items]);
  const toListIndex = (ascendingIndex: number) =>
    inverted ? items.length - 1 - ascendingIndex : ascendingIndex;

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => {
        if (inverted) listRef.current?.scrollToTop({ animated: false });
        else listRef.current?.scrollToEnd({ animated: false });
      },
      scrollToIndex: (index, position = 'center') => {
        void listRef.current?.scrollToIndex({
          index: toListIndex(index),
          animated: false,
          viewPosition: POSITION[position],
        });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inverted, items.length],
  );

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
      keyExtractor={(item) => item.id}
      getItemType={messageItemType}
      renderItem={({ item, index }) =>
        renderItem(item, inverted ? items.length - 1 - index : index)
      }
      initialScrollIndex={
        initialScrollIndex === undefined ? undefined : toListIndex(initialScrollIndex)
      }
      onEndReached={inverted ? onOlderNeeded : onNewerNeeded}
      onStartReached={inverted ? onNewerNeeded : onOlderNeeded}
      onEndReachedThreshold={0.5}
      onStartReachedThreshold={0.5}
      ListHeaderComponent={<Spinner visible={inverted ? loadingNewer : loadingOlder} />}
      ListFooterComponent={<Spinner visible={inverted ? loadingOlder : loadingNewer} />}
      // v2 has MVCP enabled by default for both orientations; the
      // startRenderingFromBottom tweak only matters for the non-inverted
      // variant's initial render.
      maintainVisibleContentPosition={inverted ? {} : { startRenderingFromBottom: false }}
    />
  );
}
