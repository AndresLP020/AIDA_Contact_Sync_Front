import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AIDA Contact Sync',
  description: 'Sincronización controlada de contactos entre GoHighLevel y AIDA Workspace',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#070c16', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
