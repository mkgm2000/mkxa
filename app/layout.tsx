import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AthleteProvider } from '@/lib/athlete-context';

const monaSans = localFont({
  src: [
    { path: '../public/fonts/MonaSans-Regular.woff2',   weight: '400', style: 'normal' },
    { path: '../public/fonts/MonaSans-Medium.woff2',    weight: '500', style: 'normal' },
    { path: '../public/fonts/MonaSans-Bold.woff2',      weight: '700', style: 'normal' },
    { path: '../public/fonts/MonaSans-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-mona',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MKXA',
  description: 'Daily life app for MK and Xabi',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.svg'],
  },
  appleWebApp: {
    capable: true,
    title: 'MKXA',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#87c9ff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={monaSans.variable}>
      <body className="font-sans antialiased">
        <AthleteProvider>{children}</AthleteProvider>
      </body>
    </html>
  );
}
