'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Plus, Calendar, DollarSign, CheckCircle, Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Maquina {
  id: string;
  item: string;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_diaria: number;
  status: string;
  categoria: string;
}

interface Contrato {
  id: string;
  maquina_id: string;
  maquina_nome: string;
  maquina_item: string;
  cliente: string;
  obra: string;
  data_inicio: string;
  data_fim: string;
  dias_locacao: number;
  valor_diaria: number;
  valor_total: number;
  valor_recebido: number;
  forma_pagamento: string;
  status: string;
  recebido: boolean;
  data_recebimento: string;
}

export default function MaquinariosPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [selectedMaquina, setSelectedMaquina] = useState<Maquina | null>(null);
  const { toast } = useToast();

  const [simulationForm, setSimulationForm] = useState({
    cliente: '',
    obra: '',
    data_inicio: '',
    data_fim: '',
    dias: 0,
    valor_total: 0,
    forma_pagamento: 'banco' as 'banco' | 'dinheiro'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [maquinasRes, contratosRes] = await Promise.all([
        supabase.from('maquinas').select('*').order('item'),
        supabase.rpc('get_contratos_detalhados').then(res =>
          supabase.from('contratos_locacao').select(`
            id, maquina_id, cliente, obra, data_inicio, data_fim,
            dias_locacao, valor_diaria, valor_total, valor_recebido,
            forma_pagamento, status, recebido, data_recebimento
          `).is('deleted_at', null).order('created_at', { ascending: false })
        )
      ]);

      if (maquinasRes.data) setMaquinas(maquinasRes.data);
      if (contratosRes.data) {
        const contratosWithMaquinas = await Promise.all(
          contratosRes.data.map(async (c: any) => {
            const { data: maq } = await supabase
              .from('maquinas')
              .select('nome, item')
              .eq('id', c.maquina_id)
              .single();
            return {
              ...c,
              maquina_nome: maq?.nome || 'N/A',
              maquina_item: maq?.item || 'N/A'
            };
          })
        );
        setContratos(contratosWithMaquinas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openSimulation = (maquina: Maquina) => {
    setSelectedMaquina(maquina);
    setSimulationForm({
      cliente: '',
      obra: '',
      data_inicio: '',
      data_fim: '',
      dias: 0,
      valor_total: 0,
      forma_pagamento: 'banco'
    });
    setSimulationOpen(true);
  };

  const calculateSimulation = () => {
    if (!simulationForm.data_inicio || !simulationForm.data_fim || !selectedMaquina) return;

    const inicio = parse(simulationForm.data_inicio, 'yyyy-MM-dd', new Date());
    const fim = parse(simulationForm.data_fim, 'yyyy-MM-dd', new Date());
    const dias = differenceInDays(fim, inicio) + 1;
    const valor_total = dias * selectedMaquina.valor_diaria;

    setSimulationForm(prev => ({
      ...prev,
      dias,
      valor_total
    }));
  };

  useEffect(() => {
    if (simulationForm.data_inicio && simulationForm.data_fim) {
      calculateSimulation();
    }
  }, [simulationForm.data_inicio, simulationForm.data_fim]);

  const confirmarContrato = async () => {
    if (!selectedMaquina || !simulationForm.cliente || !simulationForm.data_inicio || !simulationForm.data_fim) {
      toast({
        title: 'Aviso',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_contrato_locacao', {
        p_maquina_id: selectedMaquina.id,
        p_cliente: simulationForm.cliente,
        p_obra: simulationForm.obra || null,
        p_data_inicio: simulationForm.data_inicio,
        p_data_fim: simulationForm.data_fim,
        p_dias_locacao: simulationForm.dias,
        p_valor_diaria: selectedMaquina.valor_diaria,
        p_valor_total: simulationForm.valor_total,
        p_forma_pagamento: simulationForm.forma_pagamento
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contrato criado com sucesso. Máquina marcada como Locada.'
      });

      setSimulationOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Erro ao criar contrato:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o contrato',
        variant: 'destructive'
      });
    }
  };

  const marcarRecebido = async (contratoId: string) => {
    try {
      const { error } = await supabase.rpc('receber_contrato_locacao', {
        p_contrato_id: contratoId,
        p_data_recebimento: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Recebimento confirmado. Entrada criada no ledger e saldos atualizados.'
      });

      window.dispatchEvent(new Event('kpi-refresh'));
      window.dispatchEvent(new Event('revalidate-all'));

      loadData();
    } catch (error: any) {
      console.error('Erro ao marcar recebido:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível confirmar o recebimento',
        variant: 'destructive'
      });
    }
  };

  const desfazerRecebimento = async (contratoId: string) => {
    try {
      const { error } = await supabase.rpc('desfazer_recebimento_locacao', {
        p_contrato_id: contratoId
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Recebimento desfeito. Entrada removida do ledger e saldos recalculados.'
      });

      window.dispatchEvent(new Event('kpi-refresh'));
      window.dispatchEvent(new Event('revalidate-all'));

      loadData();
    } catch (error: any) {
      console.error('Erro ao desfazer:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível desfazer o recebimento',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      'Disponível': { color: 'bg-green-500/10 text-green-500 border-green-500/20', text: 'Disponível' },
      'Locado': { color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', text: 'Locado' },
      'Manutenção': { color: 'bg-red-500/10 text-red-500 border-red-500/20', text: 'Manutenção' }
    };

    const badge = badges[status] || badges['Disponível'];
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gold text-lg">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gold mb-2">Maquinário</h1>
            <p className="text-muted">Gestão de equipamentos e contratos de locação</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {maquinas.map((maquina) => (
            <Card key={maquina.id} className="card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-gold text-lg mb-2">{maquina.item}</CardTitle>
                    <p className="text-sm text-muted">{maquina.categoria}</p>
                  </div>
                  <Wrench className="w-5 h-5 text-gold" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted">Quantidade</p>
                    <p className="font-semibold text-white">{maquina.quantidade}</p>
                  </div>
                  <div>
                    <p className="text-muted">Valor Unit.</p>
                    <p className="font-semibold text-white">{formatCurrency(maquina.valor_unitario)}</p>
                  </div>
                  <div>
                    <p className="text-muted">Valor Total</p>
                    <p className="font-semibold text-gold">{formatCurrency(maquina.valor_total)}</p>
                  </div>
                  <div>
                    <p className="text-muted">Diária</p>
                    <p className="font-semibold text-green-500">{formatCurrency(maquina.valor_diaria)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted">Status</span>
                    {getStatusBadge(maquina.status)}
                  </div>

                  <Button
                    onClick={() => openSimulation(maquina)}
                    disabled={maquina.status === 'Locado' || maquina.status === 'Manutenção'}
                    className="w-full btn-primary"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Simular Locação
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="card">
          <CardHeader>
            <CardTitle className="text-gold">Contratos de Locação</CardTitle>
          </CardHeader>
          <CardContent>
            {contratos.length === 0 ? (
              <p className="text-center text-muted py-8">Nenhum contrato registrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Máquina</th>
                      <th className="text-left p-3">Cliente</th>
                      <th className="text-left p-3">Período</th>
                      <th className="text-right p-3">Diárias</th>
                      <th className="text-right p-3">Valor Total</th>
                      <th className="text-center p-3">Status</th>
                      <th className="text-center p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratos.map((contrato) => (
                      <tr key={contrato.id} className="border-b border-border/50 hover:bg-accent/5">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-white">{contrato.maquina_item}</p>
                            {contrato.obra && (
                              <p className="text-xs text-muted">{contrato.obra}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-muted">{contrato.cliente}</td>
                        <td className="p-3">
                          <div className="text-xs">
                            <p className="text-white">{format(new Date(contrato.data_inicio), 'dd/MM/yyyy')}</p>
                            <p className="text-muted">até {format(new Date(contrato.data_fim), 'dd/MM/yyyy')}</p>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <p className="text-white">{contrato.dias_locacao}</p>
                          <p className="text-xs text-muted">{formatCurrency(contrato.valor_diaria)}/dia</p>
                        </td>
                        <td className="p-3 text-right font-semibold text-gold">
                          {formatCurrency(contrato.valor_total)}
                        </td>
                        <td className="p-3 text-center">
                          {contrato.recebido ? (
                            <div className="text-xs">
                              <span className="text-green-500 font-medium">✓ Recebido</span>
                              {contrato.data_recebimento && (
                                <p className="text-muted mt-1">
                                  {format(new Date(contrato.data_recebimento), 'dd/MM/yyyy')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-orange-500 text-xs">Pendente</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!contrato.recebido ? (
                            <Button
                              size="sm"
                              onClick={() => marcarRecebido(contrato.id)}
                              className="btn-primary text-xs"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Receber
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => desfazerRecebimento(contrato.id)}
                              className="text-xs hover:bg-orange-500/10"
                            >
                              <Undo2 className="w-3 h-3 mr-1" />
                              Desfazer
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={simulationOpen} onOpenChange={setSimulationOpen}>
        <DialogContent className="bg-surface border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold text-xl">
              Simular Locação - {selectedMaquina?.item}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gold/10 border border-gold/20 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted">Equipamento</p>
                  <p className="font-semibold text-white">{selectedMaquina?.item}</p>
                </div>
                <div>
                  <p className="text-muted">Valor da Diária</p>
                  <p className="font-semibold text-gold">
                    {selectedMaquina && formatCurrency(selectedMaquina.valor_diaria)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Input
                  value={simulationForm.cliente}
                  onChange={(e) => setSimulationForm({ ...simulationForm, cliente: e.target.value })}
                  placeholder="Nome do cliente"
                  className="input-dark"
                />
              </div>
              <div>
                <Label>Obra (opcional)</Label>
                <Input
                  value={simulationForm.obra}
                  onChange={(e) => setSimulationForm({ ...simulationForm, obra: e.target.value })}
                  placeholder="Nome da obra"
                  className="input-dark"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={simulationForm.data_inicio}
                  onChange={(e) => setSimulationForm({ ...simulationForm, data_inicio: e.target.value })}
                  className="input-dark"
                />
              </div>
              <div>
                <Label>Data Fim *</Label>
                <Input
                  type="date"
                  value={simulationForm.data_fim}
                  onChange={(e) => setSimulationForm({ ...simulationForm, data_fim: e.target.value })}
                  min={simulationForm.data_inicio}
                  className="input-dark"
                />
              </div>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <select
                value={simulationForm.forma_pagamento}
                onChange={(e) => setSimulationForm({ ...simulationForm, forma_pagamento: e.target.value as any })}
                className="select-dark w-full"
              >
                <option value="banco">Banco (Itaú)</option>
                <option value="dinheiro">Dinheiro (Físico)</option>
              </select>
            </div>

            {simulationForm.dias > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-500">Simulação</span>
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted mb-1">Total de Diárias</p>
                    <p className="text-2xl font-bold text-white">{simulationForm.dias}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted mb-1">Valor Total</p>
                    <p className="text-2xl font-bold text-gold">
                      {formatCurrency(simulationForm.valor_total)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted mt-3">
                  {simulationForm.dias} diárias × {selectedMaquina && formatCurrency(selectedMaquina.valor_diaria)}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={confirmarContrato}
                disabled={!simulationForm.cliente || !simulationForm.data_inicio || !simulationForm.data_fim}
                className="btn-primary flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Contrato
              </Button>
              <Button
                type="button"
                onClick={() => setSimulationOpen(false)}
                className="btn-secondary"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
