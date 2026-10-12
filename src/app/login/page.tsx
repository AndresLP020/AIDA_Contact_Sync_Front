'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorAlert } from '@/components/common';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/form-controls';
import { type LoginForm, loginSchema } from '@/lib/schemas';
import { authApi } from '@/services/endpoints';


function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  async function submit(values: LoginForm) {
    setError(null);
    try {
      await authApi.login(values.email, values.password);
      qc.clear();
      router.replace('/');
    } catch (e) {
      setError(e);
    }
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="w-full max-w-[410px] rounded-2xl border bg-card p-8 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-700 font-extrabold text-white">A</div>
          <div>
            <div className="text-sm font-semibold tracking-wide">AIDA WORKSPACE</div>
            <div className="text-[11px] text-muted-foreground">CONTACT SYNC</div>
          </div>
        </div>
        <h1 className="mt-6 text-xl font-semibold">Iniciar sesión</h1>
        <p className="mb-5 mt-2 text-xs leading-relaxed text-muted-foreground">Administra y sincroniza contactos entre tu base de datos y GoHighLevel.</p>

        {params.get('expired') && (
          <Alert variant="warning" className="mb-4">
            <Clock />
            <span>Tu sesión expiró o fue cerrada. Vuelve a iniciar sesión.</span>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(submit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="username" aria-invalid={!!errors.email} {...form.register('email')} />
            {errors.email && <p className="text-[11px] text-rose-300">{errors.email.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...form.register('password')} />
            {errors.password && <p className="text-[11px] text-rose-300">{errors.password.message}</p>}
          </div>
          <ErrorAlert error={error} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Verificando…' : (
              <>
                Entrar <ArrowRight />
              </>
            )}
          </Button>
        </form>

        {process.env.NEXT_PUBLIC_SHOW_DEMO_HINT === 'true' && (
          <Alert className="mt-5">
            <ShieldCheck />
            <span>
              Entorno local: usuarios ficticios <code>demo@aida.test</code> (owner), <code>editor@aida.test</code>, <code>viewer@aida.test</code>, <code>sur@aida.test</code> (otra empresa). Contraseña: la definida en <code>SEED_DEMO_PASSWORD</code>.
            </span>
          </Alert>
        )}
        <p className="mt-5 text-[11px] text-muted-foreground">La sesión dura poco y se guarda en una cookie HttpOnly; el navegador nunca recibe tokens de GHL.</p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
