'use client';
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Globe, RefreshCw, Server } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorAlert, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { describeError } from '@/lib/error-messages';
import { formatDateTime } from '@/lib/utils';
import { API_URL, apiTelemetry } from '@/services/api-client';
import { systemApi } from '@/services/endpoints';

type Row = { label: string; icon: typeof Globe; ok: boolean | null; value: string; detail: string };

export function DiagnosticsView() {
  const health = useQuery({ queryKey: ['health'], queryFn: systemApi.health, refetchInterval: 15_000, retry: false });
  const diag = useQuery({ queryKey: ['diagnostics'], queryFn: systemApi.diagnostics, refetchInterval: 30_000, retry: false });
  const [origin, setOrigin] = useState('');
  const [telemetry, setTelemetry] = useState(apiTelemetry.last);
  useEffect(() => {
    setOrigin(window.location.origin);
    return apiTelemetry.subscribe(setTelemetry);
  }, []);

  const d = diag.data;
  const rows: Row[] = [
    { label: 'Frontend', icon: Globe, ok: true, value: 'Operativo', detail: origin },
    { label: 'Backend (API)', icon: Server, ok: health.isLoading ? null : health.data?.status === 'ok', value: health.isLoading ? '…' : health.data ? 'Disponible' : 'Sin respuesta', detail: API_URL },
    {
      label: 'PostgreSQL',
      icon: Database,
      ok: d ? d.database.status === 'ok' : null,
      value: d ? (d.database.status === 'ok' ? `Conectado (${d.database.latencyMs} ms)` : 'Error') : '…',
      detail: 'Red interna; sólo accesible desde el backend',
    },
    {
      label: 'API GoHighLevel',
      icon: Activity,
      ok: d ? (d.ghl.mode === 'mock' ? null : d.ghl.installationStatus === 'active' && !d.ghl.lastErrorCode) : null,
      value: d ? (d.ghl.mode === 'mock' ? 'Simulada' : d.ghl.installationStatus) : '…',
      detail: d ? (d.ghl.mode === 'mock' ? 'Modo mock: no valida conectividad real' : `${d.ghl.apiBase} · Version ${d.ghl.apiVersion} · última comunicación ${formatDateTime(d.ghl.lastCommunicationAt, 'nunca')}`) : '',
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Estado del sistema"
        title="Diagnóstico"
        description="Salud de servicios, último error sanitizado y Correlation ID para soporte."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              void health.refetch();
              void diag.refetch();
            }}
          >
            <RefreshCw /> Actualizar
          </Button>
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(r => (
          <Card key={r.label} className="flex items-center gap-3 p-4" data-testid={`diag-${r.label}`}>
            <div className="grid size-10 place-items-center rounded-lg bg-secondary text-violet-300">
              <r.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{r.label}</div>
              <div className="truncate text-[11px] text-muted-foreground">{r.detail}</div>
            </div>
            <Badge variant={r.ok === null ? 'warning' : r.ok ? 'success' : 'destructive'}>{r.value}</Badge>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Último error</CardTitle>
          <CardDescription>Sólo códigos y mensajes sanitizados: nunca tokens, cuerpos de respuesta de GHL ni datos personales.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs">
          <Line label="Sincronización / GHL" value={d?.lastError ? `${describeError(d.lastError.code)} · ${d.lastError.source} · ${formatDateTime(d.lastError.at)}` : 'Sin errores registrados'} />
          <Line label="Integración GHL" value={d?.ghl.lastErrorCode ? describeError(d.ghl.lastErrorCode) : 'Sin errores'} />
          <Line label="Última solicitud de esta pantalla" value={telemetry?.error ? `${telemetry.error.message} (${telemetry.error.code})` : 'Correcta'} />
          <Line label="Correlation ID (último)" value={<span className="font-mono">{telemetry?.correlationId ?? d?.correlationId ?? '—'}</span>} />
          <Line label="Correlation ID (diagnóstico)" value={<span className="font-mono">{d?.correlationId ?? '—'}</span>} />
          <Line label="Entorno backend" value={d?.backend.environment ?? '—'} />
        </CardContent>
      </Card>
      <ErrorAlert error={diag.error} className="mt-4" />
    </>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-t pt-2 first:border-0 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right">{value}</span>
    </div>
  );
}
