'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Building2,
  Users,
  Wrench
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPI {
  saldoBanco: number;
  saldoDinheiro: number;
  saldoTotal: number;
  entradasBanco: number;
  entradasDinheiro: number;
  saidasBanco: number;
  saidasDinheiro: number;
  faturamento: number;
  lucroOperacional: number;
  margemOperacional: number;
  custoExecucaoInterna: number;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPI>({
    saldoBanco: 0,
    saldoDinheiro: 0,
    saldoTotal: 0,
    entradasBanco: 0,
    entradasDinheiro: 0,
    saidasBanco: 0,
    saidasDinheiro: 0,
    faturamento: 0,
    lucroOperacional: 0,
    margemOperacional: 0,
    custoExecucaoInterna: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const [bankData, cashData, ledgerData, maquinasData, locacoesData] = await Promise.all([
        supabase.from('bank_accounts').select('saldo_atual').maybeSingle(),
        supabase.from('cash_books').select('saldo_atual').maybeSingle(),
        supabase.from('cash_ledger').select('tipo, forma, valor, categoria'),
        supabase.from('maquinas').select('id, nome').order('nome'),
        supabase.from('locacoes').select('maquina_id, data_fim').order('data_fim', { ascending: false }),
      ]);

      const saldoBanco = bankData.data?.saldo_atual || 0;
      const saldoDinheiro = cashData.data?.saldo_atual || 0;

      const transactions = ledgerData.data || [];

      const entradasBanco = transactions
        .filter(t => t.tipo === 'entrada' && t.forma === 'banco')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const entradasDinheiro = transactions
        .filter(t => t.tipo === 'entrada' && t.forma === 'dinheiro')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const saidasBanco = transactions
        .filter(t => t.tipo === 'saida' && t.forma === 'banco')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const saidasDinheiro = transactions
        .filter(t => t.tipo === 'saida' && t.forma === 'dinheiro')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const faturamentoEntradas = transactions
        .filter(t => t.tipo === 'entrada' && t.categoria !== 'caução')
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const custosFuncionarios = transactions
        .filter(t => t.tipo === 'saida' && (t.categoria === 'mensalista' || t.categoria === 'diarista'))
        .reduce((sum, t) => sum + Number(t.valor), 0);

      const lucro = faturamentoEntradas - saidasBanco - saidasDinheiro;
      const margem = faturamentoEntradas > 0 ? (lucro / faturamentoEntradas) * 100 : 0;

      const newAlerts: string[] = [];
      if (margem < 0) newAlerts.push('Margem operacional negativa');
      if (saldoBanco < 0) newAlerts.push('Saldo bancário negativo');
      if (saldoDinheiro < 0) newAlerts.push('Saldo de caixa negativo');

      const maquinas = maquinasData.data || [];
      const locacoes = locacoesData.data || [];
      const hoje = new Date();
      const quinzeDiasAtras = new Date(hoje.getTime() - 15 * 24 * 60 * 60 * 1000);

      maquinas.forEach((maquina: any) => {
        const locacoesMaquina = locacoes.filter((loc: any) => loc.maquina_id === maquina.id);

        if (locacoesMaquina.length === 0) {
          newAlerts.push(`Máquina ociosa: ${maquina.nome} (nunca locada)`);
        } else {
          const ultimaLocacao = locacoesMaquina[0];

          if (ultimaLocacao && new Date(ultimaLocacao.data_fim) < quinzeDiasAtras) {
            const diasOciosa = Math.floor((hoje.getTime() - new Date(ultimaLocacao.data_fim).getTime()) / (24 * 60 * 60 * 1000));
            newAlerts.push(`Máquina ociosa: ${maquina.nome} (${diasOciosa} dias sem locação)`);
          }
        }
      });

      setKpis({
        saldoBanco,
        saldoDinheiro,
        saldoTotal: saldoBanco + saldoDinheiro,
        entradasBanco,
        entradasDinheiro,
        saidasBanco,
        saidasDinheiro,
        faturamento: faturamentoEntradas,
        lucroOperacional: lucro,
        margemOperacional: margem,
        custoExecucaoInterna: custosFuncionarios,
      });

      setAlerts(newAlerts);

      const monthlyData = generateMonthlyData(transactions);
      setChartData(monthlyData);
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (transactions: any[]) => {
    const monthMap: any = {};

    transactions.forEach(t => {
      const date = new Date(t.data);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, entradas: 0, saidas: 0 };
      }

      if (t.tipo === 'entrada') {
        monthMap[monthKey].entradas += Number(t.valor);
      } else {
        monthMap[monthKey].saidas += Number(t.valor);
      }
    });

    return Object.values(monthMap)
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .slice(-6);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gold text-lg">Carregando dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gold glow-gold mb-2">Visão Geral</h1>
          <p className="text-muted">Resumo financeiro e operacional</p>
        </div>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Alert key={index} variant="destructive" className="bg-danger/10 border-danger/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{alert}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Saldo Banco (Itaú)</CardTitle>
              <Wallet className="w-5 h-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value">{formatCurrency(kpis.saldoBanco)}</div>
              <div className="chip-banco mt-2">Banco (Itaú)</div>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Caixa Dinheiro (Físico)</CardTitle>
              <Wallet className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value">{formatCurrency(kpis.saldoDinheiro)}</div>
              <div className="chip-dinheiro mt-2">Dinheiro (Físico)</div>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Saldo Total</CardTitle>
              <DollarSign className="w-5 h-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value">{formatCurrency(kpis.saldoTotal)}</div>
              <p className="text-xs text-muted mt-2">Banco + Dinheiro</p>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Faturamento</CardTitle>
              <TrendingUp className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value">{formatCurrency(kpis.faturamento)}</div>
              <p className="text-xs text-muted mt-2">Receitas recebidas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Entradas Banco</CardTitle>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value text-xl">{formatCurrency(kpis.entradasBanco)}</div>
              <div className="chip-banco mt-2">Banco (Itaú)</div>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Entradas Dinheiro</CardTitle>
              <TrendingUp className="w-5 h-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value text-xl">{formatCurrency(kpis.entradasDinheiro)}</div>
              <div className="chip-dinheiro mt-2">Dinheiro (Físico)</div>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Saídas Total</CardTitle>
              <TrendingDown className="w-5 h-5 text-danger" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value text-xl">
                {formatCurrency(kpis.saidasBanco + kpis.saidasDinheiro)}
              </div>
              <p className="text-xs text-muted mt-2">Banco + Dinheiro</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Lucro Operacional</CardTitle>
              <DollarSign className="w-5 h-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className={`kpi-value ${kpis.lucroOperacional < 0 ? 'text-danger' : ''}`}>
                {formatCurrency(kpis.lucroOperacional)}
              </div>
              <p className="text-xs text-muted mt-2">Faturamento - Custos</p>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Margem Operacional</CardTitle>
              <TrendingUp className="w-5 h-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className={`kpi-value ${kpis.margemOperacional < 0 ? 'text-danger' : ''}`}>
                {kpis.margemOperacional.toFixed(2)}%
              </div>
              <p className="text-xs text-muted mt-2">Lucro / Faturamento</p>
            </CardContent>
          </Card>

          <Card className="kpi-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="kpi-label">Custo Execução Interna</CardTitle>
              <Users className="w-5 h-5 text-muted" />
            </CardHeader>
            <CardContent>
              <div className="kpi-value text-xl">
                {formatCurrency(kpis.custoExecucaoInterna)}
              </div>
              <p className="text-xs text-muted mt-2">Mensalistas + Diaristas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card">
            <CardHeader>
              <CardTitle className="text-lg text-gold">Entradas vs Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10b981" name="Entradas" />
                  <Bar dataKey="saidas" fill="#ef4444" name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader>
              <CardTitle className="text-lg text-gold">Evolução do Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="entradas"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Entradas"
                  />
                  <Line
                    type="monotone"
                    dataKey="saidas"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Saídas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
