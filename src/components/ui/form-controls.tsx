'use client';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Check, Minus } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full rounded-md border border-input bg-[#0a1018] px-3 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root data-slot="label" className={cn('text-xs font-medium text-[#b4c2d6]', className)} {...props} />;
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-input bg-[#0a1018] disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        {props.checked === 'indeterminate' ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/** Select nativo con estilo shadcn: accesible y fiable dentro de iframes. */
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return <select data-slot="select" className={cn('h-9 rounded-md border border-input bg-[#0a1018] px-3 text-sm text-foreground outline-none focus-visible:border-ring', className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
