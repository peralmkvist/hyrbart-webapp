import type { Metadata, Viewport } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import './responsive.css';
import './designsystem2.css';
import './product2.css';
import './navigation2.css';
import './pages2.css';
import './guide-fixes.css';
import './host-calendar.css';
import './messages.css';
import BottomNav from '@/components/BottomNav';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' });
const mono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Hyrbart',
  description: 'Det du behöver. När du behöver det.',
  manifest: '/manifest.webmanifest?v=4',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
    },
  },
  icons: {
    icon: [{ url: '/hyrbart-h-v2.svg', type: 'image/svg+xml' }],
    shortcut: ['/hyrbart-h-v2.svg'],
    apple: [{ url: '/apple-touch-icon.png?v=4', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Hyrbart' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#fafafa' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv" className={`${inter.variable} ${mono.variable}`} style={{ maxWidth: '100%', overflowX: 'clip' }}>
      <body style={{ maxWidth: '100%', overflowX: 'clip' }}><main>{children}</main><BottomNav /></body>
    </html>
  );
}
