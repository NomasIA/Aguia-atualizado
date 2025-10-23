'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, FileText, Calendar, Building2, Users, Wrench, DollarSign, FileSpreadsheet } from 'lucide-react';
import { generateExcelReport, generateMultiSheetExcelReport } from '@/lib/excel-utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function RelatoriosPage() {
  const [selectedModule, setSelectedModule] = useState<string>('financeiro');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('mes-atual');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const handleExportMensalistas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('funcionarios_mensalistas')
        .select('*')
        .order('nome');

      if (error) throw error;

      const reportData = (data || []).map((func: any) => ({
        nome: func.nome || '',
        funcao: func.funcao || '',
        salario_base: func.salario_base || 0,
        ajuda_custo: func.ajuda_custo || 0,
        encargos: func.encargos || 0,
        vt: func.vt || 0,
        custo_total: (func.salario_base || 0) + (func.ajuda_custo || 0) + (func.encargos || 0) + (func.vt || 0),
        obra: func.obra || '',
        ativo: func.ativo ? 'Sim' : 'Não',
      }));

      const totalSalarios = reportData.reduce((sum, r) => sum + r.salario_base, 0);
      const totalAjudas = reportData.reduce((sum, r) => sum + r.ajuda_custo, 0);
      const totalEncargos = reportData.reduce((sum, r) => sum + r.encargos, 0);
      const totalVT = reportData.reduce((sum, r) => sum + r.vt, 0);
      const totalGeral = reportData.reduce((sum, r) => sum + r.custo_total, 0);

      generateExcelReport({
        title: 'Relatório de Mensalistas',
        period: format(new Date(), 'MMMM/yyyy'),
        columns: [
          { header: 'Nome', key: 'nome', width: 25 },
          { header: 'Função', key: 'funcao', width: 20 },
          { header: 'Salário Base', key: 'salario_base', width: 15, format: 'currency' },
          { header: 'Ajuda de Custo', key: 'ajuda_custo', width: 15, format: 'currency' },
          { header: 'Encargos (R$)', key: 'encargos', width: 15, format: 'currency' },
          { header: 'VT (R$)', key: 'vt', width: 12, format: 'currency' },
          { header: 'Custo Total (R$)', key: 'custo_total', width: 15, format: 'currency' },
          { header: 'Obra', key: 'obra', width: 20 },
          { header: 'Ativo', key: 'ativo', width: 10 },
        ],
        data: reportData,
        filename: 'relatorio-mensalistas',
        totals: {
          nome: 'TOTAL',
          salario_base: totalSalarios,
          ajuda_custo: totalAjudas,
          encargos: totalEncargos,
          vt: totalVT,
          custo_total: totalGeral,
        },
      });

      toast({ title: 'Sucesso', description: 'Relatório de Mensalistas exportado!' });
    } catch (error) {
      console.error('Erro ao exportar mensalistas:', error);
      toast({ title: 'Erro', description: 'Falha ao exportar relatório', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportDiaristas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('diaristas')
        .select('*')
        .order('nome');

      if (error) throw error;

      const reportData = (data || []).map((diarista: any) => ({
        nome: diarista.nome || '',
        funcao: diarista.funcao || '',
        valor_diaria: diarista.valor_diaria || 0,
        dias_semana: diarista.dias_semana || 0,
        total_semana: (diarista.valor_diaria || 0) * (diarista.dias_semana || 0),
        lote: diarista.lote || '',
        obra: diarista.obra || '',
      }));

      const totalSemanal = reportData.reduce((sum, r) => sum + r.total_semana, 0);

      generateExcelReport({
        title: 'Relatório de Diaristas',
        period: format(new Date(), 'MMMM/yyyy'),
        columns: [
          { header: 'Nome', key: 'nome', width: 25 },
          { header: 'Função', key: 'funcao', width: 20 },
          { header: 'Valor Diária', key: 'valor_diaria', width: 15, format: 'currency' },
          { header: 'Dias na Semana', key: 'dias_semana', width: 15, format: 'number' },
          { header: 'Total Semana (R$)', key: 'total_semana', width: 18, format: 'currency' },
          { header: 'Lote', key: 'lote', width: 15 },
          { header: 'Obra', key: 'obra', width: 20 },
        ],
        data: reportData,
        filename: 'relatorio-diaristas',
        totals: {
          nome: 'TOTAL',
          total_semana: totalSemanal,
        },
      });

      toast({ title: 'Sucesso', description: 'Relatório de Diaristas exportado!' });
    } catch (error) {
      console.error('Erro ao exportar diaristas:', error);
      toast({ title: 'Erro', description: 'Falha ao exportar relatório', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportEntradasSaidas = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(selectedPeriod);

      const { data, error } = await supabase
        .from('cash_ledger')
        .select('*')
        .is('deleted_at', null)
        .gte('data', startDate.toISOString())
        .lte('data', endDate.toISOString())
        .order('data', { ascending: false });

      if (error) throw error;

      const reportData = (data || []).map((trans: any) => ({
        data: trans.data,
        tipo: trans.tipo === 'entrada' ? 'Entrada' : 'Saída',
        forma: trans.forma === 'banco' ? 'Banco (Itaú)' : 'Dinheiro (Físico)',
        categoria: trans.categoria || '',
        obra: trans.obra || '',
        valor: trans.valor || 0,
        observacao: trans.observacao || '',
      }));

      const totalEntradas = reportData.filter(r => r.tipo === 'Entrada').reduce((sum, r) => sum + r.valor, 0);
      const totalSaidas = reportData.filter(r => r.tipo === 'Saída').reduce((sum, r) => sum + r.valor, 0);
      const saldo = totalEntradas - totalSaidas;

      generateExcelReport({
        title: 'Relatório de Entradas & Saídas',
        period: `${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`,
        columns: [
          { header: 'Data', key: 'data', width: 12, format: 'date' },
          { header: 'Tipo', key: 'tipo', width: 12 },
          { header: 'Forma', key: 'forma', width: 20 },
          { header: 'Categoria', key: 'categoria', width: 20 },
          { header: 'Obra', key: 'obra', width: 20 },
          { header: 'Valor (R$)', key: 'valor', width: 15, format: 'currency' },
          { header: 'Observação', key: 'observacao', width: 30 },
        ],
        data: reportData,
        filename: 'relatorio-entradas-saidas',
        totals: {
          data: 'TOTAL',
          valor: saldo,
        },
      });

      toast({ title: 'Sucesso', description: 'Relatório de Entradas & Saídas exportado!' });
    } catch (error) {
      console.error('Erro ao exportar entradas/saídas:', error);
      toast({ title: 'Erro', description: 'Falha ao exportar relatório', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
              <FileSpreadsheet className="h-5 w-5 mr-2 text-gold" />
              Relatórios Especiais (Excel Formatado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={handleExportMensalistas}
                disabled={loading}
                className="btn-primary h-auto py-4 flex-col"
              >
                <Users className="h-6 w-6 mb-2" />
                <span className="font-semibold">Relatório Mensalistas</span>
                <span className="text-xs opacity-75 mt-1">
                  Salários, encargos, VT
                </span>
              </Button>

              <Button
                onClick={handleExportDiaristas}
                disabled={loading}
                className="btn-primary h-auto py-4 flex-col"
              >
                <Users className="h-6 w-6 mb-2" />
                <span className="font-semibold">Relatório Diaristas</span>
                <span className="text-xs opacity-75 mt-1">
                  Diárias, lotes, obras
                </span>
              </Button>

              <Button
                onClick={handleExportEntradasSaidas}
                disabled={loading}
                className="btn-primary h-auto py-4 flex-col"
              >
                <DollarSign className="h-6 w-6 mb-2" />
                <span className="font-semibold">Relatório Entradas & Saídas</span>
                <span className="text-xs opacity-75 mt-1">
                  Período: {periods.find(p => p.value === selectedPeriod)?.label}
                </span>
              </Button>
            </div>
            <p className="text-xs text-muted mt-4 text-center">
              Relatórios Excel com formatação profissional, totais e subtotais automáticos
            </p>
          </CardContent>
        </Card>

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
