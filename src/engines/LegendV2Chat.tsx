import { useImperativeHandle, useMemo, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LegendList, type LegendListRef } from 'legend-list-v2';

import { messageItemType } from '@/chat/item-type';
import { useSettings } from '@/chat/settings';
import type { ChatListHandle, ChatListProps } from '@/chat/types';

const POSITION = { bottom: 1, center: 0.5, top: 0 } as const;
/** The classic manual inversion: flip the list, flip every row back. */
const FLIP = { transform: [{ scaleY: -1 }] } as const;

export function LegendV2Chat({
  items,
  renderItem,
  onOlderNeeded,
  onNewerNeeded,
  loadingOlder,
  loadingNewer,
  hasNewer,
  initialScrollIndex,
  inverted = false,
  ref,
}: ChatListProps) {
  const listRef = useRef<LegendListRef>(null);
  const recycleItems = useSettings((s) => s.recycleItems);
  const data = useMemo(() => (inverted ? [...items].reverse() : items), [inverted, items]);
  const toListIndex = (ascendingIndex: number) =>
    inverted ? items.length - 1 - ascendingIndex : ascendingIndex;

  useImperativeHandle(
    ref,
    (): ChatListHandle => ({
      scrollToBottom: () => {
        if (inverted) listRef.current?.scrollToIndex({ index: 0, animated: false });
        else listRef.current?.scrollToEnd({ animated: false });
      },
      scrollToIndex: (index, position = 'center') =>
        listRef.current?.scrollToIndex({
          index: toListIndex(index),
          animated: false,
          // The viewport is flipped too, so a viewPosition means the opposite end.
          viewPosition: inverted ? 1 - POSITION[position] : POSITION[position],
        }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inverted, items.length],
  );

  const Spinner = ({ visible }: { visible: boolean }) =>
    visible ? (
      <View className="items-center py-4" style={inverted ? FLIP : undefined}>
        <ActivityIndicator />
      </View>
    ) : null;

  return (
    <LegendList
      ref={listRef}
      data={data}
      style={inverted ? FLIP : undefined}
      keyExtractor={(item) => item.id}
      getItemType={messageItemType}
      renderItem={({ item, index }) => {
        const row = renderItem(item, inverted ? items.length - 1 - index : index);
        return inverted ? <View style={FLIP}>{row}</View> : row;
      }}
      initialScrollIndex={
        initialScrollIndex === undefined ? undefined : toListIndex(initialScrollIndex)
      }
      // No `inverted` prop in v2 either. Without the scaleY trick, bottom
      // anchoring is these two props; a flipped list is already anchored at the
      // newest message, which sits at offset 0.
      alignItemsAtEnd={!inverted}
      // Sticking to the end is only wanted at the live tail. While older pages
      // still have newer ones after them, it would drag the viewport to the end
      // of every page that loads.
      maintainScrollAtEnd={!inverted && !hasNewer}
      maintainVisibleContentPosition
      recycleItems={recycleItems}
      // No estimatedItemSize on purpose.
      onStartReached={inverted ? onNewerNeeded : onOlderNeeded}
      onEndReached={inverted ? onOlderNeeded : onNewerNeeded}
      onStartReachedThreshold={0.5}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={<Spinner visible={inverted ? loadingNewer : loadingOlder} />}
      ListFooterComponent={<Spinner visible={inverted ? loadingOlder : loadingNewer} />}
    />
  );
}
