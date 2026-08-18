import { useCallback, useRef, type ReactElement } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StaticScreenProps } from '@react-navigation/native';

import { Text } from '@/components/ui/text';
import { MessageRow } from '@/chat/MessageRow';
import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';
import { useChatWindow } from '@/chat/useChatWindow';
import { useDb } from '@/chat/DbProvider';
import { FlatListChat } from '@/engines/FlatListChat';
import { getVariant, type EngineKey, type VariantKey } from '@/variants';

export type ChatScreenProps = StaticScreenProps<{ variant: VariantKey }>;

const ENGINES: Partial<Record<EngineKey, (props: ChatListProps) => ReactElement>> = {
  flatlist: FlatListChat,
};

export default function ChatScreen({ route }: ChatScreenProps) {
  const variant = getVariant(route.params.variant);
  const { db } = useDb();
  const { state, loadOlder, loadNewer, targetIndex } = useChatWindow(db);
  const listRef = useRef<ChatListHandle>(null);
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    (message: Message, index: number) => (
      <MessageRow message={message} previous={index > 0 ? state.items[index - 1] : null} />
    ),
    [state.items],
  );

  const Engine = ENGINES[variant.engine];
  // Every engine applies initialScrollIndex at mount only, but the first window
  // arrives asynchronously. Mounting before it lands would open the list at the
  // top of an empty list and never correct itself, so the engine waits.
  const windowReady = state.items.length > 0;

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <View className="border-b border-border px-4 py-2">
        <Text variant="small">
          {variant.group} — {variant.title}
        </Text>
        {variant.note ? <Text variant="muted" className="text-xs">{variant.note}</Text> : null}
      </View>

      {!Engine ? (
        <View className="flex-1 items-center justify-center">
          <Text variant="muted">Engine not implemented yet</Text>
        </View>
      ) : !windowReady ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <Engine
          ref={listRef}
          items={state.items}
          renderItem={renderItem}
          onOlderNeeded={loadOlder}
          onNewerNeeded={loadNewer}
          loadingOlder={state.loadingOlder}
          loadingNewer={state.loadingNewer}
          initialScrollIndex={targetIndex}
          inverted={variant.inverted}
        />
      )}
    </View>
  );
}
