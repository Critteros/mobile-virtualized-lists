import { View } from 'react-native';

import { cn } from '@/lib/utils';

export type SkeletonProps = React.ComponentProps<typeof View> & React.RefAttributes<View>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <View className={cn('animate-pulse rounded-md bg-accent', className)} {...props} />;
}
