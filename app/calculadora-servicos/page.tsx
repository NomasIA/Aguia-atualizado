'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import {
  Calculator, Plus, Trash2, Users, DollarSign, TrendingUp, Percent,
  FileText, CheckCircle, Save
} from 'lucide-react';
import { formatCurrency } from '@/lib/format-utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DiaristaCalculo {
  id: string;
  nome: string;
  quantidade: number;
  dias_semana: number;
  dias_fds: number;
  valor_diaria_semana: number;
  valor_diaria_fds: number;
  custo_total: number;
}

interface CustoAdicional {
  id: string;
  descricao: string;
  valor: number;
}

interface Contrato {
  id: string;
  nome_cliente: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  custo_total: number;
  margem_lucro: number;
  impostos: number;
  forma_pagamento: string;
  prazo_pagamento: number;
  status: string;
  pago: boolean;
  valor_pago: number;
  observacoes: string;
  created_at: string;
}

export default function CalculadoraServicosPage() {
  const [diaristas, setDiaristas] = useState<DiaristaCalculo[]>([]);
  const [custosAdicionais, setCustosAdicionais] = useState<CustoAdicional[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [margemLucro, setMargemLucro] = useState(30);
  const [impostos, setImpostos] = useState(8.5);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calculator' | 'contracts'>('calculator');

  const [novaDialogOpen, setNovaDialogOpen] = useState(false);
  const [novoDiarista, setNovoDiarista] = useState({
    nome: '',
    quantidade: 1,
    dias_semana: 1,
    dias_fds: 0,
    valor_diaria_semana: 0,
    valor_diaria_fds: 0,
  });

  const [contratoDialog, setContratoDialog] = useState(false);
  const [contratoData, setContratoData] = useState({
    nome_cliente: '',
    descricao: '',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: '',
    forma_pagamento: 'pix',
    prazo_pagamento: 30,
    observacoes: '',
  });

  useEffect(() => {
    fetchContratos();
    setLoading(false);
  }, []);

  async function fetchContratos() {
    try {
      const { data, error } = await supabase
        .from('contratos_servico')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContratos(data || []);
    } catch (error) {
      console.error('Erro ao buscar contratos:', error);
    }
  }

  function adicionarDiarista() {
    if (!novoDiarista.nome.trim()) return;

    const custo_semana = novoDiarista.quantidade * novoDiarista.dias_semana * novoDiarista.valor_diaria_semana;
    const custo_fds = novoDiarista.quantidade * novoDiarista.dias_fds * novoDiarista.valor_diaria_fds;
    const custo_total = custo_semana + custo_fds;

    setDiaristas([...diaristas, {
      ...novoDiarista,
      id: Date.now().toString(),
      custo_total,
    }]);

    setNovoDiarista({
      nome: '',
      quantidade: 1,
      dias_semana: 1,
      dias_fds: 0,
      valor_diaria_semana: 0,
      valor_diaria_fds: 0,
    });
    setNovaDialogOpen(false);
  }

  function removerDiarista(id: string) {
    setDiaristas(diaristas.filter((d) => d.id !== id));
  }

  function atualizarDiarista(id: string, campo: string, valor: number) {
    setDiaristas(diaristas.map((d) => {
      if (d.id !== id) return d;

      const updated = { ...d, [campo]: valor };
      const custo_semana = updated.quantidade * updated.dias_semana * updated.valor_diaria_semana;
      const custo_fds = updated.quantidade * updated.dias_fds * updated.valor_diaria_fds;
      updated.custo_total = custo_semana + custo_fds;

      return updated;
    }));
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

  async function criarContrato() {
    if (!contratoData.nome_cliente.trim() || diaristas.length === 0) {
      alert('Preencha o nome do cliente e adicione pelo menos um diarista');
      return;
    }

    try {
      const { data: contrato, error: contratoError } = await supabase
        .from('contratos_servico')
        .insert([{
          nome_cliente: contratoData.nome_cliente,
          descricao: contratoData.descricao,
          data_inicio: contratoData.data_inicio,
          data_fim: contratoData.data_fim || null,
          valor_total: valorFinal,
          custo_total: custoTotal,
          margem_lucro: margemLucro,
          impostos: impostos,
          forma_pagamento: contratoData.forma_pagamento,
          prazo_pagamento: contratoData.prazo_pagamento,
          observacoes: contratoData.observacoes,
        }])
        .select()
        .single();

      if (contratoError) throw contratoError;

      const diaristaInserts = diaristas.map((d) => ({
        contrato_id: contrato.id,
        diarista_id: null,
        nome_diarista: d.nome,
        quantidade: d.quantidade,
        dias_semana: d.dias_semana,
        dias_fds: d.dias_fds,
        valor_diaria_semana: d.valor_diaria_semana,
        valor_diaria_fds: d.valor_diaria_fds,
        custo_total: d.custo_total,
      }));

      const { error: diaristaError } = await supabase
        .from('contratos_servico_diaristas')
        .insert(diaristaInserts);

      if (diaristaError) throw diaristaError;

      if (custosAdicionais.length > 0) {
        const custoInserts = custosAdicionais.map((c) => ({
          contrato_id: contrato.id,
          descricao: c.descricao,
          valor: c.valor,
        }));

        const { error: custoError } = await supabase
          .from('contratos_servico_custos')
          .insert(custoInserts);

        if (custoError) throw custoError;
      }

      alert('Contrato criado com sucesso!');
      limparFormulario();
      fetchContratos();
      setContratoDialog(false);
      setViewMode('contracts');
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
      alert('Erro ao criar contrato');
    }
  }

  async function excluirContrato(id: string) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return;

    try {
      const { error } = await supabase
        .from('contratos_servico')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchContratos();
      alert('Contrato excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir contrato:', error);
      alert('Erro ao excluir contrato');
    }
  }

  async function marcarComoPago(contrato: Contrato) {
    try {
      const { error } = await supabase
        .from('contratos_servico')
        .update({
          pago: true,
          valor_pago: contrato.valor_total,
          status: 'concluido'
        })
        .eq('id', contrato.id);

      if (error) throw error;
      fetchContratos();
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      alert('Erro ao atualizar pagamento');
    }
  }

  function limparFormulario() {
    setDiaristas([]);
    setCustosAdicionais([]);
    setMargemLucro(30);
    setImpostos(8.5);
    setContratoData({
      nome_cliente: '',
      descricao: '',
      data_inicio: format(new Date(), 'yyyy-MM-dd'),
      data_fim: '',
      forma_pagamento: 'pix',
      prazo_pagamento: 30,
      observacoes: '',
    });
  }

  const custoDiaristas = diaristas.reduce((total, d) => total + d.custo_total, 0);
  const custoAdicionaisTotal = custosAdicionais.reduce((total, c) => total + parseFloat(c.valor.toString() || '0'), 0);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-3">
              <Calculator className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              Contratos de Serviços
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Calcule e gerencie contratos de empréstimo de diaristas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'calculator' ? 'default' : 'outline'}
              onClick={() => setViewMode('calculator')}
              className={viewMode === 'calculator' ? 'btn-primary' : 'btn-secondary'}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculadora
            </Button>
            <Button
              variant={viewMode === 'contracts' ? 'default' : 'outline'}
              onClick={() => setViewMode('contracts')}
              className={viewMode === 'contracts' ? 'btn-primary' : 'btn-secondary'}
            >
              <FileText className="w-4 h-4 mr-2" />
              Contratos ({contratos.length})
            </Button>
          </div>
        </div>

        {viewMode === 'calculator' ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Diaristas Selecionados
                  </CardTitle>
                  <Dialog open={novaDialogOpen} onOpenChange={setNovaDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Diarista
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-800">
                      <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white">Adicionar Diarista</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300">Nome do Diarista</Label>
                          <Input
                            value={novoDiarista.nome}
                            onChange={(e) => setNovoDiarista({ ...novoDiarista, nome: e.target.value })}
                            placeholder="Ex: João Silva"
                            className="input-dark mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Quantidade</Label>
                            <Input
                              type="number"
                              min="1"
                              value={novoDiarista.quantidade}
                              onChange={(e) => setNovoDiarista({ ...novoDiarista, quantidade: parseInt(e.target.value) || 1 })}
                              className="input-dark mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Dias Úteis</Label>
                            <Input
                              type="number"
                              min="0"
                              value={novoDiarista.dias_semana}
                              onChange={(e) => setNovoDiarista({ ...novoDiarista, dias_semana: parseInt(e.target.value) || 0 })}
                              className="input-dark mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Valor Diária Útil</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={novoDiarista.valor_diaria_semana}
                              onChange={(e) => setNovoDiarista({ ...novoDiarista, valor_diaria_semana: parseFloat(e.target.value) || 0 })}
                              className="input-dark mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Dias FDS</Label>
                            <Input
                              type="number"
                              min="0"
                              value={novoDiarista.dias_fds}
                              onChange={(e) => setNovoDiarista({ ...novoDiarista, dias_fds: parseInt(e.target.value) || 0 })}
                              className="input-dark mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300">Valor Diária FDS</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={novoDiarista.valor_diaria_fds}
                            onChange={(e) => setNovoDiarista({ ...novoDiarista, valor_diaria_fds: parseFloat(e.target.value) || 0 })}
                            className="input-dark mt-1"
                          />
                        </div>
                        <Button onClick={adicionarDiarista} className="btn-primary w-full">
                          <Save className="w-4 h-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-4">
                  {diaristas.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{d.nome}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatCurrency(d.custo_total)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerDiarista(d.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400">Qtd</Label>
                          <Input
                            type="number"
                            min="1"
                            value={d.quantidade}
                            onChange={(e) => atualizarDiarista(d.id, 'quantidade', parseInt(e.target.value) || 1)}
                            className="input-dark mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400">Dias Úteis</Label>
                          <Input
                            type="number"
                            min="0"
                            value={d.dias_semana}
                            onChange={(e) => atualizarDiarista(d.id, 'dias_semana', parseInt(e.target.value) || 0)}
                            className="input-dark mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400">R$ Útil</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={d.valor_diaria_semana}
                            onChange={(e) => atualizarDiarista(d.id, 'valor_diaria_semana', parseFloat(e.target.value) || 0)}
                            className="input-dark mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400">Dias FDS</Label>
                          <Input
                            type="number"
                            min="0"
                            value={d.dias_fds}
                            onChange={(e) => atualizarDiarista(d.id, 'dias_fds', parseInt(e.target.value) || 0)}
                            className="input-dark mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600 dark:text-slate-400">R$ FDS</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={d.valor_diaria_fds}
                            onChange={(e) => atualizarDiarista(d.id, 'valor_diaria_fds', parseFloat(e.target.value) || 0)}
                            className="input-dark mt-1 h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {diaristas.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      Nenhum diarista adicionado. Clique em "Adicionar Diarista" para começar.
                    </div>
                  )}
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
                    <div key={custo.id} className="flex gap-3 items-end">
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
                          onChange={(e) => atualizarCustoAdicional(custo.id, 'valor', parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => setMargemLucro(parseFloat(e.target.value) || 0)}
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
                        onChange={(e) => setImpostos(parseFloat(e.target.value) || 0)}
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

                  <Dialog open={contratoDialog} onOpenChange={setContratoDialog}>
                    <DialogTrigger asChild>
                      <Button
                        className="btn-primary w-full"
                        disabled={diaristas.length === 0}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Gerar Contrato
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-slate-800 max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-slate-900 dark:text-white">Dados do Contrato</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300">Nome do Cliente</Label>
                          <Input
                            value={contratoData.nome_cliente}
                            onChange={(e) => setContratoData({ ...contratoData, nome_cliente: e.target.value })}
                            placeholder="Ex: Empresa ABC Ltda"
                            className="input-dark mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300">Descrição do Serviço</Label>
                          <Textarea
                            value={contratoData.descricao}
                            onChange={(e) => setContratoData({ ...contratoData, descricao: e.target.value })}
                            placeholder="Descreva o serviço a ser prestado"
                            className="input-dark mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Data Início</Label>
                            <Input
                              type="date"
                              value={contratoData.data_inicio}
                              onChange={(e) => setContratoData({ ...contratoData, data_inicio: e.target.value })}
                              className="input-dark mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Data Fim</Label>
                            <Input
                              type="date"
                              value={contratoData.data_fim}
                              onChange={(e) => setContratoData({ ...contratoData, data_fim: e.target.value })}
                              className="input-dark mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Forma de Pagamento</Label>
                            <Select
                              value={contratoData.forma_pagamento}
                              onValueChange={(value) => setContratoData({ ...contratoData, forma_pagamento: value })}
                            >
                              <SelectTrigger className="input-dark mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="transferencia">Transferência</SelectItem>
                                <SelectItem value="boleto">Boleto</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-slate-700 dark:text-slate-300">Prazo Pagamento (dias)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={contratoData.prazo_pagamento}
                              onChange={(e) => setContratoData({ ...contratoData, prazo_pagamento: parseInt(e.target.value) || 30 })}
                              className="input-dark mt-1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300">Observações</Label>
                          <Textarea
                            value={contratoData.observacoes}
                            onChange={(e) => setContratoData({ ...contratoData, observacoes: e.target.value })}
                            placeholder="Observações adicionais"
                            className="input-dark mt-1"
                          />
                        </div>
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Valor do Contrato:</span>
                            <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                              {formatCurrency(valorFinal)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>{diaristas.length} diarista(s)</span>
                            <span>{custosAdicionais.length} custo(s) adicional(is)</span>
                          </div>
                        </div>
                        <Button onClick={criarContrato} className="btn-primary w-full">
                          <Save className="w-4 h-4 mr-2" />
                          Confirmar e Criar Contrato
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="card">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Contratos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                {contratos.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    Nenhum contrato registrado
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contratos.map((contrato) => (
                      <div
                        key={contrato.id}
                        className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                              {contrato.nome_cliente}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {contrato.descricao || 'Sem descrição'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {!contrato.pago && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => marcarComoPago(contrato)}
                                className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Marcar Pago
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => excluirContrato(contrato.id)}
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Valor Total</span>
                            <p className="font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(parseFloat(contrato.valor_total.toString()))}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Status</span>
                            <p className="font-semibold text-slate-900 dark:text-white capitalize">{contrato.status}</p>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Pagamento</span>
                            <p className={`font-semibold ${contrato.pago ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                              {contrato.pago ? 'Pago' : 'Pendente'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Data Início</span>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {format(new Date(contrato.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>Forma: {contrato.forma_pagamento.toUpperCase()}</span>
                          <span>Prazo: {contrato.prazo_pagamento} dias</span>
                          <span>Margem: {contrato.margem_lucro}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
