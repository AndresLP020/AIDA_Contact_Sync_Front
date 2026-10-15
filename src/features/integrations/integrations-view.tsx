'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, KeyRound, Link2, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorAlert, PageHeader } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/form-controls';
import { useSession } from '@/hooks/use-session';
import { describeError, OAUTH_OUTCOME } from '@/lib/error-messages';
import { formatDateTime } from '@/lib/utils';
import { ghlApi } from '@/services/endpoints';
import { ProvisioningCard } from './provisioning-card';
import type { GhlStatus } from '@/types';

const STATUS: Record<GhlStatus['status'], { label: string; variant: 'success' | 'warning' | 'destructive' | 'muted' }> = {
  simulated: { label: 'Simulado', variant: 'warning' },
  active: { label: 'Conectado', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  not_connected: { label: 'No conectado', variant: 'muted' },
  revoked: { label: 'Revocado', variant: 'destructive' },
  error: { label: 'Requiere reconexión', variant: 'destructive' },
};

export function IntegrationsView() {
  const qc = useQueryClient();
  const { can } = useSession();
  const [oauthOutcome, setOauthOutcome] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const status = useQuery({ queryKey: ['ghl-status'], queryFn: ghlApi.status });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('oauth');
    if (outcome) {
      setOauthOutcome(outcome);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connect = useMutation({
    mutationFn: ghlApi.startOAuth,
    // La autorización ocurre en GHL (ventana superior: el flujo OAuth no debe ejecutarse dentro del iframe).
    onSuccess: ({ authorizationUrl }) => {
      (window.top ?? window).location.assign(authorizationUrl);
    },
  });
  const disconnect = useMutation({
    mutationFn: ghlApi.disconnect,
    onSuccess: () => {
      setConfirmDisconnect(false);
      toast.success('Integración desconectada. Las credenciales cifradas se eliminaron.');
      void qc.invalidateQueries();
    },
  });

  const s = status.data;
  const outcome = oauthOutcome ? (OAUTH_OUTCOME[oauthOutcome] ?? { ok: false, message: `Resultado OAuth: ${oauthOutcome}` }) : null;
  const missingScopes = s && !s.simulated ? s.requestedScopes.filter(x => !s.scopes.includes(x)) : [];

  return (
    <>
      <PageHeader
        eyebrow="Conexiones"
        title="Integraciones"
        description="Autorización OAuth 2.0 con GoHighLevel y estado de credenciales (nunca se muestran)."
        actions={
          <Button variant="outline" onClick={() => void status.refetch()}>
            <RefreshCw /> Actualizar
          </Button>
        }
      />
      {outcome && (
        <Alert variant={outcome.ok ? 'success' : 'destructive'} className="mb-4" data-testid="oauth-outcome">
          {outcome.message}
        </Alert>
      )}
      <ErrorAlert error={status.error} className="mb-4" />

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-secondary text-lg font-bold text-sky-300">G</div>
          <div className="flex-1">
            <CardTitle>GoHighLevel</CardTitle>
            <CardDescription className="mt-1">OAuth 2.0 · API de Contactos</CardDescription>
          </div>
          {s ? <Badge variant={STATUS[s.status].variant}>{STATUS[s.status].label}</Badge> : <Skeleton className="h-5 w-20" />}
        </CardHeader>
        <CardContent>
          {s?.simulated && (
            <Alert variant="warning" className="mb-4">
              <FlaskConical />
              <span>
                <b>Modo simulado (GHL_MODE=mock).</b> Los datos provienen de un adaptador de prueba; no se contacta a GoHighLevel. La conexión real sólo se considera validada con credenciales autorizadas y una subcuenta de pruebas.
              </span>
            </Alert>
          )}
          <dl className="grid gap-0 text-xs">
            <Item label="Modo" value={s ? (s.simulated ? 'Simulado' : 'API real (services.leadconnectorhq.com)') : '…'} />
            <Item label="Subcuenta vinculada (locationId)" value={<span className="font-mono">{s?.locationId ?? 'No vinculada'}</span>} />
            <Item
              label="Scopes autorizados"
              value={
                <span className="flex flex-wrap justify-end gap-1">
                  {s?.scopes.length ? s.scopes.map(x => <Badge key={x} variant="muted">{x}</Badge>) : '—'}
                </span>
              }
            />
            <Item
              label="Credenciales"
              value={
                <span className="flex items-center gap-1.5 text-emerald-200">
                  <ShieldCheck className="size-3.5" />
                  {s?.simulated ? 'No aplica (simulado)' : s?.credential.present ? 'Cifradas en reposo (AES-256-GCM) · no visibles' : 'No hay credenciales'}
                </span>
              }
            />
            <Item label="Expiración del access token" value={formatDateTime(s?.credential.expiresAt)} />
            <Item label="Rotaciones del token" value={s?.credential.tokenVersion ?? '—'} />
            <Item label="Instalada" value={formatDateTime(s?.installedAt)} />
            <Item label="Última comunicación con GHL" value={formatDateTime(s?.lastCommunicationAt, 'Sin actividad')} />
            <Item label="Último error" value={s?.lastErrorCode ? <span className="text-rose-300">{describeError(s.lastErrorCode)}</span> : 'Ninguno'} />
          </dl>
          {missingScopes.length > 0 && s?.connected && <Alert variant="warning" className="mt-4">Faltan scopes solicitados: {missingScopes.join(', ')}. Reconecta para concederlos.</Alert>}
          <ErrorAlert error={connect.error} className="mt-4" />
        </CardContent>
        <CardFooter>
          {can('admin') ? (
            <>
              <Button disabled={!s || s.simulated || connect.isPending} onClick={() => connect.mutate()}>
                <Link2 /> {connect.isPending ? 'Redirigiendo…' : s?.connected && !s.simulated ? 'Reconectar' : 'Conectar subcuenta GHL'}
              </Button>
              <Button variant="destructive" disabled={!s || s.simulated || !s.credential.present} onClick={() => setConfirmDisconnect(true)}>
                <Unplug /> Desconectar
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Sólo propietarios y administradores pueden conectar o desconectar la integración.</span>
          )}
        </CardFooter>
      </Card>

      <ProvisioningCard />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-sky-300" /> Seguridad de la integración
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
          <p>• El intercambio del código OAuth y la renovación de tokens ocurren sólo en el backend. El Client Secret y los tokens nunca llegan al navegador.</p>
          <p>• El refresh token de GHL es de un solo uso: se rota bajo bloqueo en base de datos para evitar condiciones de carrera.</p>
          <p>• Dentro de GHL (Custom Page) la identidad se valida con el contexto cifrado oficial y el Shared Secret; el locationId de la URL nunca se usa como prueba de identidad.</p>
          <p>• Desinstalar la app en GHL envía un webhook firmado (Ed25519) que revoca la instalación automáticamente.</p>
        </CardContent>
      </Card>

      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Desconectar GoHighLevel?</DialogTitle>
            <DialogDescription>
              Se eliminarán las credenciales cifradas y no podrás sincronizar hasta reconectar. Los contactos locales se conservan. Para retirar el acceso también en GHL, desinstala la app desde la subcuenta.
            </DialogDescription>
          </DialogHeader>
          <ErrorAlert error={disconnect.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisconnect(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
