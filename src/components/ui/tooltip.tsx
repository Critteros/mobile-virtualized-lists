import { Fragment } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as TooltipPrimitive from '@rn-primitives/tooltip';
import { FadeInDown, FadeInUp, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root>;
export type TooltipTriggerProps = React.ComponentProps<typeof TooltipPrimitive.Trigger>;
export type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Content> & {
  portalHost?: string;
};

export const Tooltip = TooltipPrimitive.Root;

export const TooltipTrigger = TooltipPrimitive.Trigger;

const FullWindowOverlay = Platform.OS === 'ios' ? RNFullWindowOverlay : Fragment;

export function TooltipContent({
  className,
  sideOffset = 4,
  portalHost,
  side = 'top',
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <TooltipPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
          asChild={Platform.OS !== 'web'}
        >
          <NativeOnlyAnimatedView
            entering={
              side === 'top'
                ? FadeInDown.withInitialValues({ transform: [{ translateY: 3 }] })
                    .duration(150)
                    .reduceMotion(ReduceMotion.System)
                : FadeInUp.withInitialValues({ transform: [{ translateY: -5 }] }).reduceMotion(
                    ReduceMotion.System,
                  )
            }
            exiting={FadeOut.reduceMotion(ReduceMotion.System)}
            as="Pressable"
          >
            <TextClassContext.Provider value="text-xs text-primary-foreground">
              <TooltipPrimitive.Content
                sideOffset={sideOffset}
                className={cn(
                  'z-50 rounded-md bg-primary px-3 py-2 sm:py-1.5',
                  Platform.select({
                    web: cn(
                      'animate-in fade-in-0 zoom-in-95 w-fit origin-(--radix-tooltip-content-transform-origin) text-balance',
                      side === 'bottom' && 'slide-in-from-top-2',
                      side === 'left' && 'slide-in-from-right-2',
                      side === 'right' && 'slide-in-from-left-2',
                      side === 'top' && 'slide-in-from-bottom-2',
                    ),
                  }),
                  className,
                )}
                side={side}
                {...props}
              />
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </TooltipPrimitive.Overlay>
      </FullWindowOverlay>
    </TooltipPrimitive.Portal>
  );
}
