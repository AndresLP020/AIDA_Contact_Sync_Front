import type { ApiErrorBody } from '@/types';
import { describeError } from '@/lib/error-messages';

/**
 * URL pública del backend tal como la ve el NAVEGADOR. No se usan nombres internos de Docker.
 * El frontend consume exclusivamente endpoints públicos del backend; nunca llama a GHL directamente.
 * Si el build de Vercel no recibió NEXT_PUBLIC_API_URL, en *.vercel.app se usa la API de Render.
 */
const PRODUCTION_API_URL = 'https://aida-contact-sync-back.onrender.com/api/v1';
const configured = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
export const API_URL =
  configured.includes('localhost') && typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
    ? PRODUCTION_API_URL
    : configured;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly correlationId: string | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Listener = (info: { correlationId: string | null; error: ApiError | null; at: Date }) => void;
const listeners = new Set<Listener>();
let last: { correlationId: string | null; error: ApiError | null; at: Date } | null = null;

/** Último Correlation ID / error sanitizado observado (pantalla de Diagnóstico). */
export const apiTelemetry = {
  get last() {
    return last;
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};
function report(correlationId: string | null, error: ApiError | null) {
  last = { correlationId, error, at: new Date() };
  listeners.forEach(l => l(last!));
}

export async function api<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const { idempotencyKey, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include', // cookie HttpOnly de sesión; el frontend nunca lee tokens
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}), ...(headers ?? {}) },
    });
  } catch {
    const error = new ApiError(0, 'NETWORK_ERROR', describeError('NETWORK_ERROR'), null);
    report(null, error);
    throw error;
  }
  const correlationId = response.headers.get('x-correlation-id');
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<ApiErrorBody>;
    const code = body.code ?? `HTTP_${response.status}`;
    const error = new ApiError(response.status, code, describeError(code, body.message), body.correlationId ?? correlationId);
    report(error.correlationId, error);
    throw error;
  }
  report(correlationId, null);
  return (await response.json()) as T;
}

export const post = <T>(path: string, body: unknown = {}, idempotencyKey?: string) => api<T>(path, { method: 'POST', body: JSON.stringify(body), idempotencyKey });
export const patch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
