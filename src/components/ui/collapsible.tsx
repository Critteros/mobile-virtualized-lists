import * as CollapsiblePrimitive from '@rn-primitives/collapsible';

export type CollapsibleProps = React.ComponentProps<typeof CollapsiblePrimitive.Root>;
export type CollapsibleTriggerProps = React.ComponentProps<typeof CollapsiblePrimitive.Trigger>;
export type CollapsibleContentProps = React.ComponentProps<typeof CollapsiblePrimitive.Content>;

export const Collapsible = CollapsiblePrimitive.Root;

export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

export const CollapsibleContent = CollapsiblePrimitive.Content;
