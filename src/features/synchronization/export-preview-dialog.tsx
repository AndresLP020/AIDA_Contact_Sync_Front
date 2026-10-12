'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ErrorAlert, TableSkeleton } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox, Label } from '@/components/ui/form-controls';
import { useSession } from '@/hooks/use-session';
import { describeError } from '@/lib/error-messages';
import { FIELD_LABEL } from '@/lib/labels';
import { newIdempotencyKey } from '@/lib/utils';
import { syncApi } from '@/services/endpoints';
import type { SyncJobDetail } from '@/types';
import { JobResult } from './job-result';

/**
 * Flujo B (PostgreSQL → GHL): vista previa de diferencias y conflictos → confirmación explícita → resultado real.
 * El backend vuelve a comprobar el estado remoto y rechaza la exportación si la vista previa quedó desactualizada.
 */
export function ExportPreviewDialog({ contactIds, open, onOpenChange }: { contactIds: string[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const { can } = useSession();
  const [confirmed, setConfirmed] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [result, setResult] = useState<SyncJobDetail | null>(null);
  const idempotencyKey = useMemo(() => (open ? newIdempotencyKey() : ''), [open]);

  const preview = useQuery({ queryKey: ['export-preview', contactIds], queryFn: () => syncApi.preview(contactIds), enabled: open && contactIds.length > 0, gcTime: 0, staleTime: 0 });
  const exportM = useMutation({
    mutationFn: () => syncApi.export({ contactIds, confirmed: true, previewToken: preview.data!.previewToken, overwriteConflicts: overwrite || undefined }, idempotencyKey),
    onSuccess: job => {
      setResult(job);
      void qc.invalidateQueries();
      if (job.status === 'completed') toast.success(`Exportación completada: ${job.successfulRecords} contacto(s) actualizados en GHL.`);
      else toast.warning(`Exportación ${job.status === 'failed' ? 'fallida' : 'parcial'}: revisa el detalle.`);
    },
  });

  const close = (next: boolean) => {
    if (!next) {
      setConfirmed(false);
      setOverwrite(false);
      setResult(null);
      exportM.reset();
    }
    onOpenChange(next);
  };

  const data = preview.data;
  const blocked = data ? data.items.filter(i => i.conflict).length : 0;
  const sendable = data ? data.items.filter(i => i.changes.length && !i.error && (!i.conflict || overwrite)).length : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{result ? 'Resultado de la exportación' : 'Vista previa: exportar cambios a GHL'}</DialogTitle>
          <DialogDescription>{result ? 'Resultado confirmado por GHL para cada contacto.' : 'Revisa los cambios exactos que se enviarán. Nada se escribe en GHL hasta que confirmes.'}</DialogDescription>
        </DialogHeader>

        {result ? (
          <JobResult job={result} />
        ) : preview.isLoading ? (
          <TableSkeleton rows={3} />
        ) : preview.error ? (
          <ErrorAlert error={preview.error} />
        ) : data ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="muted">{data.summary.total} seleccionados</Badge>
              <Badge>{data.summary.withChanges} con cambios</Badge>
              {data.summary.conflicts > 0 && <Badge variant="destructive">{data.summary.conflicts} en conflicto</Badge>}
              {data.summary.errors > 0 && <Badge variant="warning">{data.summary.errors} sin verificar</Badge>}
            </div>
            <ul className="max-h-[45vh] divide-y overflow-y-auto rounded-lg border" data-testid="export-preview-list">
              {data.items.map(item => (
                <li key={item.contactId} className="grid gap-1.5 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{item.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{item.ghlContactId}</span>
                    <span className="ml-auto">
                      {item.error ? <Badge variant="warning">{describeError(item.error)}</Badge> : item.conflict ? <Badge variant="destructive">Conflicto</Badge> : item.changes.length ? <Badge>Se enviará</Badge> : <Badge variant="muted">Sin diferencias</Badge>}
                    </span>
                  </div>
                  {item.changes.map(ch => (
                    <div key={ch.field} className="grid grid-cols-[90px_1fr_auto_1fr] items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">{FIELD_LABEL[ch.field]}</span>
                      <span className="truncate text-rose-200/80 line-through decoration-rose-400/50" title="Valor actual en GHL">{ch.remote ?? '∅'}</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="truncate text-emerald-200" title="Valor local a enviar">{ch.local ?? '∅ (borrar)'}</span>
                    </div>
                  ))}
                  {item.conflict && <p className="text-[11px] text-rose-200/80">{describeError(`CONFLICT_${item.conflict}`)}</p>}
                </li>
              ))}
            </ul>

            {blocked > 0 && (
              <Alert variant="warning">
                <AlertTriangle />
                <div className="grid gap-2">
                  <span>{blocked} contacto(s) cambiaron en GHL desde la última sincronización. Por defecto NO se sobrescriben. Para conservar GHL, reimporta esos contactos con “sobrescribir cambios locales”.</span>
                  {can('admin') ? (
                    <label className="flex items-center gap-2">
                      <Checkbox checked={overwrite} onCheckedChange={v => setOverwrite(v === true)} aria-label="Sobrescribir conflictos" />
                      Sobrescribir GHL con los valores locales (administrador)
                    </label>
                  ) : (
                    <span className="opacity-80">Sólo un administrador puede forzar la sobrescritura.</span>
                  )}
                </div>
              </Alert>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="confirm-export" checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} />
              <Label htmlFor="confirm-export">Confirmo enviar {sendable} contacto(s) a GoHighLevel</Label>
            </div>
            <ErrorAlert error={exportM.error} />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button disabled={!data || !confirmed || sendable === 0 || exportM.isPending} onClick={() => exportM.mutate()}>
              <Send /> {exportM.isPending ? 'Enviando…' : 'Confirmar y enviar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
