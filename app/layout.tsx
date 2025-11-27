import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Dashboard Águia - Gestão Financeira',
  description: 'Sistema de gestão financeira para Águia Construções e Reforma',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-inter antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
