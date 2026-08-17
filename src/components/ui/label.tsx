import { Platform } from 'react-native';
import * as LabelPrimitive from '@rn-primitives/label';

import { cn } from '@/lib/utils';

export type LabelProps = React.ComponentProps<typeof LabelPrimitive.Text>;

export function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'flex flex-row items-center gap-2 select-none',
        Platform.select({
          web: 'cursor-default leading-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        }),
        disabled && 'opacity-50',
      )}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <LabelPrimitive.Text
        className={cn(
          'text-sm font-medium text-foreground',
          Platform.select({ web: 'leading-none' }),
          className,
        )}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}
