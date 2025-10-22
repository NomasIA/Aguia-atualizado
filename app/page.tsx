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
  Building2,
  Users,
  Wrench
} from 'lucide-react';
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

export default function HomePage() {
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
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadKPIs();

    const handleKPIRefresh = () => {
      loadKPIs();
    };

    window.addEventListener('kpi-refresh', handleKPIRefresh);

    return () => {
      window.removeEventListener('kpi-refresh', handleKPIRefresh);
    };
  }, []);

  const loadKPIs = async () => {
    try {
      const [bankData, cashData, ledgerData, diaristasData] = await Promise.all([
        supabase.from('bank_accounts').select('saldo_atual').maybeSingle(),
        supabase.from('cash_books').select('saldo_atual').maybeSingle(),
        supabase.from('cash_ledger').select('tipo, forma, valor, categoria'),
        supabase.from('vw_custos_diaristas_periodo').select('total'),
      ]);

      const saldoBanco = bankData.data?.saldo_atual || 0;
      const saldoDinheiro = cashData.data?.saldo_atual || 0;
      const saldoTotal = saldoBanco + saldoDinheiro;

      const ledger = ledgerData.data || [];

      const entradasBanco = ledger
        .filter((l: any) => l.tipo === 'entrada' && l.forma === 'banco')
        .reduce((sum: number, l: any) => sum + parseFloat(l.valor), 0);

      const entradasDinheiro = ledger
        .filter((l: any) => l.tipo === 'entrada' && l.forma === 'dinheiro')
        .reduce((sum: number, l: any) => sum + parseFloat(l.valor), 0);

      const saidasBanco = ledger
        .filter((l: any) => l.tipo === 'saida' && l.forma === 'banco')
        .reduce((sum: number, l: any) => sum + parseFloat(l.valor), 0);

      const saidasDinheiro = ledger
        .filter((l: any) => l.tipo === 'saida' && l.forma === 'dinheiro')
        .reduce((sum: number, l: any) => sum + parseFloat(l.valor), 0);

      const faturamento = entradasBanco + entradasDinheiro;

      const custoDiaristas = (diaristasData.data || []).reduce((sum: number, d: any) => sum + parseFloat(d.total || 0), 0);
      const custoExecucao = saidasBanco + saidasDinheiro;
      const custoExecucaoTotal = custoExecucao + custoDiaristas;

      const lucro = faturamento - custoExecucao;
      const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

      setKpis({
        saldoBanco,
        saldoDinheiro,
        saldoTotal,
        entradasBanco,
        entradasDinheiro,
        saidasBanco,
        saidasDinheiro,
        faturamento,
        lucroOperacional: lucro,
        margemOperacional: margem,
        custoExecucaoInterna: custoExecucaoTotal,
      });

      setChartData([
        { name: 'Banco', Entradas: entradasBanco, Saídas: saidasBanco },
        { name: 'Dinheiro', Entradas: entradasDinheiro, Saídas: saidasDinheiro },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-muted">Carregando dados...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl text-[#FFD86F] mb-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: 'normal' }}>
            Dashboard Financeiro
          </h1>
          <p className="text-muted" style={{ fontFamily: 'Inter, sans-serif' }}>Visão geral do seu negócio</p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Saldo Banco</CardTitle>
              <Building2 className="h-5 w-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold" style={{ fontFamily: 'Orbitron, monospace' }}>{formatCurrency(kpis.saldoBanco)}</div>
              <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-info/10 text-info border border-info/20">
                Itaú
              </span>
            </CardContent>
          </Card>

          <Card className="card hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Saldo Dinheiro</CardTitle>
              <Wallet className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold" style={{ fontFamily: 'Orbitron, monospace' }}>{formatCurrency(kpis.saldoDinheiro)}</div>
              <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-success/10 text-success border border-success/20">
                Caixa Físico
              </span>
            </CardContent>
          </Card>

          <Card className="card hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Saldo Total</CardTitle>
              <DollarSign className="h-5 w-5 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold" style={{ fontFamily: 'Orbitron, monospace' }}>{formatCurrency(kpis.saldoTotal)}</div>
              <p className="text-xs text-muted mt-2">Banco + Dinheiro</p>
            </CardContent>
          </Card>

          <Card className="card hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Faturamento</CardTitle>
              <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold" style={{ fontFamily: 'Orbitron, monospace' }}>{formatCurrency(kpis.faturamento)}</div>
              <p className="text-xs text-muted mt-2">Receitas totais</p>
            </CardContent>
          </Card>

          <Card className="card hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Lucro Operacional</CardTitle>
              {kpis.lucroOperacional >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-danger" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis.lucroOperacional >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(kpis.lucroOperacional)}
              </div>
              <p className="text-xs text-muted mt-2">Receitas - Despesas</p>
            </CardContent>
          </Card>

          <Card className="card hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Margem Operacional</CardTitle>
              {kpis.margemOperacional >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-danger" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis.margemOperacional >= 0 ? 'text-success' : 'text-danger'}`}>
                {kpis.margemOperacional.toFixed(1)}%
              </div>
              <p className="text-xs text-muted mt-2">Lucratividade</p>
            </CardContent>
          </Card>

          <Card className="card hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Custo Total do Mês</CardTitle>
              <DollarSign className="h-5 w-5 text-danger" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-danger" style={{ fontFamily: 'Orbitron, monospace' }}>{formatCurrency(kpis.custoExecucaoInterna)}</div>
              <p className="text-xs text-muted mt-2">Todas as despesas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="card">
            <CardHeader>
              <CardTitle>Entradas vs Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1f2e',
                      border: '1px solid rgba(245, 199, 66, 0.2)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Entradas" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader>
              <CardTitle>Evolução do Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={[
                    { name: 'Início', Banco: kpis.entradasBanco - kpis.saidasBanco, Dinheiro: kpis.entradasDinheiro - kpis.saidasDinheiro },
                    { name: 'Atual', Banco: kpis.saldoBanco, Dinheiro: kpis.saldoDinheiro },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1f2e',
                      border: '1px solid rgba(245, 199, 66, 0.2)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Banco" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Dinheiro" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
