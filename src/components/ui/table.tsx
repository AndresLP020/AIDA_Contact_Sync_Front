import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full min-w-[720px] caption-bottom text-sm', className)} {...props} />
    </div>
  );
}
export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('bg-[#0d1420] [&_tr]:border-b', className)} {...props} />;
}
export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}
export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('border-b transition-colors hover:bg-[#141e2e] data-[state=selected]:bg-[#1a2d4a]', className)} {...props} />;
}
export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={cn('h-10 px-3 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-[#8b9db4]', className)} {...props} />;
}
export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-3 py-3 align-middle text-xs text-[#dce6f3]', className)} {...props} />;
}
