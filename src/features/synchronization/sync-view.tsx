'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpFromLine, ListChecks, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorAlert, JobStatusBadge, PageHeader, TableSkeleton } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/form-controls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/hooks/use-session';
import { describeError } from '@/lib/error-messages';
import { formatDateTime, newIdempotencyKey } from '@/lib/utils';
import { contactsApi, syncApi } from '@/services/endpoints';
import type { SyncJobDetail } from '@/types';
import { ExportPreviewDialog } from './export-preview-dialog';
import { JobResult } from './job-result';
import { RemotePickerDialog } from './remote-picker-dialog';

export function SyncView() {
  const qc = useQueryClient();
  const { can } = useSession();
  const [confirmImport, setConfirmImport] = useState(false);
  const [overwriteLocal, setOverwriteLocal] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exportIds, setExportIds] = useState<string[] | null>(null);
  const [lastResult, setLastResult] = useState<SyncJobDetail | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const pending = useQuery({ queryKey: ['contacts', { status: 'pending', limit: 50 }], queryFn: () => contactsApi.list({ status: 'pending', limit: 50 }) });
  const conflicts = useQuery({ queryKey: ['contacts', { status: 'conflict', limit: 50 }], queryFn: () => contactsApi.list({ status: 'conflict', limit: 50 }) });
  const jobs = useQuery({ queryKey: ['jobs', { page, limit: 10 }], queryFn: () => syncApi.jobs({ page, limit: 10 }), placeholderData: keepPreviousData });
  const jobDetail = useQuery({ queryKey: ['job', jobId], queryFn: () => syncApi.job(jobId!), enabled: !!jobId });

  const importM = useMutation({
    mutationFn: (vars: { ghlContactIds?: string[]; overwriteLocalChanges?: boolean }) => syncApi.import(vars, newIdempotencyKey()),
    onSuccess: job => {
      setLastResult(job);
      setConfirmImport(false);
      setPickerOpen(false);
      setOverwriteLocal(false);
      void qc.invalidateQueries();
      if (job.status === 'completed') toast.success(`Importación completada: ${job.successfulRecords} contacto(s).`);
      else toast.warning(`Importación ${job.status === 'failed' ? 'fallida' : 'parcial'}: ${describeError(job.errorCode, 'revisa el detalle')}`);
    },
  });

  const exportable = [...(pending.data?.items ?? []), ...(conflicts.data?.items ?? [])].map(c => c.id).slice(0, 50);
  const canWrite = can('editor');

  return (
    <>
      <PageHeader
        eyebrow="Operaciones"
        title="Sincronización"
        description="Importaciones y exportaciones manuales, siempre explícitas. No hay sincronización automática."
        actions={
          <Button variant="outline" onClick={() => void qc.invalidateQueries()}>
            <RefreshCw /> Actualizar
          </Button>
        }
      />
      {!canWrite && <Alert className="mb-4">Tu rol es de sólo lectura: puedes consultar el historial pero no ejecutar sincronizaciones.</Alert>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="size-4 text-sky-300" /> Importar desde GoHighLevel
            </CardTitle>
            <CardDescription>Crea o actualiza contactos locales por ID GHL. Los contactos con cambios locales pendientes no se sobrescriben.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button disabled={!canWrite || importM.isPending} onClick={() => setConfirmImport(true)}>
              <ArrowDownToLine /> Importar todos
            </Button>
            <Button variant="secondary" disabled={!canWrite} onClick={() => setPickerOpen(true)}>
              <ListChecks /> Elegir contactos
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="size-4 text-sky-300" /> Exportar cambios a GoHighLevel
            </CardTitle>
            <CardDescription>
              {pending.data?.total ?? 0} pendiente(s) y {conflicts.data?.total ?? 0} en conflicto. Se muestra una vista previa con las diferencias antes de enviar.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button disabled={!canWrite || exportable.length === 0} onClick={() => setExportIds(exportable)}>
              <ArrowUpFromLine /> Revisar y exportar ({exportable.length})
            </Button>
          </CardFooter>
        </Card>
      </div>

      <ErrorAlert error={importM.error} className="mt-4" />
      {lastResult && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Resultado de la última operación</CardTitle>
          </CardHeader>
          <CardContent>
            <JobResult job={lastResult} onlyFailures />
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 overflow-hidden">
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Trabajos de sincronización de esta empresa</CardDescription>
        </CardHeader>
        {jobs.isLoading ? (
          <TableSkeleton />
        ) : jobs.data?.items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Correctos</TableHead>
                <TableHead>Errores</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.data.items.map(j => (
                <TableRow key={j.id}>
                  <TableCell>{formatDateTime(j.createdAt)}</TableCell>
                  <TableCell>{j.direction === 'import' ? 'GHL → PostgreSQL' : 'PostgreSQL → GHL'}</TableCell>
                  <TableCell>
                    <JobStatusBadge status={j.status} />
                  </TableCell>
                  <TableCell>
                    {j.successfulRecords}/{j.totalRecords}
                  </TableCell>
                  <TableCell>{j.errorCode ? describeError(j.errorCode) : j.failedRecords}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setJobId(j.id)}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState>Todavía no hay trabajos.</EmptyState>
        )}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            {jobs.data?.total ?? 0} trabajos · página {jobs.data?.page ?? 1} de {jobs.data?.pages ?? 1}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ArrowLeft /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= (jobs.data?.pages ?? 1)} onClick={() => setPage(p => p + 1)}>
              Siguiente <ArrowRight />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={confirmImport} onOpenChange={setConfirmImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Importar todos los contactos?</DialogTitle>
            <DialogDescription>Se leerán los contactos de la subcuenta conectada y se guardarán en PostgreSQL. La operación es repetible sin crear duplicados.</DialogDescription>
          </DialogHeader>
          {can('admin') && (
            <label className="flex items-start gap-2 text-xs">
              <Checkbox checked={overwriteLocal} onCheckedChange={v => setOverwriteLocal(v === true)} className="mt-0.5" />
              <span>
                <b>Sobrescribir cambios locales pendientes</b> con los valores de GHL (resuelve conflictos conservando GHL). Sólo administradores.
              </span>
            </label>
          )}
          <ErrorAlert error={importM.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmImport(false)}>
              Cancelar
            </Button>
            <Button disabled={importM.isPending} onClick={() => importM.mutate({ overwriteLocalChanges: overwriteLocal || undefined })}>
              {importM.isPending ? 'Importando…' : 'Confirmar importación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RemotePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} importing={importM.isPending} onImport={ids => importM.mutate({ ghlContactIds: ids })} />
      <ExportPreviewDialog open={!!exportIds} contactIds={exportIds ?? []} onOpenChange={o => !o && setExportIds(null)} />

      <Dialog open={!!jobId} onOpenChange={o => !o && setJobId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del trabajo</DialogTitle>
            <DialogDescription className="font-mono">{jobId}</DialogDescription>
          </DialogHeader>
          {jobDetail.data ? <JobResult job={jobDetail.data} /> : <TableSkeleton rows={3} />}
          <ErrorAlert error={jobDetail.error} />
        </DialogContent>
      </Dialog>
    </>
  );
}
