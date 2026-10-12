import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative flex w-full gap-3 rounded-lg border px-4 py-3 text-xs leading-relaxed [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0', {
  variants: {
    variant: {
      default: 'border-[#3a2d51] bg-[#191427] text-[#c9c2d9]',
      warning: 'border-amber-500/30 bg-amber-500/5 text-amber-100',
      destructive: 'border-rose-500/40 bg-rose-500/5 text-rose-100',
      success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
