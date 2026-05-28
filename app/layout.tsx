import type { Metadata } from 'next';
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
