import type { Metadata, Viewport } from 'next';
import { Archivo, Roboto_Mono } from 'next/font/google';
import './globals.css';
import './responsive.css';
import BottomNav from '@/components/BottomNav';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
  display: 'swap',
});

const mono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hyrbart',
  description: 'Det du behöver. När du behöver det.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Hyrbart',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f4f4f1',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="sv"
      className={`${archivo.variable} ${mono.variable}`}
      style={{ maxWidth: '100%', overflowX: 'hidden' }}
    >
      <body style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <main>{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
