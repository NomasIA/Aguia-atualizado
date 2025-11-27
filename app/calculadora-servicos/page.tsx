'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Calculator, Plus, Trash2, Users, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/format-utils';

interface DiaristaBase {
  id: string;
  nome: string;
  valor_diaria_semana: number;
  valor_diaria_fds: number;
}

interface Diarista extends DiaristaBase {
  quantidade: number;
  dias_semana: number;
  dias_fds: number;
}

interface CustoAdicional {
  id: string;
  descricao: string;
  valor: number;
}

export default function CalculadoraServicosPage() {
  const [diaristas, setDiaristas] = useState<DiaristaBase[]>([]);
  const [diaristasSelecionados, setDiaristasSelecionados] = useState<Diarista[]>([]);
  const [custosAdicionais, setCustosAdicionais] = useState<CustoAdicional[]>([]);
  const [margemLucro, setMargemLucro] = useState(30);
  const [impostos, setImpostos] = useState(8.5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiaristas();
  }, []);

  async function fetchDiaristas() {
    try {
      const { data, error } = await supabase
        .from('diaristas')
        .select('id, nome, valor_diaria_semana, valor_diaria_fds')
        .eq('deleted_at', null)
        .order('nome');

      if (error) throw error;
      setDiaristas(data || []);
    } catch (error) {
      console.error('Erro ao buscar diaristas:', error);
    } finally {
      setLoading(false);
    }
  }

  function adicionarDiarista(diarista: DiaristaBase) {
    const novoDiarista: Diarista = {
      ...diarista,
      quantidade: 1,
      dias_semana: 1,
      dias_fds: 0,
    };
    setDiaristasSelecionados([...diaristasSelecionados, novoDiarista]);
  }

  function removerDiarista(index: number) {
    setDiaristasSelecionados(diaristasSelecionados.filter((_, i) => i !== index));
  }

  function atualizarDiarista(index: number, campo: string, valor: number) {
    const novosSelec = [...diaristasSelecionados];
    novosSelec[index] = { ...novosSelec[index], [campo]: valor };
    setDiaristasSelecionados(novosSelec);
  }

  function adicionarCustoAdicional() {
    setCustosAdicionais([
      ...custosAdicionais,
      { id: Date.now().toString(), descricao: '', valor: 0 },
    ]);
  }

  function removerCustoAdicional(id: string) {
    setCustosAdicionais(custosAdicionais.filter((c) => c.id !== id));
  }

  function atualizarCustoAdicional(id: string, campo: string, valor: any) {
    setCustosAdicionais(
      custosAdicionais.map((c) => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  }

  const custoDiaristas = diaristasSelecionados.reduce((total, d) => {
    const custoSemana = d.quantidade * d.dias_semana * parseFloat(d.valor_diaria_semana.toString());
    const custoFds = d.quantidade * d.dias_fds * parseFloat(d.valor_diaria_fds.toString());
    return total + custoSemana + custoFds;
  }, 0);

  const custoAdicionaisTotal = custosAdicionais.reduce(
    (total, c) => total + parseFloat(c.valor.toString() || '0'),
    0
  );

  const custoTotal = custoDiaristas + custoAdicionaisTotal;
  const valorImpostos = custoTotal * (impostos / 100);
  const custoComImpostos = custoTotal + valorImpostos;
  const valorLucro = custoComImpostos * (margemLucro / 100);
  const valorFinal = custoComImpostos + valorLucro;

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
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
            <Calculator className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            Calculadora de Serviços
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Calcule o valor para emprestar diaristas com margem de lucro
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="card">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Diaristas Selecionados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {diaristasSelecionados.map((d, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{d.nome}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerDiarista(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-slate-600 dark:text-slate-400">Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          value={d.quantidade}
                          onChange={(e) => atualizarDiarista(index, 'quantidade', parseInt(e.target.value))}
                          className="input-dark mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 dark:text-slate-400">Dias Úteis</Label>
                        <Input
                          type="number"
                          min="0"
                          value={d.dias_semana}
                          onChange={(e) => atualizarDiarista(index, 'dias_semana', parseInt(e.target.value))}
                          className="input-dark mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600 dark:text-slate-400">Dias FDS</Label>
                        <Input
                          type="number"
                          min="0"
                          value={d.dias_fds}
                          onChange={(e) => atualizarDiarista(index, 'dias_fds', parseInt(e.target.value))}
                          className="input-dark mt-1"
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                      Diária útil: {formatCurrency(parseFloat(d.valor_diaria_semana.toString()))} • FDS:{' '}
                      {formatCurrency(parseFloat(d.valor_diaria_fds.toString()))}
                    </div>
                  </div>
                ))}

                {diaristasSelecionados.length === 0 && (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    Nenhum diarista selecionado
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Adicionar Diarista
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diaristas.map((d) => (
                      <Button
                        key={d.id}
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarDiarista(d)}
                        className="btn-secondary justify-start"
                        disabled={diaristasSelecionados.some((sel) => sel.id === d.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {d.nome}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Custos Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {custosAdicionais.map((custo) => (
                  <div
                    key={custo.id}
                    className="flex gap-3 items-end"
                  >
                    <div className="flex-1">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Descrição</Label>
                      <Input
                        value={custo.descricao}
                        onChange={(e) => atualizarCustoAdicional(custo.id, 'descricao', e.target.value)}
                        placeholder="Ex: Material, Transporte"
                        className="input-dark mt-1"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Valor</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={custo.valor}
                        onChange={(e) => atualizarCustoAdicional(custo.id, 'valor', parseFloat(e.target.value))}
                        className="input-dark mt-1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerCustoAdicional(custo.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={adicionarCustoAdicional}
                  className="btn-secondary w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Custo
                </Button>
              </CardContent>
            </Card>

            <Card className="card">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Margens e Impostos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-slate-700 dark:text-slate-300">Margem de Lucro (%)</Label>
                  <div className="flex gap-3 items-center mt-2">
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={margemLucro}
                      onChange={(e) => setMargemLucro(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={margemLucro}
                      onChange={(e) => setMargemLucro(parseFloat(e.target.value))}
                      className="input-dark w-20"
                    />
                    <span className="text-slate-600 dark:text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-slate-700 dark:text-slate-300">Impostos (%)</Label>
                  <div className="flex gap-3 items-center mt-2">
                    <Input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={impostos}
                      onChange={(e) => setImpostos(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={impostos}
                      onChange={(e) => setImpostos(parseFloat(e.target.value))}
                      className="input-dark w-20"
                    />
                    <span className="text-slate-600 dark:text-slate-400">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="card border-l-4 border-l-blue-500 dark:border-l-blue-400 sticky top-6">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Percent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Resumo do Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Custo Diaristas</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(custoDiaristas)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Custos Adicionais</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(custoAdicionaisTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Custo Total</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(custoTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Impostos ({impostos}%)
                    </span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatCurrency(valorImpostos)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Lucro ({margemLucro}%)
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(valorLucro)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <span className="text-base font-bold text-slate-900 dark:text-white">Valor Final</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(valorFinal)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Margem sobre custo total:</span>
                      <span className="font-medium">
                        {custoTotal > 0 ? ((valorFinal - custoTotal) / custoTotal * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lucro líquido por Real investido:</span>
                      <span className="font-medium">
                        {custoTotal > 0 ? formatCurrency(valorLucro / custoTotal) : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
