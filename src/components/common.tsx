import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Inbox } from 'lucide-react';
import type * as React from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/form-controls';
import { JOB_STATUS_LABEL, SYNC_STATUS_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api-client';
import type { ContactSyncStatus, JobStatus } from '@/types';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-400">{eyebrow}</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const SYNC_VARIANT: Record<ContactSyncStatus, BadgeProps['variant']> = { synced: 'success', pending: 'warning', conflict: 'destructive', failed: 'destructive', local_only: 'muted' };
export function SyncStatusBadge({ status }: { status: ContactSyncStatus }) {
  return <Badge variant={SYNC_VARIANT[status]}>{SYNC_STATUS_LABEL[status]}</Badge>;
}

const JOB_VARIANT: Record<JobStatus, BadgeProps['variant']> = { completed: 'success', partially_failed: 'warning', failed: 'destructive', running: 'default', pending: 'muted' };
export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={JOB_VARIANT[status]}>{JOB_STATUS_LABEL[status]}</Badge>;
}

export function StatCard({ label, value, foot, icon: Icon, loading, tone }: { label: string; value: React.ReactNode; foot?: string; icon: LucideIcon; loading?: boolean; tone?: 'warning' | 'danger' }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn('rounded-lg bg-secondary p-2 text-sky-300', tone === 'warning' && 'text-amber-300', tone === 'danger' && 'text-rose-300')}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{loading ? <Skeleton className="h-7 w-16" /> : value}</div>
      {foot && <div className="mt-1 text-[11px] text-[#7d90a8]">{foot}</div>}
    </Card>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
      <Inbox className="size-5" />
      {children}
    </div>
  );
}

/** Error sanitizado: mensaje en español + Correlation ID para soporte. Nunca muestra detalles internos. */
export function ErrorAlert({ error, className }: { error: unknown; className?: string }) {
  if (!error) return null;
  const e = error instanceof ApiError ? error : null;
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle />
      <div>
        <div>{e?.message ?? 'Ocurrió un error inesperado.'}</div>
        {e?.correlationId && <div className="mt-1 font-mono text-[10px] opacity-70">Correlation ID: {e.correlationId}</div>}
      </div>
    </Alert>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}
