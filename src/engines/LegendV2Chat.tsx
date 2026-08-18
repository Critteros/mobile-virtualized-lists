import { useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LegendList, type LegendListRef } from 'legend-list-v2';

import { useSettings } from '@/chat/settings';
import type { ChatListHandle, ChatListProps } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;

export function LegendV2Chat({
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
      scrollToBottom: () => listRef.current?.scrollToEnd({ animated: false }),
      scrollToIndex: (index, position = 'center') =>
        listRef.current?.scrollToIndex({
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
      // No `inverted` prop in v2 either. Bottom anchoring is these two props.
      alignItemsAtEnd
      maintainScrollAtEnd
      maintainVisibleContentPosition
      recycleItems={settings.recycleItems}
      // No estimatedItemSize on purpose.
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
