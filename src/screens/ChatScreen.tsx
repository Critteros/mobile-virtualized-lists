import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StaticScreenProps } from '@react-navigation/native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { MessageRow } from '@/chat/MessageRow';
import { useSettings } from '@/chat/settings';
import type { ChatListHandle, ChatListProps, Message } from '@/chat/types';
import { useChatWindow } from '@/chat/useChatWindow';
import { useDb } from '@/chat/DbProvider';
import { VideoProvider } from '@/chat/VideoProvider';
import { FlashV1Chat } from '@/engines/FlashV1Chat';
import { FlashV2Chat } from '@/engines/FlashV2Chat';
import { FlatListChat } from '@/engines/FlatListChat';
import { LegendV2Chat } from '@/engines/LegendV2Chat';
import { LegendV3Chat } from '@/engines/LegendV3Chat';
import { getVariant, type EngineKey, type VariantKey } from '@/variants';
import { DebugSheet } from './DebugSheet';

export type ChatScreenProps = StaticScreenProps<{ variant: VariantKey }>;

const ENGINES: Partial<Record<EngineKey, (props: ChatListProps) => ReactElement>> = {
  flatlist: FlatListChat,
  'flashlist-v1': FlashV1Chat,
  'flashlist-v2': FlashV2Chat,
  'legend-v2': LegendV2Chat,
  'legend-v3': LegendV3Chat,
};

function ChatScreenBody({ route }: ChatScreenProps) {
  const variant = getVariant(route.params.variant);
  const { db } = useDb();
  const { state, loadOlder, loadNewer, jumpTo, sendMessage, targetIndex } = useChatWindow(db);
  const { settings } = useSettings();
  const listRef = useRef<ChatListHandle>(null);
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState('');

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

  // Remount mode: keying on generation forces the engine to rebuild and honour
  // initialScrollIndex. Imperative mode: the list stays mounted, the data is
  // swapped wholesale, and we ask it to scroll — no safety net, which is the
  // point.
  useEffect(() => {
    if (settings.jumpMode !== 'imperative') return;
    if (state.items.length === 0) return;
    listRef.current?.scrollToIndex(targetIndex, 'center');
  }, [settings.jumpMode, state.generation, state.items.length, targetIndex]);

  const submit = () => {
    sendMessage(draft);
    setDraft('');
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
        <View className="flex-1">
          <Text variant="small">
            {variant.group} — {variant.title}
          </Text>
          {variant.note ? <Text variant="muted" className="text-xs">{variant.note}</Text> : null}
        </View>
        <Button size="sm" variant="ghost" onPress={() => setSheetOpen(true)}>
          <Text>Debug</Text>
        </Button>
      </View>

      <View className="flex-row gap-2 border-b border-border px-3 py-2">
        {(['start', 'middle', 'latest'] as const).map((target) => (
          <Button key={target} size="sm" variant="secondary" onPress={() => jumpTo(target)}>
            <Text>{target === 'start' ? 'Channel start' : target === 'middle' ? 'Middle' : 'Latest'}</Text>
          </Button>
        ))}
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
          key={settings.jumpMode === 'remount' ? state.generation : 'stable'}
          ref={listRef}
          items={state.items}
          renderItem={renderItem}
          onOlderNeeded={loadOlder}
          onNewerNeeded={loadNewer}
          loadingOlder={state.loadingOlder}
          loadingNewer={state.loadingNewer}
          initialScrollIndex={settings.jumpMode === 'remount' ? targetIndex : undefined}
          inverted={variant.inverted}
        />
      )}

      <View className="flex-row items-center gap-2 border-t border-border px-3 py-2">
        <Input
          className="flex-1"
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          onSubmitEditing={submit}
        />
        <Button size="sm" onPress={submit}>
          <Text>Send</Text>
        </Button>
      </View>

      <DebugSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}

export default function ChatScreen(props: ChatScreenProps) {
  return (
    <VideoProvider>
      <ChatScreenBody {...props} />
    </VideoProvider>
  );
}
