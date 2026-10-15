import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

const monorepoRoot = path.resolve(process.cwd(), '..');
const inMonorepo = existsSync(path.join(monorepoRoot, 'backend', 'package.json'));

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const apiOrigin = new URL(apiUrl).origin;
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Orígenes que pueden incrustar la app en un iframe (Custom Page de GHL). Dominios oficiales de HighLevel
 * + FRAME_ANCESTORS (separados por espacios) para dominios white-label de la agencia.
 */
const frameAncestors = ["'self'", 'https://app.gohighlevel.com', 'https://*.gohighlevel.com', 'https://*.leadconnectorhq.com', 'https://*.msgsndr.com', ...(process.env.FRAME_ANCESTORS ?? '').split(/\s+/).filter(Boolean)];

const csp = [
  "default-src 'self'",
  // Next.js requiere scripts inline para la hidratación; en desarrollo también 'unsafe-eval' (HMR).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isDev ? ' ws: wss:' : ''}`,
  `frame-ancestors ${frameAncestors.join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  // Docker usa el servidor standalone. En Vercel ese modo se omite: la plataforma sirve el build ella misma.
  ...(process.env.VERCEL ? {} : { output: 'standalone' as const }),
  ...(inMonorepo ? { outputFileTracingRoot: monorepoRoot } : {}),
  transpilePackages: ['@aida/contracts'],
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
        ],
      },
    ];
  },
};

export default nextConfig;
