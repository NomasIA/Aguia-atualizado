'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function RelatoriosPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gold glow-gold mb-2">Relatórios & Export Center</h1>
          <p className="text-muted">Exportação de relatórios em XLSX, PDF e ZIP</p>
        </div>

        <Card className="card p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gold mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Módulo em Desenvolvimento</h3>
          <p className="text-muted">
            Esta funcionalidade será implementada em breve. Relatórios por módulo e exportação consolidada com logo da empresa.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
