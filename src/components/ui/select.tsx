import { Fragment } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as SelectPrimitive from '@rn-primitives/select';
import { Check, ChevronDown, ChevronDownIcon, ChevronUpIcon } from 'lucide-react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type Option = SelectPrimitive.Option;

export type SelectProps = React.ComponentProps<typeof SelectPrimitive.Root>;
export type SelectGroupProps = React.ComponentProps<typeof SelectPrimitive.Group>;
export type SelectValueProps = React.ComponentProps<typeof SelectPrimitive.Value> & {
  className?: string;
};
export type SelectTriggerProps = React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  children?: React.ReactNode;
  size?: 'default' | 'sm';
};
export type SelectContentProps = React.ComponentProps<typeof SelectPrimitive.Content> & {
  className?: string;
  portalHost?: string;
};
export type SelectLabelProps = React.ComponentProps<typeof SelectPrimitive.Label>;
export type SelectItemProps = React.ComponentProps<typeof SelectPrimitive.Item>;
export type SelectSeparatorProps = React.ComponentProps<typeof SelectPrimitive.Separator>;
export type SelectScrollUpButtonProps = React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>;
export type SelectScrollDownButtonProps = React.ComponentProps<
  typeof SelectPrimitive.ScrollDownButton
>;

export const Select = SelectPrimitive.Root;

export const SelectGroup = SelectPrimitive.Group;

export function SelectValue({ ref, className, ...props }: SelectValueProps) {
  const { value } = SelectPrimitive.useRootContext();
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn(
        'line-clamp-1 flex flex-row items-center gap-2 text-sm text-foreground',
        !value && 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function SelectTrigger({
  ref,
  className,
  children,
  size = 'default',
  ...props
}: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex h-10 flex-row items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 shadow-sm shadow-black/5 sm:h-9 dark:bg-input/30 dark:active:bg-input/50',
        Platform.select({
          web: 'w-fit text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        }),
        props.disabled && 'opacity-50',
        size === 'sm' && 'h-8 py-2 sm:py-1.5',
        className,
      )}
      {...props}
    >
      <>{children}</>
      <Icon as={ChevronDown} aria-hidden={true} className="size-4 text-muted-foreground" />
    </SelectPrimitive.Trigger>
  );
}

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : Fragment;

export function SelectContent({
  className,
  children,
  position = 'popper',
  portalHost,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
          asChild={Platform.OS !== 'web'}
        >
          <NativeOnlyAnimatedView
            className="z-50"
            entering={FadeIn.reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.reduceMotion(ReduceMotion.System)}
            as="Pressable"
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <SelectPrimitive.Content
                className={cn(
                  'relative z-50 min-w-[8rem] rounded-md border border-border bg-popover shadow-md shadow-black/5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 max-h-52 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2',
                    ),
                    native: 'p-1',
                  }),
                  position === 'popper' &&
                    Platform.select({
                      web: cn(
                        props.side === 'bottom' && 'translate-y-1',
                        props.side === 'top' && '-translate-y-1',
                      ),
                    }),
                  className,
                )}
                position={position}
                {...props}
              >
                <SelectScrollUpButton />
                <SelectPrimitive.Viewport
                  className={cn(
                    'p-1',
                    position === 'popper' &&
                      cn(
                        'w-full',
                        Platform.select({
                          web: 'h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)]',
                        }),
                      ),
                  )}
                >
                  {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
              </SelectPrimitive.Content>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: SelectLabelProps) {
  return (
    <SelectPrimitive.Label
      className={cn('px-2 py-2 text-xs text-muted-foreground sm:py-1.5', className)}
      {...props}
    />
  );
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'group relative flex w-full flex-row items-center gap-2 rounded-sm py-2 pr-8 pl-2 active:bg-accent sm:py-1.5',
        Platform.select({
          web: 'cursor-default outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none [&_svg]:pointer-events-none *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2',
        }),
        props.disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <View className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icon as={Check} className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText className="text-sm text-foreground select-none group-active:text-accent-foreground" />
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return (
    <SelectPrimitive.Separator
      className={cn(
        '-mx-1 my-1 h-px bg-border',
        Platform.select({ web: 'pointer-events-none' }),
        className,
      )}
      {...props}
    />
  );
}

/**
 * @platform Web only
 * Returns null on native platforms
 */
export function SelectScrollUpButton({ className, ...props }: SelectScrollUpButtonProps) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <Icon as={ChevronUpIcon} className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

/**
 * @platform Web only
 * Returns null on native platforms
 */
export function SelectScrollDownButton({ className, ...props }: SelectScrollDownButtonProps) {
  if (Platform.OS !== 'web') {
    return null;
  }
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <Icon as={ChevronDownIcon} className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}
