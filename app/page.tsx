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
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Building2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KPIData {
  saldo_banco: number;
  saldo_dinheiro: number;
  total_entradas: number;
  total_saidas: number;
  lucro_operacional: number;
  count_entradas: number;
  count_saidas: number;
  count_conciliados: number;
  count_pendentes: number;
  ultima_atualizacao: string;
}

interface Movimentacao {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  forma: 'banco' | 'dinheiro';
  categoria: string;
  origem: string;
  descricao: string;
  valor: number;
  conciliado: boolean;
  created_at: string;
}

export default function HomePage() {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [ultimas, setUltimas] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const handleRefresh = () => loadData();
    window.addEventListener('kpi-refresh', handleRefresh);
    window.addEventListener('revalidate-all', handleRefresh);
    window.addEventListener('revalidate-overview', handleRefresh);

    return () => {
      window.removeEventListener('kpi-refresh', handleRefresh);
      window.removeEventListener('revalidate-all', handleRefresh);
      window.removeEventListener('revalidate-overview', handleRefresh);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [kpisResult, ultimasResult] = await Promise.all([
        supabase.from('kpis_realtime').select('*').single(),
        supabase.from('ultimas_movimentacoes').select('*').limit(5)
      ]);

      if (kpisResult.data) {
        setKpis(kpisResult.data);
      }

      if (ultimasResult.data) {
        setUltimas(ultimasResult.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const chartData = kpis ? [
    {
      name: 'Entradas',
      valor: parseFloat(kpis.total_entradas.toString()),
      quantidade: kpis.count_entradas
    },
    {
      name: 'Saídas',
      valor: parseFloat(kpis.total_saidas.toString()),
      quantidade: kpis.count_saidas
    }
  ] : [];

  const saldoTotal = kpis ? parseFloat(kpis.saldo_banco.toString()) + parseFloat(kpis.saldo_dinheiro.toString()) : 0;
  const margemOperacional = kpis && kpis.total_entradas > 0
    ? (parseFloat(kpis.lucro_operacional.toString()) / parseFloat(kpis.total_entradas.toString())) * 100
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-blue-600 dark:text-blue-400 text-lg font-semibold">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Visão Geral</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">Dashboard financeiro em tempo real</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="card border-l-4 border-l-blue-500 dark:border-l-blue-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Saldo Banco (Itaú)</CardTitle>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {kpis ? formatCurrency(parseFloat(kpis.saldo_banco.toString())) : 'R$ 0,00'}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Conta principal</p>
            </CardContent>
          </Card>

          <Card className="card border-l-4 border-l-green-500 dark:border-l-green-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Saldo Dinheiro</CardTitle>
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {kpis ? formatCurrency(parseFloat(kpis.saldo_dinheiro.toString())) : 'R$ 0,00'}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Caixa físico</p>
            </CardContent>
          </Card>

          <Card className="card border-l-4 border-l-violet-500 dark:border-l-violet-400">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Saldo Total</CardTitle>
              <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(saldoTotal)}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Banco + Dinheiro</p>
            </CardContent>
          </Card>

          <Card className={`card border-l-4 ${kpis && parseFloat(kpis.lucro_operacional.toString()) >= 0 ? 'border-l-emerald-500 dark:border-l-emerald-400' : 'border-l-red-500 dark:border-l-red-400'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Lucro Operacional</CardTitle>
              <div className={`p-2 rounded-lg ${kpis && parseFloat(kpis.lucro_operacional.toString()) >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                {kpis && parseFloat(kpis.lucro_operacional.toString()) >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${kpis && parseFloat(kpis.lucro_operacional.toString()) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {kpis ? formatCurrency(parseFloat(kpis.lucro_operacional.toString())) : 'R$ 0,00'}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Margem: {margemOperacional.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="card">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white text-xl font-bold">Entradas vs Saídas</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Análise de movimentações financeiras</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" stroke="#64748b" className="dark:stroke-slate-400" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" className="dark:stroke-slate-400" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="valor" fill="#3b82f6" name="Valor Total" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                    <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Entradas</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {kpis ? formatCurrency(parseFloat(kpis.total_entradas.toString())) : 'R$ 0,00'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kpis?.count_entradas || 0} movimentações</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Saídas</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {kpis ? formatCurrency(parseFloat(kpis.total_saidas.toString())) : 'R$ 0,00'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{kpis?.count_saidas || 0} movimentações</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white text-xl font-bold flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Últimas Movimentações
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Histórico recente de transações</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ultimas.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-700 rounded-full mb-3">
                      <Activity className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma movimentação registrada</p>
                  </div>
                ) : (
                  ultimas.map((mov) => (
                    <div
                      key={mov.id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${mov.tipo === 'entrada' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                          {mov.tipo === 'entrada' ? (
                            <ArrowUpRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {mov.descricao || mov.categoria || mov.origem || 'Sem descrição'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-medium">{format(new Date(mov.data), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            <span>•</span>
                            <span className="capitalize font-medium">{mov.forma}</span>
                            {mov.conciliado && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 dark:text-green-400 font-semibold">✓ Conciliado</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`text-right ${mov.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-bold text-base`}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(parseFloat(mov.valor.toString()))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {ultimas.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">Conciliadas</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis?.count_conciliados || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-1">Pendentes</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpis?.count_pendentes || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {kpis?.ultima_atualizacao && (
          <div className="text-center text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            Última atualização: {format(new Date(kpis.ultima_atualizacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
