import { View } from 'react-native';

import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';

export default function SeedingScreen({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <Text variant="h4">Generating messages</Text>
      <Text variant="muted">
        {done.toLocaleString()} / {total.toLocaleString()}
      </Text>
      <Progress value={percent} className="w-full" />
    </View>
  );
}
