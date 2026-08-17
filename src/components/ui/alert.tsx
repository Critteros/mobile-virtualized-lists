import { use } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type AlertProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    icon: LucideIcon;
    variant?: 'default' | 'destructive';
    iconClassName?: string;
  };
export type AlertTitleProps = React.ComponentProps<typeof Text>;
export type AlertDescriptionProps = React.ComponentProps<typeof Text>;

export function Alert({ className, variant, children, icon, iconClassName, ...props }: AlertProps) {
  return (
    <TextClassContext.Provider
      value={cn(
        'text-sm text-foreground',
        variant === 'destructive' && 'text-destructive',
        className,
      )}
    >
      <View
        role="alert"
        className={cn(
          'relative w-full rounded-lg border border-border bg-card px-4 pt-3.5 pb-2',
          className,
        )}
        {...props}
      >
        <View className="absolute top-3 left-3.5">
          <Icon
            as={icon}
            className={cn('size-4', variant === 'destructive' && 'text-destructive', iconClassName)}
          />
        </View>
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <Text
      className={cn('mb-1 ml-0.5 min-h-4 pl-6 leading-none font-medium tracking-tight', className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  const textClass = use(TextClassContext);
  return (
    <Text
      className={cn(
        'ml-0.5 pb-1.5 pl-6 text-sm leading-relaxed text-muted-foreground',
        textClass?.includes('text-destructive') && 'text-destructive/90',
        className,
      )}
      {...props}
    />
  );
}
