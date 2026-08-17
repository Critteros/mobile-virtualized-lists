import { Platform, Pressable, View } from 'react-native';
import * as AccordionPrimitive from '@rn-primitives/accordion';
import { ChevronDown } from 'lucide-react-native';
import Animated, {
  FadeOutUp,
  LayoutAnimationConfig,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type AccordionProps = Omit<React.ComponentProps<typeof AccordionPrimitive.Root>, 'asChild'>;
export type AccordionItemProps = React.ComponentProps<typeof AccordionPrimitive.Item>;
export type AccordionTriggerProps = React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  children?: React.ReactNode;
};
export type AccordionContentProps = React.ComponentProps<typeof AccordionPrimitive.Content>;

export function Accordion({ children, ref, ...props }: AccordionProps) {
  return (
    <LayoutAnimationConfig skipEntering>
      <AccordionPrimitive.Root
        {...(props as AccordionPrimitive.RootProps)}
        asChild={Platform.OS !== 'web'}
      >
        <Animated.View layout={LinearTransition.duration(200)}>{children}</Animated.View>
      </AccordionPrimitive.Root>
    </LayoutAnimationConfig>
  );
}

export function AccordionItem({ children, className, value, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      className={cn(
        'border-b border-border',
        Platform.select({ web: 'last:border-b-0' }),
        className,
      )}
      value={value}
      asChild={Platform.OS !== 'web'}
      {...props}
    >
      <Animated.View
        className="native:overflow-hidden"
        layout={Platform.select({ native: LinearTransition.duration(200) })}
      >
        {children}
      </Animated.View>
    </AccordionPrimitive.Item>
  );
}

const Trigger = Platform.OS === 'web' ? View : Pressable;

export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  const { isExpanded } = AccordionPrimitive.useItemContext();

  const progress = useDerivedValue(
    () => (isExpanded ? withTiming(1, { duration: 250 }) : withTiming(0, { duration: 200 })),
    [isExpanded],
  );
  const chevronStyle = useAnimatedStyle(
    () => ({
      transform: [{ rotate: `${progress.value * 180}deg` }],
    }),
    [progress],
  );

  return (
    <TextClassContext.Provider
      value={cn('text-left text-sm font-medium', Platform.select({ web: 'group-hover:underline' }))}
    >
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger {...props} asChild>
          <Trigger
            className={cn(
              'flex-row items-start justify-between gap-4 rounded-md py-4 disabled:opacity-50',
              Platform.select({
                web: 'flex flex-1 transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none [&[data-state=open]>svg]:rotate-180',
              }),
              className,
            )}
          >
            <>{children}</>
            <Animated.View style={chevronStyle}>
              <Icon
                as={ChevronDown}
                size={16}
                className={cn(
                  'shrink-0 text-muted-foreground',
                  Platform.select({
                    web: 'pointer-events-none translate-y-0.5 transition-transform duration-200',
                  }),
                )}
              />
            </Animated.View>
          </Trigger>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    </TextClassContext.Provider>
  );
}

export function AccordionContent({ className, children, ...props }: AccordionContentProps) {
  const { isExpanded } = AccordionPrimitive.useItemContext();
  return (
    <TextClassContext.Provider value="text-sm">
      <AccordionPrimitive.Content
        className={cn(
          'overflow-hidden',
          Platform.select({
            web: isExpanded ? 'animate-accordion-down' : 'animate-accordion-up',
          }),
        )}
        {...props}
      >
        <Animated.View
          exiting={Platform.select({
            native: FadeOutUp.duration(200).reduceMotion(ReduceMotion.System),
          })}
          className={cn('pb-4', className)}
        >
          {children}
        </Animated.View>
      </AccordionPrimitive.Content>
    </TextClassContext.Provider>
  );
}
