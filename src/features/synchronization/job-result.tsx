'use client';
import { CheckCircle2, XCircle } from 'lucide-react';
import { JobStatusBadge } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { describeError } from '@/lib/error-messages';
import { OPERATION_LABEL } from '@/lib/labels';
import { formatDateTime, fullName } from '@/lib/utils';
import type { SyncJobDetail } from '@/types';

/** Resultado real de un trabajo: totales, error general y detalle por contacto (con foco en los fallos). */
export function JobResult({ job, onlyFailures = false }: { job: SyncJobDetail; onlyFailures?: boolean }) {
  const events = onlyFailures ? job.events.filter(e => e.status === 'failed') : job.events;
  return (
    <div className="grid gap-3" data-testid="job-result">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <JobStatusBadge status={job.status} />
        <span>{job.direction === 'import' ? 'Importación' : 'Exportación'}</span>
        <span className="text-muted-foreground">{formatDateTime(job.finishedAt ?? job.createdAt)}</span>
        <span className="ml-auto">
          <b className="text-emerald-300">{job.successfulRecords}</b> correctos · <b className="text-rose-300">{job.failedRecords}</b> con error · {job.totalRecords} total
        </span>
      </div>
      {job.errorCode && <Alert variant="destructive">{describeError(job.errorCode)}</Alert>}
      {events.length > 0 && (
        <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
          {events.map(e => (
            <li key={e.id} className="flex items-start gap-2.5 px-3 py-2 text-xs">
              {e.status === 'success' ? <CheckCircle2 className="mt-0.5 size-3.5 text-emerald-400" /> : <XCircle className="mt-0.5 size-3.5 text-rose-400" />}
              <div className="min-w-0 flex-1">
                <div className="truncate">{e.contact ? fullName(e.contact) : e.ghlContactId}</div>
                {e.errorCode && <div className="text-[11px] text-rose-200/80">{describeError(e.errorCode)}</div>}
              </div>
              <span className="text-[11px] text-muted-foreground">{OPERATION_LABEL[e.operation] ?? e.operation}</span>
            </li>
          ))}
        </ul>
      )}
      {onlyFailures && !events.length && <p className="text-xs text-muted-foreground">Sin errores.</p>}
    </div>
  );
}
