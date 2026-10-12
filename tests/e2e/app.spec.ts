import { expect, type Page, test } from '@playwright/test';
import path from 'node:path';

const PASSWORD = process.env.E2E_PASSWORD ?? 'AidaDemo#2026';

const as = (user: 'demo' | 'sur' | 'viewer') => ({ storageState: path.join(__dirname, '.auth', `${user}.json`) });

/** Abre la app con la sesión guardada por global-setup (evita agotar el rate limit de login). */
async function open(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.getByTestId('active-company')).toBeVisible();
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByTestId('active-company')).toBeVisible();
}

test.describe('Autenticación', () => {
  test('login rechazado muestra un error genérico', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill('demo@aida.test');
    await page.getByLabel('Contraseña').fill('Incorrecta#000');
    await page.getByRole('button', { name: /Entrar/ }).click();
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('validación del formulario en el cliente', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill('no-es-correo');
    await page.getByRole('button', { name: /Entrar/ }).click();
    await expect(page.getByText('Introduce un correo válido')).toBeVisible();
  });

  test('login autorizado abre el dashboard de la empresa', async ({ page }) => {
    await login(page, 'demo@aida.test');
    await expect(page.getByTestId('active-company')).toHaveText('AIDA Demo Norte');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    const cookies = await page.context().cookies();
    const session = cookies.find(c => c.name === 'aida_session');
    expect(session?.httpOnly).toBe(true);
    // El token no es accesible desde JavaScript.
    expect(await page.evaluate(() => document.cookie)).not.toContain('aida_session');
  });

  test('sesión expirada o cerrada redirige al login', async ({ browser }) => {
    const page = await (await browser.newContext(as('demo'))).newPage();
    await open(page);
    await page.context().clearCookies();
    await page.goto('/contacts');
    await expect(page).toHaveURL(/\/login\?expired=1/);
    await expect(page.getByText(/Tu sesión expiró/)).toBeVisible();
  });

  test('cerrar sesión', async ({ browser }) => {
    // Sesión propia (no la compartida): el logout la revoca en el servidor.
    const page = await (await browser.newContext()).newPage();
    await login(page, 'editor@aida.test');
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Flujo completo: importar → editar → vista previa → exportar', () => {
  test.use(as('demo'));
  test('sincronización con el adaptador simulado', async ({ page }) => {
    await open(page);

    // Importación completa (idempotente: repetible sin duplicados).
    await page.getByRole('link', { name: 'Sincronización', exact: true }).click();
    await page.getByRole('button', { name: 'Importar todos' }).click();
    await page.getByRole('button', { name: 'Confirmar importación' }).click();
    await expect(page.getByTestId('job-result')).toBeVisible();

    // Contactos: paginación, búsqueda y filtro.
    await page.getByRole('link', { name: 'Contactos', exact: true }).click();
    await expect(page.getByTestId('pagination-info')).toContainText('36 contactos');
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByTestId('pagination-info')).toContainText('página 2 de 4');

    await page.getByLabel('Ordenar').selectOption('lastName');
    const firstRow = page.locator('tbody tr').first();
    const firstName = (await firstRow.locator('td').nth(1).innerText()).trim();
    await page.getByLabel('Buscar contactos').fill(firstName);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.locator('tbody tr').first()).toContainText(firstName);

    // Editar un contacto: queda pendiente (no se envía a GHL automáticamente).
    const stamp = `E2E-${Date.now().toString().slice(-6)}`;
    await page.locator('tbody tr').first().getByRole('button', { name: /^Editar/ }).click();
    await page.getByLabel('Apellido').fill(stamp);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText(/pendiente de exportar/)).toBeVisible();
    await page.getByLabel('Filtrar por estado').selectOption('pending');
    const row = page.locator('tbody tr', { hasText: stamp });
    await expect(row).toContainText('Pendiente');

    // Exportar: vista previa con el diff exacto → confirmación explícita → resultado.
    await row.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Exportar a GHL' }).click();
    const list = page.getByTestId('export-preview-list');
    await expect(list).toContainText(stamp);
    const send = page.getByRole('button', { name: 'Confirmar y enviar' });
    await expect(send).toBeDisabled();
    await page.getByLabel(/Confirmo enviar 1 contacto/).click();
    await send.click();
    await expect(page.getByRole('heading', { name: 'Resultado de la exportación' })).toBeVisible();
    await expect(page.getByTestId('job-result')).toContainText('Completado');
    await page.getByRole('button', { name: 'Cerrar' }).first().click();

    await page.getByLabel('Filtrar por estado').selectOption('synced');
    await expect(page.locator('tbody tr', { hasText: stamp })).toContainText('Sincronizado');
  });
});

test.describe('Aislamiento y roles', () => {
  test('otra empresa no ve los contactos de AIDA Demo Norte', async ({ browser }) => {
    const page = await (await browser.newContext(as('sur'))).newPage();
    await open(page);
    await expect(page.getByTestId('active-company')).toHaveText('AIDA Demo Sur');
    await page.getByRole('link', { name: 'Contactos', exact: true }).click();
    await expect(page.locator('tbody')).toBeVisible();
    await expect(page.locator('tbody')).not.toContainText('E2E-');
    const ids = await page.locator('tbody tr td:nth-child(6)').allInnerTexts();
    expect(ids.every(id => id.startsWith('mock_22222222'))).toBe(true);
  });

  test('un usuario de sólo lectura no puede editar ni sincronizar', async ({ browser }) => {
    const page = await (await browser.newContext(as('viewer'))).newPage();
    await open(page);
    await page.getByRole('link', { name: 'Contactos', exact: true }).click();
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Editar/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Exportar a GHL' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Sincronización', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Importar todos' })).toBeDisabled();
  });
});

test.describe('Integraciones y diagnóstico', () => {
  test.use(as('demo'));
  test('integración simulada declarada explícitamente y sin secretos', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Integraciones' }).click();
    await expect(page.getByText(/Modo simulado \(GHL_MODE=mock\)/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conectar subcuenta GHL' })).toBeDisabled();
    const html = await page.content();
    expect(html).not.toMatch(/access_token|refresh_token|client_secret/i);
  });

  test('diagnóstico muestra backend, PostgreSQL y Correlation ID', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'Diagnóstico' }).click();
    await expect(page.getByTestId('diag-Backend (API)')).toContainText('Disponible');
    await expect(page.getByTestId('diag-PostgreSQL')).toContainText('Conectado');
    await expect(page.getByTestId('diag-API GoHighLevel')).toContainText('Simulada');
    await expect(page.getByText(/Correlation ID \(diagnóstico\)/)).toBeVisible();
  });
});
