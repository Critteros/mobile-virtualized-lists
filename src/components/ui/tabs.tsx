import { Platform } from 'react-native';
import * as TabsPrimitive from '@rn-primitives/tabs';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;
export type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List>;
export type TabsTriggerProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;
export type TabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content>;

export function Tabs({ className, ...props }: TabsProps) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex h-9 flex-row items-center justify-center rounded-lg bg-muted p-[3px]',
        Platform.select({ web: 'inline-flex w-fit', native: 'mr-auto' }),
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium text-foreground dark:text-muted-foreground',
        value === props.value && 'dark:text-foreground',
      )}
    >
      <TabsPrimitive.Trigger
        className={cn(
          'flex h-[calc(100%-1px)] flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5',
          Platform.select({
            web: 'inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
          }),
          props.disabled && 'opacity-50',
          props.value === value && 'bg-background dark:border-foreground/10 dark:bg-input/30',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: 'flex-1 outline-none' }), className)}
      {...props}
    />
  );
}
