import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('rounded-xl border bg-gradient-to-br from-[#121a28] to-[#0e1520] text-card-foreground', className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-5 pb-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-sm font-semibold leading-none', className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />;
}
export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-wrap items-center gap-2 p-5 pt-0', className)} {...props} />;
}
