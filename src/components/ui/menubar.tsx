import { Fragment, useId, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as MenubarPrimitive from '@rn-primitives/menubar';
import { Portal } from '@rn-primitives/portal';
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type MenubarProps = React.ComponentProps<typeof MenubarPrimitive.Root>;
export type MenubarMenuProps = React.ComponentProps<typeof MenubarPrimitive.Menu>;
export type MenubarGroupProps = React.ComponentProps<typeof MenubarPrimitive.Group>;
export type MenubarPortalProps = React.ComponentProps<typeof MenubarPrimitive.Portal>;
export type MenubarSubProps = React.ComponentProps<typeof MenubarPrimitive.Sub>;
export type MenubarRadioGroupProps = React.ComponentProps<typeof MenubarPrimitive.RadioGroup>;
export type MenubarTriggerProps = React.ComponentProps<typeof MenubarPrimitive.Trigger>;
export type MenubarSubTriggerProps = React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
  children?: React.ReactNode;
  iconClassName?: string;
  inset?: boolean;
};
export type MenubarSubContentProps = React.ComponentProps<typeof MenubarPrimitive.SubContent>;
export type MenubarContentProps = React.ComponentProps<typeof MenubarPrimitive.Content> & {
  portalHost?: string;
};
export type MenubarItemProps = React.ComponentProps<typeof MenubarPrimitive.Item> & {
  className?: string;
  inset?: boolean;
  variant?: 'default' | 'destructive';
};
export type MenubarCheckboxItemProps = React.ComponentProps<
  typeof MenubarPrimitive.CheckboxItem
> & {
  children?: React.ReactNode;
};
export type MenubarRadioItemProps = React.ComponentProps<typeof MenubarPrimitive.RadioItem> & {
  children?: React.ReactNode;
};
export type MenubarLabelProps = React.ComponentProps<typeof MenubarPrimitive.Label> & {
  className?: string;
  inset?: boolean;
};
export type MenubarSeparatorProps = React.ComponentProps<typeof MenubarPrimitive.Separator>;
export type MenubarShortcutProps = React.ComponentProps<typeof Text>;

export const MenubarMenu = MenubarPrimitive.Menu;

export const MenubarGroup = MenubarPrimitive.Group;

export const MenubarPortal = MenubarPrimitive.Portal;

export const MenubarSub = MenubarPrimitive.Sub;

export const MenubarRadioGroup = MenubarPrimitive.RadioGroup;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : Fragment;

export function Menubar({
  className,
  value: valueProp,
  onValueChange: onValueChangeProp,
  ...props
}: MenubarProps) {
  const id = useId();
  const [value, setValue] = useState<string | undefined>(undefined);

  function closeMenu() {
    if (onValueChangeProp) {
      onValueChangeProp(undefined);
      return;
    }
    setValue(undefined);
  }

  return (
    <>
      {Platform.OS !== 'web' && (value || valueProp) ? (
        <Portal name={`menubar-overlay-${id}`}>
          <Pressable onPress={closeMenu} style={StyleSheet.absoluteFill} />
        </Portal>
      ) : null}
      <MenubarPrimitive.Root
        className={cn(
          'flex h-10 flex-row items-center gap-1 rounded-md border border-border bg-background p-1 shadow-sm shadow-black/5 sm:h-9',
          className,
        )}
        value={value ?? valueProp}
        onValueChange={onValueChangeProp ?? setValue}
        {...props}
      />
    </>
  );
}

export function MenubarTrigger({ className, ...props }: MenubarTriggerProps) {
  const { value } = MenubarPrimitive.useRootContext();
  const { value: itemValue } = MenubarPrimitive.useMenuContext();

  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm font-medium select-none group-active:text-accent-foreground',
        value === itemValue && 'text-accent-foreground',
      )}
    >
      <MenubarPrimitive.Trigger
        className={cn(
          'group flex items-center rounded-md px-2 py-1.5 sm:py-1',
          Platform.select({
            web: 'cursor-default outline-none focus:bg-accent focus:text-accent-foreground',
          }),
          value === itemValue && 'bg-accent',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export function MenubarSubTrigger({
  className,
  inset,
  children,
  iconClassName,
  ...props
}: MenubarSubTriggerProps) {
  const { open } = MenubarPrimitive.useSubContext();
  const icon = Platform.OS === 'web' ? ChevronRight : open ? ChevronUp : ChevronDown;
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm select-none group-active:text-accent-foreground',
        open && 'text-accent-foreground',
      )}
    >
      <MenubarPrimitive.SubTrigger
        className={cn(
          'group flex flex-row items-center rounded-sm px-2 py-2 active:bg-accent sm:py-1.5',
          Platform.select({
            web: 'cursor-default outline-none focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none',
          }),
          className,
          open && 'bg-accent',
          inset && 'pl-8',
        )}
        {...props}
      >
        <>{children}</>
        <Icon as={icon} className={cn('ml-auto size-4 shrink-0 text-foreground', iconClassName)} />
      </MenubarPrimitive.SubTrigger>
    </TextClassContext.Provider>
  );
}

