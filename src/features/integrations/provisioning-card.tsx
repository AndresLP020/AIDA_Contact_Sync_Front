'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCw, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/form-controls';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSession } from '@/hooks/use-session';
import { describeError } from '@/lib/error-messages';
import { formatDateTime } from '@/lib/utils';
import { ghlApi } from '@/services/endpoints';
import type { ConfigurationStatus, ProvisionedResourceStatus } from '@/types';

type Variant = 'success' | 'warning' | 'destructive' | 'muted';

const CONFIG_STATUS: Record<ConfigurationStatus, { label: string; variant: Variant }> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  running: { label: 'En curso', variant: 'warning' },
  ready: { label: 'Lista', variant: 'success' },
  requires_action: { label: 'Requiere acción', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'muted' },
};

const OUTCOME: Record<string, string> = {
  created: 'Creado por la app',
  recreated: 'Recreado (se había eliminado)',
  adopted: 'Adoptado (ya existía)',
  adopted_unmanaged: 'Adoptado · valor no administrado',
  verified: 'Verificado',
  verified_renamed: 'Verificado · renombrado en GHL',
  verified_unmanaged: 'Verificado · valor no administrado',
  updated: 'Valor actualizado',
  reconciled_created: 'Recuperado tras resultado incierto',
  pending_reconciliation: 'Resultado incierto: se reconciliará',
  conflict_incompatible_type: 'Conflicto: tipo incompatible',
  ambiguous_match: 'Conflicto: varias coincidencias',
  ambiguous_unresolved: 'No se pudo confirmar la creación',
  missing_scopes: 'Faltan permisos',
};

function resourceBadge(r: ProvisionedResourceStatus): { label: string; variant: Variant } {
  const step = r.step?.status;
  if (step === 'requires_action' || r.status === 'conflict') return { label: 'Requiere acción', variant: 'destructive' };
  if (step === 'failed') return { label: 'Fallido', variant: 'destructive' };
  if (step === 'ambiguous' || r.status === 'pending_reconciliation') return { label: 'Por reconciliar', variant: 'warning' };
  if (r.status === 'active') return { label: 'Activo', variant: 'success' };
  return { label: step === 'running' ? 'En curso' : 'Pendiente', variant: 'muted' };
}

/**
 * Diagnóstico de la configuración automática de la subcuenta. El estado autoritativo es el de PostgreSQL;
 * el reintento invoca el mismo servicio idempotente (la location sale de la sesión, nunca de este componente).
 */
export function ProvisioningCard() {
  const qc = useQueryClient();
  const { can } = useSession();
  const status = useQuery({
    queryKey: ['ghl-provisioning'],
    queryFn: ghlApi.provisioning,
    refetchInterval: q => (q.state.data?.configurationStatus === 'pending' || q.state.data?.configurationStatus === 'running' ? 5_000 : false),
  });
  const retry = useMutation({
    mutationFn: ghlApi.retryProvisioning,
    onSuccess: r => {
      toast.success(r.alreadyActive ? 'Ya hay una configuración en curso; se reutilizó.' : 'Configuración reprogramada.');
      void qc.invalidateQueries({ queryKey: ['ghl-provisioning'] });
    },
  });

  const s = status.data;
  if (s?.simulated) return null;
  const config = s?.configurationStatus ? CONFIG_STATUS[s.configurationStatus] : null;
  const busy = s?.configurationStatus === 'pending' || s?.configurationStatus === 'running';

  return (
    <Card className="mt-4" data-testid="provisioning-card">
      <CardHeader className="flex-row items-center gap-3">
        <Settings2 className="size-5 text-sky-300" />
        <div className="flex-1">
          <CardTitle>Configuración automática</CardTitle>
          <CardDescription className="mt-1">Campos y valores personalizados de AIDA en la subcuenta · manifiesto v{s?.manifestVersion ?? '—'}</CardDescription>
        </div>
        {status.isLoading ? <Skeleton className="h-5 w-20" /> : config ? <Badge variant={config.variant}>{config.label}</Badge> : <Badge variant="muted">Sin instalación</Badge>}
      </CardHeader>
      <CardContent>
        <ErrorAlert error={status.error} className="mb-4" />
        {s && !s.installation && <p className="text-xs text-muted-foreground">Conecta o instala la app en una subcuenta para iniciar la configuración.</p>}
        {s?.installation && (
          <>
            <dl className="grid gap-0 text-xs">
              <Item label="Subcuenta autorizada (locationId)" value={<span className="font-mono">{s.installation.locationId}</span>} />
              <Item label="Estado de instalación" value={s.installation.status} />
              <Item label="Último intento" value={formatDateTime(s.execution?.lastAttemptAt, 'Sin intentos')} />
              <Item label="Intentos" value={s.execution ? `${s.execution.attempts} / ${s.execution.maxAttempts}` : '—'} />
              {busy && s.execution && <Item label="Próximo intento" value={formatDateTime(s.execution.nextAttemptAt)} />}
              <Item label="Último error" value={s.execution?.lastErrorCode ? <span className="text-rose-300">{describeError(s.execution.lastErrorCode)}</span> : 'Ninguno'} />
            </dl>
            {s.missingScopes.length > 0 && (
              <Alert variant="warning" className="mt-4">
                Faltan permisos de configuración: {s.missingScopes.join(', ')}. Renovar el token no los concede: un administrador debe autorizar nuevamente la integración con estos scopes. La sincronización de contactos sigue disponible.
              </Alert>
            )}
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.resources.map(r => {
                  const b = resourceBadge(r);
                  const outcome = r.step?.outcome ? (OUTCOME[r.step.outcome] ?? r.step.outcome) : '—';
                  return (
                    <TableRow key={r.resourceKey}>
                      <TableCell>
                        <div className="font-medium">{r.displayName}</div>
                        {r.remoteName && r.remoteName !== r.displayName && <div className="text-xs text-muted-foreground">En GHL: {r.remoteName}</div>}
                      </TableCell>
                      <TableCell className="text-xs">{r.resourceType === 'custom_field' ? 'Campo de contacto' : 'Custom Value'}</TableCell>
                      <TableCell className="text-xs">
                        {outcome}
                        {r.step?.errorCode && <div className="text-rose-300">{describeError(r.step.errorCode)}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={b.variant}>{b.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
        <ErrorAlert error={retry.error} className="mt-4" />
      </CardContent>
      <CardFooter>
        {can('admin') ? (
          <Button variant="outline" disabled={!s?.canRetry || busy || retry.isPending} onClick={() => retry.mutate()}>
            <RotateCw /> {retry.isPending ? 'Reprogramando…' : 'Reintentar configuración'}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Sólo propietarios y administradores pueden reintentar la configuración.</span>
        )}
      </CardFooter>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-t py-2.5 first:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
