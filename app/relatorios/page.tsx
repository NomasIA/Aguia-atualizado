'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, FileText, Calendar, Building2, Users, Wrench, DollarSign } from 'lucide-react';

export default function RelatoriosPage() {
  const [selectedModule, setSelectedModule] = useState<string>('financeiro');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mes-atual');
  const [loading, setLoading] = useState(false);

  const modules = [
    { value: 'financeiro', label: 'Financeiro Geral', icon: DollarSign },
    { value: 'obras', label: 'Obras', icon: Building2 },
    { value: 'maquinarios', label: 'Maquinários', icon: Wrench },
    { value: 'funcionarios', label: 'Funcionários', icon: Users },
  ];

  const periods = [
    { value: 'mes-atual', label: 'Mês Atual' },
    { value: 'mes-anterior', label: 'Mês Anterior' },
    { value: 'trimestre', label: 'Último Trimestre' },
    { value: 'ano', label: 'Ano Atual' },
    { value: 'personalizado', label: 'Período Personalizado' },
  ];

  const getDateRange = (period: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case 'mes-atual':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'mes-anterior':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'trimestre':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = now;
        break;
      case 'ano':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
    }

    return { startDate, endDate };
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(selectedPeriod);

      let data: any[] = [];
      let headers: string[] = [];
      let filename = '';

      switch (selectedModule) {
        case 'financeiro':
          const { data: ledgerData } = await supabase
            .from('cash_ledger')
            .select('*')
            .gte('data', startDate.toISOString())
            .lte('data', endDate.toISOString())
            .order('data', { ascending: false });

          data = ledgerData || [];
          headers = ['Data', 'Tipo', 'Forma', 'Categoria', 'Descrição', 'Valor', 'Obra', 'Meio Banco'];
          filename = 'relatorio_financeiro';
          break;

        case 'obras':
          const { data: obrasData } = await supabase
            .from('obras')
            .select('*')
            .order('data_inicio', { ascending: false });

          data = obrasData || [];
          headers = ['Nome', 'Cliente', 'Data Início', 'Data Fim', 'Valor', 'Status', 'Descrição'];
          filename = 'relatorio_obras';
          break;

        case 'maquinarios':
          const { data: maquinasData } = await supabase
            .from('maquinas')
            .select('*')
            .order('nome');

          data = maquinasData || [];
          headers = ['Nome', 'Marca', 'Modelo', 'Ano', 'Placa', 'Status', 'Valor Hora', 'Descrição'];
          filename = 'relatorio_maquinarios';
          break;

        case 'funcionarios':
          const { data: funcData } = await supabase
            .from('funcionarios')
            .select('*')
            .order('nome');

          data = funcData || [];
          headers = ['Nome', 'CPF', 'Cargo', 'Salário', 'Data Admissão', 'Status', 'Telefone', 'Email'];
          filename = 'relatorio_funcionarios';
          break;
      }

      const csv = [
        headers.join(';'),
        ...data.map(row => {
          return Object.values(row).map(val => {
            if (val === null || val === undefined) return '';
            return String(val).replace(/;/g, ',');
          }).join(';');
        })
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      setLoading(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    alert('Funcionalidade de exportação PDF será implementada em breve. Utilize CSV por enquanto.');
  };

  const handleExportZIP = () => {
    alert('Funcionalidade de exportação ZIP (todos os módulos) será implementada em breve.');
  };

  const selectedModuleData = modules.find(m => m.value === selectedModule);
  const Icon = selectedModuleData?.icon || BarChart3;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gold glow-gold mb-2">Relatórios & Export Center</h1>
          <p className="text-muted">Exporte dados de qualquer módulo em diversos formatos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gold" />
                Configuração do Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Módulo</label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map((module) => {
                      const ModuleIcon = module.icon;
                      return (
                        <SelectItem key={module.value} value={module.value}>
                          <div className="flex items-center">
                            <ModuleIcon className="h-4 w-4 mr-2" />
                            {module.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {period.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2 text-gold" />
                Exportar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleExportCSV}
                disabled={loading}
                className="w-full bg-success hover:bg-success/90"
              >
                <Download className="h-4 w-4 mr-2" />
                {loading ? 'Exportando...' : 'Exportar CSV/Excel'}
              </Button>

              <Button
                onClick={handleExportPDF}
                className="w-full bg-danger hover:bg-danger/90"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>

              <Button
                onClick={handleExportZIP}
                className="w-full bg-info hover:bg-info/90"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Tudo (ZIP)
              </Button>

              <p className="text-xs text-muted mt-4">
                Os relatórios incluirão o logo da empresa e serão formatados profissionalmente.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon className="h-5 w-5 mr-2 text-gold" />
              Pré-visualização: {selectedModuleData?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted mb-1">Período Selecionado</p>
                  <p className="text-lg font-semibold">
                    {periods.find(p => p.value === selectedPeriod)?.label}
                  </p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted mb-1">Formato de Exportação</p>
                  <p className="text-lg font-semibold">CSV, PDF, ZIP</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted mb-1">Status</p>
                  <p className="text-lg font-semibold text-success">Pronto para Exportar</p>
                </div>
              </div>

              <div className="p-6 bg-accent/5 border border-border rounded-lg">
                <h4 className="font-semibold mb-3">Descrição do Relatório</h4>
                <p className="text-sm text-muted">
                  {selectedModule === 'financeiro' && 'Relatório completo de todas as transações financeiras incluindo entradas, saídas, banco e dinheiro.'}
                  {selectedModule === 'obras' && 'Relatório de todas as obras cadastradas com informações de cliente, datas, valores e status.'}
                  {selectedModule === 'maquinarios' && 'Relatório de maquinários incluindo dados técnicos, status e informações de locação.'}
                  {selectedModule === 'funcionarios' && 'Relatório de recursos humanos com dados de funcionários, cargos, salários e status.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
