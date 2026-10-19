import { expect, type Page, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';

/**
 * Renderizado dentro de iframe (Custom Page de GHL). Se simula la página contenedora interceptando su URL.
 * Chromium bloquea que un origen público cargue localhost (Private Network Access), así que el host
 * "autorizado" es un origen loopback distinto incluido en FRAME_ANCESTORS sólo en el .env local:
 *  - http://127.0.0.1:3999 → permitido (equivale a app.gohighlevel.com en producción).
 *  - http://127.0.0.1:3998 → no autorizado: bloqueado por CSP frame-ancestors.
 * La presencia de los dominios oficiales de GHL en frame-ancestors se verifica sobre el encabezado.
 */
const APP = process.env.E2E_BASE_URL ?? 'http://localhost:3100';
const ALLOWED_HOST = process.env.E2E_FRAME_HOST ?? 'http://127.0.0.1:3999';
const BLOCKED_HOST = 'http://127.0.0.1:3998'; // otro puerto = otro origen, no incluido en FRAME_ANCESTORS

test('la CSP autoriza los dominios oficiales de GHL como frame-ancestors', async ({ request }) => {
  const res = await request.get(`${APP}/login`);
  const csp = res.headers()['content-security-policy'];
  expect(csp).toMatch(/frame-ancestors[^;]*https:\/\/app\.gohighlevel\.com/);
  expect(csp).toMatch(/frame-ancestors[^;]*https:\/\/\*\.leadconnectorhq\.com/);
  expect(res.headers()['x-frame-options']).toBeUndefined();
});

const hostHtml = (path: string) => `<!doctype html><html><body>
  <iframe id="app" src="${APP}${path}" style="width:1200px;height:800px"></iframe>
  <script>
    window.received = [];
    window.addEventListener('message', e => {
      window.received.push(e.data);
      // Responde como GHL con un payload que el backend NO puede descifrar (sin shared secret válido).
      if (e.data && e.data.message === 'REQUEST_USER_DATA') {
        e.source.postMessage({ message: 'REQUEST_USER_DATA_RESPONSE', payload: 'U2FsdGVkX1-payload-invalido-de-prueba-0000000000' }, '*');
      }
    });
  </script></body></html>`;

/** Páginas contenedoras reales (Chromium bloquea iframes a localhost desde respuestas sin dirección de red). */
const servers: Server[] = [];
test.beforeAll(async () => {
  for (const origin of [ALLOWED_HOST, BLOCKED_HOST]) {
    const url = new URL(origin);
    const server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(hostHtml(new URL(req.url ?? '/', origin).searchParams.get('path') ?? '/login'));
    });
    await new Promise<void>(resolve => server.listen(Number(url.port), url.hostname, resolve));
    servers.push(server);
  }
});
test.afterAll(() => servers.forEach(s => s.close()));

async function host(page: Page, origin: string, path: string) {
  await page.goto(`${origin}/host?path=${encodeURIComponent(path)}`);
}

test('se renderiza dentro de un iframe de un origen autorizado', async ({ page }) => {
  await host(page, ALLOWED_HOST, '/login');
  const frame = page.frameLocator('#app');
  await expect(frame.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('un dominio no autorizado no puede incrustar la app (frame-ancestors)', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', m => m.text().includes('frame-ancestors') && violations.push(m.text()));
  await host(page, BLOCKED_HOST, '/login');
  const frame = page.frameLocator('#app');
  await expect(frame.getByRole('heading', { name: 'Iniciar sesión' })).toHaveCount(0, { timeout: 5000 });
  expect(violations.length).toBeGreaterThan(0);
});

test('dentro de GHL solicita el contexto firmado y rechaza un contexto inválido', async ({ page }) => {
  await host(page, ALLOWED_HOST, '/');
  const frame = page.frameLocator('#app');
  await expect.poll(() => page.evaluate(() => (window as unknown as { received: { message?: string }[] }).received.map(m => m.message))).toContain('REQUEST_USER_DATA');
  // El backend rechaza el payload (no hay sesión ni shared secret válido) y la app no concede acceso.
  await expect(frame.getByText(/No se pudo validar el usuario de esta subcuenta/)).toBeVisible({ timeout: 15_000 });
  await expect(frame.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
});
