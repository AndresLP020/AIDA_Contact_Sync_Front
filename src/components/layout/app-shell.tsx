'use client';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeftRight, Blocks, ContactRound, LayoutDashboard, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/form-controls';
import { isEmbedded, useEmbeddedHandshake } from '@/hooks/use-embedded-context';
import { SESSION_KEY, useSession } from '@/hooks/use-session';
import { ROLE_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { authApi } from '@/services/endpoints';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contactos', icon: ContactRound },
  { href: '/sync', label: 'Sincronización', icon: ArrowLeftRight },
  { href: '/integrations', label: 'Integraciones', icon: Blocks },
  { href: '/diagnostics', label: 'Diagnóstico', icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const session = useSession();
  // Se detecta en el cliente (tras montar) para no generar diferencias de hidratación con el HTML del servidor.
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => setEmbedded(isEmbedded()), []);

  const onHandshake = useCallback(() => void qc.invalidateQueries({ queryKey: SESSION_KEY }), [qc]);
  const handshake = useEmbeddedHandshake(session.unauthenticated && embedded, onHandshake);

  useEffect(() => {
    if (session.unauthenticated && !isEmbedded()) router.replace('/login?expired=1');
  }, [session.unauthenticated, router]);

  async function logout() {
    await authApi.logout().catch(() => undefined);
    qc.clear();
    router.replace('/login');
  }

  if (!session.me) {
    if (embedded && handshake === 'failed') {
      return (
        <div className="grid min-h-screen place-items-center p-4">
          <Alert variant="warning" className="max-w-md">
            <ShieldAlert />
            <div>
              No se pudo validar tu usuario de GoHighLevel. Pide a un administrador que vincule tu usuario a esta empresa, o
              <Link className="ml-1 underline" href="/login">
                inicia sesión manualmente
              </Link>
              .
            </div>
          </Alert>
        </div>
      );
    }
    return (
      <div className="grid min-h-screen place-items-center p-4" aria-busy="true">
        <div className="w-64 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <p className="text-xs text-muted-foreground">{embedded ? 'Validando contexto de GoHighLevel…' : 'Verificando sesión…'}</p>
        </div>
      </div>
    );
  }

  const current = NAV.find(n => n.href === path)?.label ?? 'Dashboard';
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r bg-sidebar px-2 py-5 md:w-60 md:px-3.5">
        <div className="mb-8 flex items-center gap-3 px-1 md:px-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-700 font-extrabold text-white">A</div>
          <div className="hidden md:block">
            <div className="text-sm font-semibold tracking-wide">AIDA WORKSPACE</div>
            <div className="text-[11px] text-muted-foreground">CONTACT SYNC</div>
          </div>
        </div>
        <nav className="grid gap-1" aria-label="Principal">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-[#a7a3b4] transition-colors hover:bg-[#211936] hover:text-white md:justify-start',
                path === href && 'bg-[#211936] text-white shadow-[inset_2px_0_var(--primary)]',
              )}
            >
              <Icon className="size-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t pt-4 md:block">
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <div className="grid size-8 place-items-center rounded-full bg-[#2a2040] text-xs text-violet-300">{session.me.user.displayName.slice(0, 1)}</div>
            <div className="min-w-0">
              <div className="truncate text-xs">{session.me.user.displayName}</div>
              <div className="text-[10px] text-muted-foreground">{ROLE_LABEL[session.me.role]}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={logout}>
            <LogOut /> Cerrar sesión
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="mt-auto md:hidden" onClick={logout} aria-label="Cerrar sesión">
          <LogOut />
        </Button>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between gap-3 border-b px-4 md:px-9">
          <span className="truncate text-xs text-muted-foreground">
            Workspace / <b className="text-[#e8e3f1]">{current}</b>
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {embedded && <Badge variant="muted">En GHL</Badge>}
            <span className="truncate" data-testid="active-company">
              {session.me.company.name}
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 py-7 md:px-9">{children}</div>
      </main>
    </div>
  );
}
