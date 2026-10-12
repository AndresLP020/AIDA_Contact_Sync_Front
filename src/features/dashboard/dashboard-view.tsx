'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Building2, CheckCircle2, Clock3, ContactRound, Link2, RefreshCw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { EmptyState, ErrorAlert, JobStatusBadge, PageHeader, StatCard } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/hooks/use-session';
import { describeError } from '@/lib/error-messages';
import { formatDateTime } from '@/lib/utils';
import { companyApi, ghlApi, syncApi } from '@/services/endpoints';

export function DashboardView() {
  const { me } = useSession();
  const summary = useQuery({ queryKey: ['summary'], queryFn: companyApi.summary });
  const ghl = useQuery({ queryKey: ['ghl-status'], queryFn: ghlApi.status });
  const jobs = useQuery({ queryKey: ['jobs', { page: 1, limit: 5 }], queryFn: () => syncApi.jobs({ page: 1, limit: 5 }) });
  const s = summary.data;

  const connection = ghl.data ? (ghl.data.simulated ? { label: 'Simulado', variant: 'warning' as const } : ghl.data.connected ? { label: 'Conectado', variant: 'success' as const } : { label: 'Desconectado', variant: 'destructive' as const }) : null;

  return (
    <>
      <PageHeader
        eyebrow="Resumen"
        title="Dashboard"
        description="Estado de la sincronización y actividad de la empresa activa."
        actions={
          <Button asChild>
            <Link href="/sync">
              <RefreshCw /> Nueva sincronización
            </Link>
          </Button>
        }
      />
      <ErrorAlert error={summary.error} className="mb-4" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contactos locales" value={s?.contacts.total ?? 0} foot="Almacenados en PostgreSQL" icon={ContactRound} loading={summary.isLoading} />
        <StatCard label="Contactos sincronizados" value={s?.contacts.synced ?? 0} foot="Alineados con GHL" icon={CheckCircle2} loading={summary.isLoading} />
        <StatCard label="Sincronizaciones pendientes" value={(s?.contacts.pending ?? 0) + (s?.contacts.conflict ?? 0)} foot={`${s?.contacts.conflict ?? 0} en conflicto`} icon={Clock3} loading={summary.isLoading} tone="warning" />
        <StatCard label="Errores recientes" value={s?.jobs.failedLast7Days ?? 0} foot="Trabajos con fallos (7 días)" icon={TriangleAlert} loading={summary.isLoading} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Conexión con GoHighLevel</CardTitle>
            <CardDescription>Empresa activa y estado de la integración</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row icon={<Building2 className="size-4" />} label="Empresa activa" value={me?.company.name ?? '—'} />
            <Row icon={<Link2 className="size-4" />} label="Estado GHL" value={connection ? <Badge variant={connection.variant}>{connection.label}</Badge> : '…'} />
            <Row icon={<Clock3 className="size-4" />} label="Última sincronización" value={s?.lastSync ? <span className="flex items-center gap-2">{formatDateTime(s.lastSync.finishedAt)} <JobStatusBadge status={s.lastSync.status} /></span> : 'Nunca'} />
            {ghl.data?.lastErrorCode && <Alert variant="destructive">{describeError(ghl.data.lastErrorCode)}</Alert>}
            {ghl.data?.simulated && <Alert variant="warning">Modo simulado: los contactos provienen de un adaptador de prueba, no de GoHighLevel.</Alert>}
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/integrations">
                Ver integración <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Últimos trabajos de sincronización</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.data?.items.length ? (
              <ul className="divide-y">
                {jobs.data.items.map(j => (
                  <li key={j.id} className="flex items-center gap-3 py-2.5">
                    {j.direction === 'import' ? <ArrowDownToLine className="size-4 text-violet-300" /> : <ArrowUpFromLine className="size-4 text-violet-300" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">{j.direction === 'import' ? 'Importación' : 'Exportación'}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDateTime(j.createdAt)} · {j.successfulRecords} correctos · {j.failedRecords} con error
                      </div>
                    </div>
                    <JobStatusBadge status={j.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>{jobs.isLoading ? 'Cargando…' : 'Aún no hay sincronizaciones.'}</EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t pt-3 first:border-0 first:pt-0">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-right text-xs">{value}</span>
    </div>
  );
}
