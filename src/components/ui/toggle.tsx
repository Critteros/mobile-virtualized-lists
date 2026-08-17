import { use } from 'react';
import { Platform } from 'react-native';
import * as TogglePrimitive from '@rn-primitives/toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export const toggleVariants = cva(
  cn(
    'group flex flex-row items-center justify-center gap-2 rounded-md active:bg-muted',
    Platform.select({
      web: 'inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none',
    }),
  ),
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: cn(
          'border border-input bg-transparent shadow-sm shadow-black/5 active:bg-accent',
          Platform.select({
            web: 'hover:bg-accent hover:text-accent-foreground',
          }),
        ),
      },
      size: {
        default: 'h-10 min-w-10 px-2.5 sm:h-9 sm:min-w-9 sm:px-2',
        sm: 'h-9 min-w-9 px-2 sm:h-8 sm:min-w-8 sm:px-1.5',
        lg: 'h-11 min-w-11 px-3 sm:h-10 sm:min-w-10 sm:px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>;
export type ToggleIconProps = React.ComponentProps<typeof Icon>;

export function Toggle({ className, variant, size, ...props }: ToggleProps) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium text-foreground',
        props.pressed
          ? 'text-accent-foreground'
          : Platform.select({ web: 'group-hover:text-muted-foreground' }),
        className,
      )}
    >
      <TogglePrimitive.Root
        className={cn(
          toggleVariants({ variant, size }),
          props.disabled && 'opacity-50',
          props.pressed && 'bg-accent',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export function ToggleIcon({ className, ...props }: ToggleIconProps) {
  const textClass = use(TextClassContext);
  return <Icon className={cn('size-4 shrink-0', textClass, className)} {...props} />;
}
