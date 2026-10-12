import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, apiTelemetry, post } from '@/services/api-client';

afterEach(() => vi.unstubAllGlobals());
const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

describe('Cliente de la API propia', () => {
  it('envía la cookie de sesión (credentials: include) y JSON; nunca un Authorization con tokens', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { status: 'ok' }, { 'x-correlation-id': 'corr-123456' }));
    vi.stubGlobal('fetch', fetch);
    await expect(api('/health')).resolves.toEqual({ status: 'ok' });
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
    expect(apiTelemetry.last?.correlationId).toBe('corr-123456');
  });

  it('envía Idempotency-Key en operaciones de sincronización', async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal('fetch', fetch);
    await post('/sync/import', {}, 'key-12345678');
    expect((fetch.mock.calls[0][1].headers as Record<string, string>)['idempotency-key']).toBe('key-12345678');
  });

  it('convierte errores en ApiError con código, mensaje en español y Correlation ID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(409, { statusCode: 409, code: 'SYNC_IN_PROGRESS', message: 'x', correlationId: 'c-987654321' })));
    const err = (await api('/sync/import').catch(e => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('SYNC_IN_PROGRESS');
    expect(err.message).toBe('Ya hay una sincronización en curso para esta empresa.');
    expect(err.correlationId).toBe('c-987654321');
    expect(apiTelemetry.last?.error?.code).toBe('SYNC_IN_PROGRESS');
  });

  it('sesión expirada → ApiError 401 SESSION_INVALID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { code: 'SESSION_INVALID', message: 'Sesión inválida' })));
    await expect(api('/contacts')).rejects.toMatchObject({ status: 401, code: 'SESSION_INVALID' });
  });

  it('backend caído → NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/health')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
