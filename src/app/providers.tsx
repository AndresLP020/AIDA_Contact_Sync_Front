'use client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { SESSION_KEY } from '@/hooks/use-session';
import { ApiError } from '@/services/api-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    // Un 401 en cualquier consulta invalida la sesión: el AppShell redirige a /login (o reintenta el contexto GHL).
    const onError = (error: unknown) => {
      if (error instanceof ApiError && error.status === 401 && !(error.code === 'INVALID_CREDENTIALS')) {
        void qc.invalidateQueries({ queryKey: SESSION_KEY });
      }
    };
    const qc: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError: (e, query) => query.queryKey[0] !== SESSION_KEY[0] && onError(e) }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: { retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 1, refetchOnWindowFocus: false },
      },
    });
    return qc;
  });
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  );
}
