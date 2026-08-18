import { useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LegendList, type LegendListRef } from '@legendapp/list/react-native';

import { useSettings } from '@/chat/settings';
import type { ChatListHandle, ChatListProps } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;

export function LegendV3Chat({
  items,
  renderItem,
  onOlderNeeded,
  onNewerNeeded,
  loadingOlder,
  loadingNewer,
  initialScrollIndex,
  ref,
}: ChatListProps) {
  const listRef = useRef<LegendListRef>(null);
  const { settings } = useSettings();

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => void listRef.current?.scrollToEnd({ animated: false }),
      scrollToIndex: (index, position = 'center') =>
        void listRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: POSITION[position],
        }),
    }),
    [],
  );

  return (
    <LegendList
      ref={listRef}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => renderItem(item, index)}
      initialScrollIndex={initialScrollIndex}
      // Legend List has no `inverted` prop in either major. Bottom anchoring
      // is these two props instead.
      alignItemsAtEnd
      maintainScrollAtEnd
      maintainVisibleContentPosition
      recycleItems={settings.recycleItems}
      // No estimatedItemSize on purpose: its own measurement path is what we
      // want to observe.
      onStartReached={onOlderNeeded}
      onEndReached={onNewerNeeded}
      onStartReachedThreshold={0.5}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        loadingOlder ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
      ListFooterComponent={
        loadingNewer ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
    />
  );
}
