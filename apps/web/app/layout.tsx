import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/components/providers/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: { default: 'CineNova — Where every seat tells a story', template: '%s · CineNova' },
  description:
    'CineNova is a modern cinema booking platform with realtime seat selection, smart recommendations, and an AI movie assistant.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  applicationName: 'CineNova',
  authors: [{ name: 'dellacee' }],
  openGraph: {
    type: 'website',
    siteName: 'CineNova',
    title: 'CineNova — Where every seat tells a story',
    description: 'Cinema booking, reimagined.',
  },
  twitter: { card: 'summary_large_image', title: 'CineNova' },
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="bg-background min-h-screen font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <QueryProvider>
            {children}
            <Toaster richColors position="top-center" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
