import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra el stack levantado (docker compose up) en modo GHL simulado.
 * E2E_BASE_URL / E2E_API_URL / E2E_PASSWORD permiten apuntar a otros puertos o contraseñas de seed.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
    locale: 'es-MX',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
