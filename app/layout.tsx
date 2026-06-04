import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AthleteProvider } from '@/lib/athlete-context';
import { PwaUpdateBanner } from '@/components/feedback/PwaUpdateBanner';

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
  title: 'mkxa — MK ♥ Xabi',
  description: 'App personal de MK y Xabi: comidas, entrenos, mood, gastos.',
  applicationName: 'mkxa',
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
    title: 'mkxa',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  // No static themeColor — MoodGradientBg recreates the <meta> at runtime
  // with the current mood's cardFrom so the iOS status bar tracks the
  // page gradient. A static value here would force iOS to cache a wrong
  // color on first paint that runtime updates can't always override.
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={monaSans.variable}>
      <body className="font-sans antialiased">
        <AthleteProvider>{children}</AthleteProvider>
        <PwaUpdateBanner />
      </body>
    </html>
  );
}
