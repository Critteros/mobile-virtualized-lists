import { Platform } from 'react-native';
import * as RadioGroupPrimitive from '@rn-primitives/radio-group';

import { cn } from '@/lib/utils';

export type RadioGroupProps = React.ComponentProps<typeof RadioGroupPrimitive.Root>;
export type RadioGroupItemProps = React.ComponentProps<typeof RadioGroupPrimitive.Item>;

export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive.Root className={cn('gap-3', className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'aspect-square size-4 shrink-0 items-center justify-center rounded-full border border-input shadow-sm shadow-black/5 dark:bg-input/30',
        Platform.select({
          web: 'transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        }),
        props.disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-primary" />
    </RadioGroupPrimitive.Item>
  );
}
