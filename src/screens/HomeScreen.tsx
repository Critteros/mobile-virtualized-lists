import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VARIANTS, type Variant } from '@/variants';

export default function HomeScreen() {
  const navigation = useNavigation();

  const groups = VARIANTS.reduce<Record<string, Variant[]>>((acc, variant) => {
    (acc[variant.group] ??= []).push(variant);
    return acc;
  }, {});

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <Text variant="muted">
        100,000 messages, variable heights, image and video attachments, double-ended pagination.
      </Text>
      {Object.entries(groups).map(([group, variants]) => (
        <View key={group} className="gap-2">
          <Text variant="large">{group}</Text>
          {variants.map((variant) => (
            <Button
              key={variant.key}
              variant="outline"
              className="h-auto items-start py-3"
              onPress={() => navigation.navigate('Chat', { variant: variant.key })}>
              <View className="gap-1">
                <Text>{variant.title}</Text>
                {variant.note ? <Text variant="muted">{variant.note}</Text> : null}
              </View>
            </Button>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
