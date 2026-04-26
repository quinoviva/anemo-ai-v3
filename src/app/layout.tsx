import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Anemo',
  description: 'CNN-powered non-invasive anemia screening. Scan your palm, conjunctiva, and nailbed to detect anemia risk in seconds.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Anemo',
  },
  icons: {
    icon: [
      { url: '/anemo.png?v=3', type: 'image/png' },
    ],
    apple: [
      { url: '/anemo.png?v=3', sizes: '180x180', type: 'image/png' },
    ],
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents iOS force zoom and pinch-to-zoom
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/anemo.png" type="image/png" />
      </head>
      <body className={`${spaceGrotesk.variable} font-sans overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <div className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground">
              <main className="flex-1 w-full">
                {children}
              </main>
              <Toaster />
            </div>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}