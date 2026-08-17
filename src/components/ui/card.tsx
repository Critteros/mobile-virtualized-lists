import { View } from 'react-native';

import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type CardProps = React.ComponentProps<typeof View> & React.RefAttributes<View>;
export type CardHeaderProps = React.ComponentProps<typeof View> & React.RefAttributes<View>;
export type CardTitleProps = React.ComponentProps<typeof Text> & React.RefAttributes<typeof Text>;
export type CardDescriptionProps = React.ComponentProps<typeof Text> &
  React.RefAttributes<typeof Text>;
export type CardContentProps = React.ComponentProps<typeof View> & React.RefAttributes<View>;
export type CardFooterProps = React.ComponentProps<typeof View> & React.RefAttributes<View>;

export function Card({ className, ...props }: CardProps) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn(
          'flex flex-col gap-6 rounded-xl border border-border bg-card py-6 shadow-sm shadow-black/5',
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <View className={cn('flex flex-col gap-1.5 px-6', className)} {...props} />;
}

export function CardTitle({ className, ref, ...props }: CardTitleProps) {
  return (
    <Text
      ref={ref}
      role="heading"
      aria-level={3}
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return <Text className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: CardContentProps) {
  return <View className={cn('px-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return <View className={cn('flex flex-row items-center px-6', className)} {...props} />;
}
