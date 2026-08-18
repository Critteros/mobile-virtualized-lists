import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';

/** How many correction passes the opening scroll gets before the user takes over. */
const PIN_ATTEMPTS = 8;
const PIN_INTERVAL_MS = 80;

/** Where the opening target should sit in the viewport. */
function pinPosition(index: number, length: number): number {
  if (index <= 0) return 0;
  return index >= length - 1 ? 1 : 0.5;
}

const POSITION: Record<'bottom' | 'center' | 'top', number> = {
  bottom: 1,
  center: 0.5,
  top: 0,
};

export function FlatListChat({
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
  const listRef = useRef<FlatList<Message>>(null);

  // Inverted lists render newest first; the store never learns about that.
  const data = useMemo(() => (inverted ? [...items].reverse() : items), [inverted, items]);
  const toListIndex = (ascendingIndex: number) =>
    inverted ? items.length - 1 - ascendingIndex : ascendingIndex;

  // An empty window maps every ascending index to -1 when inverted, and a jump
  // can hand over an index from a window that has already been replaced. Either
  // one makes VirtualizedList throw, so the mapped index is clamped here.
  const safeInitialIndex =
    initialScrollIndex === undefined || items.length === 0
      ? undefined
      : Math.min(Math.max(toListIndex(initialScrollIndex), 0), items.length - 1);

  // `initialScrollIndex` aligns the target at the TOP of the viewport and takes
  // no viewPosition. An inverted list is flipped, so top-aligned IS the visual
  // bottom and the prop does the right thing. A normal list gets no such help:
  // pointing it at the newest message renders a window that STARTS there and
  // extends forward, so the one item sits at the top with empty space below and
  // nothing above it to scroll against. A normal list therefore renders from the
  // start of the window and positions itself once, on the first content layout.
  // Rows are variable height and measure asynchronously, so content keeps
  // growing for several frames after the first layout. A one-shot scroll lands
  // short. Instead the list re-pins on every content-size change until the user
  // takes over, which the first drag reports.
  // maintainVisibleContentPosition anchors on a visible row and shifts the
  // offset whenever content is inserted above it. During the first frames that
  // is exactly what happens as rows 0..n-1 render in, so it cancels the opening
  // scroll. MVCP is therefore withheld until the list has finished settling on
  // its opening position — after that it does its real job of holding the
  // viewport still when an older page is prepended.
  const [pinned, setPinned] = useState(inverted);
  const userHasScrolled = useRef(false);
  const onScrollBeginDrag = useCallback(() => {
    userHasScrolled.current = true;
    setPinned(true);
  }, []);

  // Content-size events stop firing before the list has converged: each scroll
  // measures a few more rows, which changes the true end, but FlatList has no
  // reason to emit another event. A short bounded retry loop keeps correcting
  // until the measurements settle, then hands control to the user.
  useEffect(() => {
    if (pinned || inverted || safeInitialIndex === undefined || items.length === 0) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (userHasScrolled.current || attempts > PIN_ATTEMPTS) {
        clearInterval(timer);
        setPinned(true);
        return;
      }
      listRef.current?.scrollToIndex({
        index: safeInitialIndex,
        animated: false,
        viewPosition: pinPosition(safeInitialIndex, items.length),
      });
    }, PIN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [inverted, items.length, pinned, safeInitialIndex]);

  const onContentSizeChange = useCallback(() => {
    if (userHasScrolled.current) return;
    // Keep re-pinning while rows are still measuring; `pinned` ends the window.
    if (inverted || safeInitialIndex === undefined || items.length === 0) return;
    // scrollToEnd is NOT usable here: with most rows unmeasured, FlatList's
    // estimated content height is wrong, so it scrolls to the wrong offset and
    // then stops rendering, never converging on the true end. scrollToIndex
    // forces it to render toward the target and retry until the row is measured.
    listRef.current?.scrollToIndex({
      index: safeInitialIndex,
      animated: false,
      viewPosition: pinPosition(safeInitialIndex, items.length),
    });
  }, [inverted, items.length, pinned, safeInitialIndex]);

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
    // toListIndex is derived from items.length and inverted.
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
    <FlatList
      ref={listRef}
      data={data}
      inverted={inverted}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) =>
        renderItem(item, inverted ? items.length - 1 - index : index)
      }
      initialScrollIndex={inverted ? safeInitialIndex : undefined}
      onContentSizeChange={onContentSizeChange}
      onScrollBeginDrag={onScrollBeginDrag}
      // In an inverted list the visual top is the end of the data, so the
      // edges swap: end = older, start = newer.
      // Pagination is held until the opening scroll has settled. Otherwise a
      // page loads mid-pin, prepending shifts every index, and the target index
      // — captured against the old window — now points somewhere else entirely.
      onEndReached={pinned ? (inverted ? onOlderNeeded : onNewerNeeded) : undefined}
      onStartReached={pinned ? (inverted ? onNewerNeeded : onOlderNeeded) : undefined}
      onEndReachedThreshold={0.5}
      onStartReachedThreshold={0.5}
      ListHeaderComponent={<Spinner visible={inverted ? loadingNewer : loadingOlder} />}
      ListFooterComponent={<Spinner visible={inverted ? loadingOlder : loadingNewer} />}
      // Non-inverted lists need an anchor so prepending older pages does not
      // shove the viewport down.
      maintainVisibleContentPosition={
        inverted || !pinned ? undefined : { minIndexForVisible: 1 }
      }
      onScrollToIndexFailed={({ index }) => {
        // The retry MUST carry viewPosition too — without it the target snaps
        // back to the top of the viewport, undoing the opening position.
        setTimeout(
          () =>
            listRef.current?.scrollToIndex({
              index,
              animated: false,
              viewPosition: pinPosition(index, items.length),
            }),
          50,
        );
      }}
    />
  );
}
