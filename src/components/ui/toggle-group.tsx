import { createContext, use } from 'react';
import { Platform } from 'react-native';
import * as ToggleGroupPrimitive from '@rn-primitives/toggle-group';
import type { VariantProps } from 'class-variance-authority';

import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants> | null>(null);

export type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>;
export type ToggleGroupItemProps = React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants> & {
    isFirst?: boolean;
    isLast?: boolean;
  };
export type ToggleGroupIconProps = React.ComponentProps<typeof Icon>;

export function ToggleGroup({ className, variant, size, children, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(
        'flex flex-row items-center rounded-md shadow-none',
        Platform.select({ web: 'w-fit' }),
        variant === 'outline' && 'shadow-sm shadow-black/5',
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function useToggleGroupContext() {
  const context = use(ToggleGroupContext);
  if (context === null) {
    throw new Error(
      'ToggleGroup compound components cannot be rendered outside the ToggleGroup component',
    );
  }
  return context;
}

export function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  isFirst,
  isLast,
  ...props
}: ToggleGroupItemProps) {
  const context = useToggleGroupContext();
  const { value } = ToggleGroupPrimitive.useRootContext();

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium text-foreground',
        ToggleGroupPrimitive.utils.getIsSelected(value, props.value)
          ? 'text-accent-foreground'
          : Platform.select({ web: 'group-hover:text-muted-foreground' }),
      )}
    >
      <ToggleGroupPrimitive.Item
        className={cn(
          toggleVariants({
            variant: context.variant || variant,
            size: context.size || size,
          }),
          props.disabled && 'opacity-50',
          ToggleGroupPrimitive.utils.getIsSelected(value, props.value) && 'bg-accent',
          'min-w-0 shrink-0 rounded-none shadow-none',
          isFirst && 'rounded-l-md',
          isLast && 'rounded-r-md',
          (context.variant === 'outline' || variant === 'outline') && 'border-l-0',
          (context.variant === 'outline' || variant === 'outline') && isFirst && 'border-l',
          Platform.select({
            web: 'flex-1 focus:z-10 focus-visible:z-10',
          }),
          className,
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Item>
    </TextClassContext.Provider>
  );
}

export function ToggleGroupIcon({ className, ...props }: ToggleGroupIconProps) {
  const textClass = use(TextClassContext);
  return <Icon className={cn('size-4 shrink-0', textClass, className)} {...props} />;
}
