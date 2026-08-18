import { type ReactNode } from 'react';
import { Modal, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useDb } from '@/chat/DbProvider';
import { useSettings } from '@/chat/settings';

const PAGE_SIZES = [20, 40, 80];
const TRIM_CAPS: (number | null)[] = [null, 200, 300, 500];
const LATENCIES = [0, 100, 250, 800];

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
          onPress={() => onSelect(option)}>
          <Text>{render(option)}</Text>
        </Button>
      ))}
    </>
  );
}

export function DebugSheet({ onClose, visible }: { onClose: () => void; visible: boolean }) {
  const { settings, update } = useSettings();
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
          </Row>

          <Row label="Trim cap">
            <Choice
              options={TRIM_CAPS}
              value={settings.trimCap}
              render={(n) => (n === null ? 'Grow only' : String(n))}
              onSelect={(trimCap) => update({ trimCap })}
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

          <Row label="Jump mode">
            <Choice
              options={['remount', 'imperative'] as const}
              value={settings.jumpMode}
              render={(m) => m}
              onSelect={(jumpMode) => update({ jumpMode })}
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
