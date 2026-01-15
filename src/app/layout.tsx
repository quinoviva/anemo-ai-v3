import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { OfflineSyncProvider } from '@/contexts/OfflineSyncContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AnemoCheck AI',
  description: 'Intelligent anemia detection using AI',
  icons: {
    icon: '/favicon.svg',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <OfflineSyncProvider>
                <div className="flex min-h-screen flex-col bg-background text-foreground">
                <main className="flex-1">
                    {children}
                </main>
                <Toaster />
                <FirebaseErrorListener />
                </div>
            </OfflineSyncProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
