import { useState, type ReactNode } from 'react';
import { Modal, TextInput, useColorScheme, View } from 'react-native';

import { useDb } from '@/chat/DbProvider';
import { useSettings } from '@/chat/settings';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';

const PAGE_SIZES = [20, 40, 80];
const LATENCIES = [0, 100, 250, 800];
const INPUT_STYLE = {
  borderColor: 'rgba(120, 120, 128, 0.4)',
  borderRadius: 6,
  borderWidth: 1,
  height: 32,
  paddingHorizontal: 8,
  textAlign: 'center',
  width: 72,
} as const;

function Row({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text variant="small">{label}</Text>
      <View className="flex-row items-center gap-2">{children}</View>
    </View>
  );
}

function Choice<T>({
  onSelect,
  options,
  render,
  value,
}: {
  onSelect: (option: T) => void;
  options: T[];
  render: (option: T) => string;
  value: T;
}) {
  return (
    <>
      {options.map((option) => (
        <Button
          key={render(option)}
          size="sm"
          variant={option === value ? 'default' : 'outline'}
          onPress={() => onSelect(option)}
        >
          <Text>{render(option)}</Text>
        </Button>
      ))}
    </>
  );
}

function PageSizeInput({
  onCommit,
  value,
}: {
  onCommit: (pageSize: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const scheme = useColorScheme();

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) ? Math.min(1000, Math.max(1, parsed)) : value;
    setDraft(String(next));
    onCommit(next);
  };

  return (
    <TextInput
      style={[INPUT_STYLE, { color: scheme === 'dark' ? 'white' : 'black' }]}
      keyboardType="number-pad"
      returnKeyType="done"
      value={draft}
      onChangeText={setDraft}
      onBlur={commit}
      onSubmitEditing={commit}
    />
  );
}

export function DebugSheet({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  const settings = useSettings();
  const { update } = settings;
  const { reseedNow } = useDb();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="gap-1 rounded-t-2xl bg-background p-4">
          <Text variant="h4">Debug</Text>
          <Separator className="my-2" />

          <Row label="Page size">
            <Choice
              options={PAGE_SIZES}
              value={settings.pageSize}
              render={(n) => String(n)}
              onSelect={(pageSize) => update({ pageSize })}
            />
            <PageSizeInput
              key={settings.pageSize}
              value={settings.pageSize}
              onCommit={(pageSize) => update({ pageSize })}
            />
          </Row>

          <Row label="Latency (ms)">
            <Choice
              options={LATENCIES}
              value={settings.latencyMs}
              render={(n) => String(n)}
              onSelect={(latencyMs) => update({ latencyMs })}
            />
          </Row>

          <Row label="Image placeholders">
            <Switch
              checked={settings.imagePlaceholders}
              onCheckedChange={(imagePlaceholders) => update({ imagePlaceholders })}
            />
          </Row>

          <Row label="recycleItems (Legend)">
            <Switch
              checked={settings.recycleItems}
              onCheckedChange={(recycleItems) => update({ recycleItems })}
            />
          </Row>

          <Separator className="my-2" />
          <Button variant="destructive" onPress={reseedNow}>
            <Text>Reseed corpus</Text>
          </Button>
          <Button variant="ghost" onPress={onClose}>
            <Text>Close</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
