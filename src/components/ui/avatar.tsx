import * as AvatarPrimitive from '@rn-primitives/avatar';

import { cn } from '@/lib/utils';

export type AvatarProps = React.ComponentProps<typeof AvatarPrimitive.Root>;
export type AvatarImageProps = React.ComponentProps<typeof AvatarPrimitive.Image>;
export type AvatarFallbackProps = React.ComponentProps<typeof AvatarPrimitive.Fallback>;

export function Avatar({ className, ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return <AvatarPrimitive.Image className={cn('aspect-square size-full', className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full flex-row items-center justify-center rounded-full bg-muted',
        className,
      )}
      {...props}
    />
  );
}
