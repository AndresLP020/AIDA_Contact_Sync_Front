import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', {
  variants: {
    variant: {
      default: 'border-blue-500/40 bg-blue-500/15 text-blue-200',
      success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
      warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      destructive: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
      muted: 'border-border bg-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>;
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
