import { View } from 'react-native';
import type { StaticScreenProps } from '@react-navigation/native';

import { Text } from '@/components/ui/text';
import type { VariantKey } from '@/variants';

export type ChatScreenProps = StaticScreenProps<{ variant: VariantKey }>;

export default function ChatScreen({ route }: ChatScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text>{route.params.variant}</Text>
    </View>
  );
}
