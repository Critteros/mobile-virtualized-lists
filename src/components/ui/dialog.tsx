import { Fragment } from 'react';
import { Platform, Text, View, type GestureResponderEvent, type ViewProps } from 'react-native';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { X } from 'lucide-react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { cn } from '@/lib/utils';

export type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;
export type DialogTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>;
export type DialogPortalProps = React.ComponentProps<typeof DialogPrimitive.Portal>;
export type DialogCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>;
export type DialogOverlayProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Overlay>,
  'asChild'
> & {
  children?: React.ReactNode;
};
export type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  portalHost?: string;
};
export type DialogHeaderProps = ViewProps;
export type DialogFooterProps = ViewProps;
export type DialogTitleProps = React.ComponentProps<typeof DialogPrimitive.Title>;
export type DialogDescriptionProps = React.ComponentProps<typeof DialogPrimitive.Description>;

export const Dialog = DialogPrimitive.Root;

export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogPortal = DialogPrimitive.Portal;

export const DialogClose = DialogPrimitive.Close;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : Fragment;

export function DialogOverlay({ className, children, onPress, ...props }: DialogOverlayProps) {
  const { onOpenChange } = DialogPrimitive.useRootContext();

  function onOverlayPress(event: GestureResponderEvent) {
    onPress?.(event);
    if (event.target === event.currentTarget && !event.isDefaultPrevented()) {
      onOpenChange(false);
    }
  }

  return (
    <FullWindowOverlay>
      <DialogPrimitive.Overlay
        className={cn(
          'absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center bg-black/50 p-2',
          Platform.select({
            web: 'animate-in fade-in-0 fixed cursor-default [&>*]:cursor-auto',
          }),
          className,
        )}
        {...props}
        onPress={Platform.select({ web: onOverlayPress, native: onPress })}
        asChild={Platform.OS !== 'web'}
      >
        <NativeOnlyAnimatedView
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
          as="Pressable"
        >
          <NativeOnlyAnimatedView
            entering={FadeIn.delay(50).reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
          >
            <>{children}</>
          </NativeOnlyAnimatedView>
        </NativeOnlyAnimatedView>
      </DialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

export function DialogContent({ className, portalHost, children, ...props }: DialogContentProps) {
  return (
    <DialogPortal hostName={portalHost}>
      <DialogOverlay>
        <DialogPrimitive.Content
          className={cn(
            'z-50 mx-auto flex w-full max-w-[calc(100%-2rem)] flex-col gap-4 rounded-lg border border-border bg-background p-6 shadow-lg shadow-black/5 sm:max-w-lg',
            Platform.select({
              web: 'animate-in fade-in-0 zoom-in-95 duration-200',
            }),
            className,
          )}
          {...props}
        >
          <>{children}</>
          <DialogPrimitive.Close
            className={cn(
              'absolute top-4 right-4 rounded opacity-70 active:opacity-100',
              Platform.select({
                web: 'ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none data-[state=open]:bg-accent',
              }),
            )}
            hitSlop={12}
          >
            <Icon
              as={X}
              className={cn('size-4 shrink-0 text-accent-foreground web:pointer-events-none')}
            />
            <Text className="sr-only">Close</Text>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogOverlay>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <View className={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <View
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg leading-none font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
