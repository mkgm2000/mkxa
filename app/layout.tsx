import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MKXA',
  description: 'Daily life app for MK and Xabi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