export function MenubarSubContent({ className, ...props }: MenubarSubContentProps) {
  return (
    <NativeOnlyAnimatedView entering={FadeIn.reduceMotion(ReduceMotion.System)}>
      <MenubarPrimitive.SubContent
        className={cn(
          'overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg shadow-black/5',
          Platform.select({
            web: 'animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fade-in-0 data-[state=closed]:zoom-out-95 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin)',
          }),
          className,
        )}
        {...props}
      />
    </NativeOnlyAnimatedView>
  );
}

export function MenubarContent({
  className,
  portalHost,
  align = 'start',
  alignOffset = -4,
  sideOffset = 8,
  ...props
}: MenubarContentProps) {
  return (
    <MenubarPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <NativeOnlyAnimatedView
          as="Pressable"
          accessible={false}
          entering={FadeIn.reduceMotion(ReduceMotion.System)}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <TextClassContext.Provider value="text-popover-foreground">
            <MenubarPrimitive.Content
              className={cn(
                'min-w-[12rem] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg shadow-black/5',
                Platform.select({
                  web: cn(
                    'animate-in fade-in-0 zoom-in-95 z-50 max-h-(--radix-context-menu-content-available-height) origin-(--radix-context-menu-content-transform-origin) cursor-default',
                    props.side === 'bottom' && 'slide-in-from-top-2',
                    props.side === 'top' && 'slide-in-from-bottom-2',
                  ),
                }),
                className,
              )}
              align={align}
              alignOffset={alignOffset}
              sideOffset={sideOffset}
              {...props}
            />
          </TextClassContext.Provider>
        </NativeOnlyAnimatedView>
      </FullWindowOverlay>
    </MenubarPrimitive.Portal>
  );
}

export function MenubarItem({ className, inset, variant, ...props }: MenubarItemProps) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-popover-foreground select-none group-active:text-popover-foreground',
        variant === 'destructive' && 'text-destructive group-active:text-destructive',
      )}
    >
      <MenubarPrimitive.Item
        className={cn(
          'group relative flex flex-row items-center gap-2 rounded-sm px-2 py-2 active:bg-accent sm:py-1.5',
          Platform.select({
            web: cn(
              'cursor-default outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none',
              variant === 'destructive' && 'focus:bg-destructive/10 dark:focus:bg-destructive/20',
            ),
          }),
          variant === 'destructive' && 'active:bg-destructive/10 dark:active:bg-destructive/20',
          props.disabled && 'opacity-50',
          inset && 'pl-8',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export function MenubarCheckboxItem({ className, children, ...props }: MenubarCheckboxItemProps) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.CheckboxItem
        className={cn(
          'group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 active:bg-accent sm:py-1.5',
          Platform.select({
            web: 'cursor-default outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <Icon
              as={Check}
              className={cn(
                'size-4 text-foreground',
                Platform.select({ web: 'pointer-events-none' }),
              )}
            />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.CheckboxItem>
    </TextClassContext.Provider>
  );
}

export function MenubarRadioItem({ className, children, ...props }: MenubarRadioItemProps) {
  return (
    <TextClassContext.Provider value="text-sm text-popover-foreground select-none group-active:text-accent-foreground">
      <MenubarPrimitive.RadioItem
        className={cn(
          'group relative flex flex-row items-center gap-2 rounded-sm py-2 pr-2 pl-8 active:bg-accent sm:py-1.5',
          Platform.select({
            web: 'cursor-default outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none',
          }),
          props.disabled && 'opacity-50',
          className,
        )}
        {...props}
      >
        <View className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <MenubarPrimitive.ItemIndicator>
            <View className="h-2 w-2 rounded-full bg-foreground" />
          </MenubarPrimitive.ItemIndicator>
        </View>
        <>{children}</>
      </MenubarPrimitive.RadioItem>
    </TextClassContext.Provider>
  );
}

export function MenubarLabel({ className, inset, ...props }: MenubarLabelProps) {
  return (
    <MenubarPrimitive.Label
      className={cn(
        'px-2 py-2 text-sm font-medium text-foreground sm:py-1.5',
        inset && 'pl-8',
        className,
      )}
      {...props}
    />
  );
}

export function MenubarSeparator({ className, ...props }: MenubarSeparatorProps) {
  return (
    <MenubarPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
  );
}

export function MenubarShortcut({ className, ...props }: MenubarShortcutProps) {
  return (
    <Text
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}
