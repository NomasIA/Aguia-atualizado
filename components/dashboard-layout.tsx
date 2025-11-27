'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Wrench,
  Building2,
  Wallet,
  FileCheck,
  BarChart3,
  Settings,
  LogOut,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/entradas-saidas', label: 'Entradas & Saídas', icon: ArrowLeftRight },
  { href: '/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/maquinarios', label: 'Maquinário', icon: Wrench },
  { href: '/obras', label: 'Obras', icon: Building2 },
  { href: '/caixa', label: 'Caixa & Banco', icon: Wallet },
  { href: '/conciliacao', label: 'Conciliação', icon: FileCheck },
  { href: '/custos-fixos', label: 'Custos Fixos', icon: DollarSign },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/analise', label: 'Análise', icon: TrendingUp },
  { href: '/config', label: 'Configurações', icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-blue-600 text-lg font-semibold">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-blue-600">Dashboard Águia</h1>
          <p className="text-xs text-slate-600 mt-1">Gestão Financeira</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          {user ? (
            <>
              <div className="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Conectado como</p>
                <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
              </div>
              <Button
                onClick={signOut}
                variant="outline"
                className="w-full btn-secondary"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="default" className="w-full btn-primary">
                Fazer Login
              </Button>
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
