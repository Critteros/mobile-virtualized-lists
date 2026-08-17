import { Fragment } from 'react';
import { Platform, View, type ViewProps } from 'react-native';
import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import { buttonTextVariants, buttonVariants } from '@/components/ui/button';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root>;
export type AlertDialogTriggerProps = React.ComponentProps<typeof AlertDialogPrimitive.Trigger>;
export type AlertDialogPortalProps = React.ComponentProps<typeof AlertDialogPrimitive.Portal>;
export type AlertDialogOverlayProps = Omit<
  React.ComponentProps<typeof AlertDialogPrimitive.Overlay>,
  'asChild'
> & {
  children?: React.ReactNode;
};
export type AlertDialogContentProps = React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  portalHost?: string;
};
export type AlertDialogHeaderProps = ViewProps;
export type AlertDialogFooterProps = ViewProps;
export type AlertDialogTitleProps = React.ComponentProps<typeof AlertDialogPrimitive.Title>;
export type AlertDialogDescriptionProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Description
>;
export type AlertDialogActionProps = React.ComponentProps<typeof AlertDialogPrimitive.Action>;
export type AlertDialogCancelProps = React.ComponentProps<typeof AlertDialogPrimitive.Cancel>;

export const AlertDialog = AlertDialogPrimitive.Root;

export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export const AlertDialogPortal = AlertDialogPrimitive.Portal;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : Fragment;

export function AlertDialogOverlay({ className, children, ...props }: AlertDialogOverlayProps) {
  return (
    <FullWindowOverlay>
      <AlertDialogPrimitive.Overlay
        className={cn(
          'absolute top-0 right-0 bottom-0 left-0 z-50 flex items-center justify-center bg-black/50 p-2',
          Platform.select({
            web: 'animate-in fade-in-0 fixed',
          }),
          className,
        )}
        {...props}
        asChild={Platform.OS !== 'web'}
      >
        <NativeOnlyAnimatedView
          entering={FadeIn.duration(200).delay(50).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(150).reduceMotion(ReduceMotion.System)}
          as="Pressable"
        >
          <>{children}</>
        </NativeOnlyAnimatedView>
      </AlertDialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

export function AlertDialogContent({ className, portalHost, ...props }: AlertDialogContentProps) {
  return (
    <AlertDialogPortal hostName={portalHost}>
      <AlertDialogOverlay>
        <AlertDialogPrimitive.Content
          className={cn(
            'z-50 flex w-full max-w-[calc(100%-2rem)] flex-col gap-4 rounded-lg border border-border bg-background p-6 shadow-lg shadow-black/5 sm:max-w-lg',
            Platform.select({
              web: 'animate-in fade-in-0 zoom-in-95 duration-200',
            }),
            className,
          )}
          {...props}
        />
      </AlertDialogOverlay>
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  return (
    <TextClassContext.Provider value="text-center sm:text-left">
      <View className={cn('flex flex-col gap-2', className)} {...props} />
    </TextClassContext.Provider>
  );
}

export function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return (
    <View
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export function AlertDialogTitle({ className, ...props }: AlertDialogTitleProps) {
  return (
    <AlertDialogPrimitive.Title
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export function AlertDialogAction({ className, ...props }: AlertDialogActionProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ className })}>
      <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export function AlertDialogCancel({ className, ...props }: AlertDialogCancelProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ className, variant: 'outline' })}>
      <AlertDialogPrimitive.Cancel
        className={cn(buttonVariants({ variant: 'outline' }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}
