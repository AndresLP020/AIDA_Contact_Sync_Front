import { request } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/** Inicia sesión una vez por usuario (vía API, con Origin válido) y guarda la cookie para reutilizarla. */
export const AUTH_DIR = path.join(__dirname, '.auth');
export const USERS = ['demo', 'sur', 'viewer'] as const;

export default async function globalSetup() {
  const app = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
  const api = process.env.E2E_API_URL ?? 'http://localhost:4100/api/v1';
  mkdirSync(AUTH_DIR, { recursive: true });
  for (const user of USERS) {
    const ctx = await request.newContext({ extraHTTPHeaders: { Origin: app } });
    const res = await ctx.post(`${api}/auth/login`, { data: { email: `${user}@aida.test`, password: process.env.E2E_PASSWORD ?? 'AidaDemo#2026' } });
    if (!res.ok()) throw new Error(`No se pudo iniciar sesión como ${user}: ${res.status()} ${await res.text()}`);
    await ctx.storageState({ path: path.join(AUTH_DIR, `${user}.json`) });
    await ctx.dispose();
  }
}
