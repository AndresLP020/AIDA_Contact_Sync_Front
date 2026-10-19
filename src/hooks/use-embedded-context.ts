'use client';
import { useEffect, useRef, useState } from 'react';
import { authApi } from '@/services/endpoints';

/** Dominios oficiales de HighLevel + NEXT_PUBLIC_GHL_PARENT_ORIGINS (dominios white-label de la agencia). */
const OFFICIAL_SUFFIXES = ['.gohighlevel.com', '.leadconnectorhq.com', '.msgsndr.com', '.aidaworkspace.com'];
const EXTRA = (process.env.NEXT_PUBLIC_GHL_PARENT_ORIGINS ?? '').split(/[\s,]+/).filter(Boolean);

export function isAllowedParentOrigin(origin: string, extra: string[] = EXTRA): boolean {
  try {
    const url = new URL(origin);
    if (extra.includes(url.origin)) return true;
    if (url.protocol !== 'https:') return false;
    return url.hostname === 'app.gohighlevel.com' || OFFICIAL_SUFFIXES.some(s => url.hostname.endsWith(s));
  } catch {
    return false;
  }
}

export function isEmbedded() {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export type HandshakeState = 'idle' | 'waiting' | 'ok' | 'failed';

/**
 * Custom Page de GHL: pide al contenedor el contexto de usuario cifrado (REQUEST_USER_DATA) y lo envía al backend,
 * que lo descifra con el Shared Secret, valida la membresía y emite una sesión propia. El frontend nunca lo descifra.
 */
export function useEmbeddedHandshake(enabled: boolean, onSuccess: () => void, timeoutMs = 8000): { state: HandshakeState; detail: string | null } {
  const [state, setState] = useState<HandshakeState>('idle');
  const [detail, setDetail] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current || !isEmbedded()) return;
    started.current = true;
    setState('waiting');
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', listener);
      window.clearTimeout(timer);
      setState(ok ? 'ok' : 'failed');
      if (ok) onSuccess();
    };
    const listener = (event: MessageEvent) => {
      if (event.source !== window.parent || !isAllowedParentOrigin(event.origin)) return;
      const data = event.data as { message?: string; payload?: unknown } | null;
      if (data?.message !== 'REQUEST_USER_DATA_RESPONSE' || typeof data.payload !== 'string') return;
      authApi.ghlContext(data.payload).then(
        () => finish(true),
        (error: unknown) => {
          setDetail(error instanceof Error ? error.message : null);
          finish(false);
        },
      );
    };
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    window.addEventListener('message', listener);
    // Documentación oficial: el iframe solicita el contexto con postMessage al contenedor.
    window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
  }, [enabled, onSuccess, timeoutMs]);

  return { state, detail };
}
