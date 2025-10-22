'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function AnalisePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gold glow-gold mb-2">Análise de Negócio</h1>
          <p className="text-muted">Insights e alertas baseados em heurísticas</p>
        </div>

        <Card className="card p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gold mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Módulo em Desenvolvimento</h3>
          <p className="text-muted">
            Esta funcionalidade será implementada em breve. Análise de custos fixos, máquinas ociosas, margens baixas e tendências.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
