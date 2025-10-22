'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card } from '@/components/ui/card';
import { FileCheck } from 'lucide-react';

export default function ConciliacaoPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gold glow-gold mb-2">Conciliação Bancária</h1>
          <p className="text-muted">Conciliação de extratos do Itaú com lançamentos do sistema</p>
        </div>

        <Card className="card p-12 text-center">
          <FileCheck className="w-16 h-16 text-gold mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Módulo em Desenvolvimento</h3>
          <p className="text-muted">
            Esta funcionalidade será implementada em breve. Importação de extratos, matching automático e exportação apenas com 100% de conciliação.
          </p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
