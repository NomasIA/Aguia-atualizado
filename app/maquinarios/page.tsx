'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Wrench, Plus, Trash2, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Maquina {
  id: string;
  nome: string;
  custo_aquisicao: number;
  quantidade: number;
  valor_diaria: number;
  status: string;
  observacao: string;
}

interface Obra {
  id: string;
  nome_obra: string;
  cliente: string;
}

interface Contrato {
  id: string;
  numero_contrato: string;
  maquina_id: string;
  obra_id: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  valor_diaria: number;
  valor_total: number;
  status: string;
  forma_pagamento: string;
  recebido: boolean;
  data_recebimento: string;
  maquinas: { nome: string };
  obras: { nome_obra: string; cliente: string };
}

export default function MaquinariosPage() {
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contratoDialogOpen, setContratoDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    custo_aquisicao: 0,
    quantidade: 1,
    valor_diaria: 0,
    observacao: ''
  });

  const [contratoForm, setContratoForm] = useState({
    maquina_id: '',
    obra_id: '',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    dias: 1,
    forma_pagamento: 'banco' as 'banco' | 'dinheiro'
  });

  const [valorCalculado, setValorCalculado] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calcularValorContrato();
  }, [contratoForm.maquina_id, contratoForm.dias]);

  const loadData = async () => {
    try {
      const [maquinasData, obrasData, contratosData] = await Promise.all([
        supabase.from('maquinas').select('*').is('deleted_at', null).order('nome'),
        supabase.from('obras').select('id, nome_obra, cliente').is('deleted_at', null).order('nome_obra'),
        supabase.from('locacoes_contratos').select('*, maquinas(nome), obras(nome_obra, cliente)').is('deleted_at', null).order('created_at', { ascending: false })
      ]);

      if (maquinasData.data) setMaquinas(maquinasData.data);
      if (obrasData.data) setObras(obrasData.data);
      if (contratosData.data) setContratos(contratosData.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const calcularValorContrato = () => {
    const maquina = maquinas.find(m => m.id === contratoForm.maquina_id);
    if (maquina && contratoForm.dias > 0) {
      const valor = maquina.valor_diaria * contratoForm.dias;
      setValorCalculado(valor);
    } else {
      setValorCalculado(0);
    }
  };

  const handleSubmitMaquina = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('maquinas').insert([{
        nome: formData.nome,
        custo_aquisicao: formData.custo_aquisicao || 0,
        quantidade: formData.quantidade || 1,
        valor_diaria: formData.valor_diaria || 0,
        observacao: formData.observacao || '',
        status: 'disponivel'
      }]);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Máquina cadastrada com sucesso!' });
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Erro ao cadastrar máquina:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível cadastrar a máquina', variant: 'destructive' });
    }
  };

  const handleConfirmarContrato = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contratoForm.maquina_id || !contratoForm.obra_id || !contratoForm.data_inicio || contratoForm.dias <= 0) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      const maquina = maquinas.find(m => m.id === contratoForm.maquina_id);
      if (!maquina) throw new Error('Máquina não encontrada');

      const dataInicio = new Date(contratoForm.data_inicio);
      const dataFim = new Date(dataInicio);
      dataFim.setDate(dataFim.getDate() + contratoForm.dias - 1);

      const numeroContrato = `LC${format(new Date(), 'yyyy')}${String(contratos.length + 1).padStart(4, '0')}`;
      const valorTotal = maquina.valor_diaria * contratoForm.dias;

      const { error } = await supabase.from('locacoes_contratos').insert([{
        numero_contrato: numeroContrato,
        maquina_id: contratoForm.maquina_id,
        obra_id: contratoForm.obra_id,
        data_inicio: format(dataInicio, 'yyyy-MM-dd'),
        data_fim: format(dataFim, 'yyyy-MM-dd'),
        dias: contratoForm.dias,
        valor_diaria: maquina.valor_diaria,
        valor_total: valorTotal,
        forma_pagamento: contratoForm.forma_pagamento,
        status: 'ativo',
        recebido: false
      }]);

      if (error) throw error;

      await supabase.from('maquinas').update({ status: 'locado' }).eq('id', contratoForm.maquina_id);

      toast({ title: 'Sucesso', description: 'Contrato confirmado e ativo!' });
      setContratoDialogOpen(false);
      resetContratoForm();
      loadData();
    } catch (error: any) {
      console.error('Erro ao confirmar contrato:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível confirmar o contrato', variant: 'destructive' });
    }
  };

  const handleMarcarRecebido = async (contrato: Contrato) => {
    try {
      const { data: bankAccount } = await supabase
        .from('bank_accounts')
        .select('id, saldo_atual')
        .eq('nome', 'Itaú – Conta Principal')
        .maybeSingle();

      const { data: cashBook } = await supabase
        .from('cash_books')
        .select('id, saldo_atual')
        .eq('nome', 'Caixa Dinheiro (Físico)')
        .maybeSingle();

      const { data: ledger, error: ledgerError } = await supabase
        .from('cash_ledger')
        .insert([{
          data: format(new Date(), 'yyyy-MM-dd'),
          tipo: 'entrada',
          forma: contrato.forma_pagamento,
          categoria: 'locacao_maquina',
          descricao: `Recebimento Contrato ${contrato.numero_contrato} - ${contrato.maquinas?.nome}`,
          valor: contrato.valor_total,
          bank_account_id: contrato.forma_pagamento === 'banco' ? bankAccount?.id : null,
          cash_book_id: contrato.forma_pagamento === 'dinheiro' ? cashBook?.id : null
        }])
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      const { error: contratoError } = await supabase
        .from('locacoes_contratos')
        .update({
          recebido: true,
          data_recebimento: format(new Date(), 'yyyy-MM-dd'),
          cash_ledger_id: ledger.id
        })
        .eq('id', contrato.id);

      if (contratoError) throw contratoError;

      if (contrato.forma_pagamento === 'banco' && bankAccount) {
        await supabase
          .from('bank_accounts')
          .update({ saldo_atual: (bankAccount.saldo_atual || 0) + contrato.valor_total })
          .eq('id', bankAccount.id);
      } else if (contrato.forma_pagamento === 'dinheiro' && cashBook) {
        await supabase
          .from('cash_books')
          .update({ saldo_atual: (cashBook.saldo_atual || 0) + contrato.valor_total })
          .eq('id', cashBook.id);
      }

      toast({ title: 'Sucesso', description: 'Pagamento registrado e saldo atualizado!' });
      loadData();
      window.dispatchEvent(new Event('revalidate-all'));
    } catch (error: any) {
      console.error('Erro ao marcar como recebido:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível registrar o pagamento', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const table = itemToDelete.tipo === 'maquina' ? 'maquinas' : 'locacoes_contratos';
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: `${itemToDelete.tipo === 'maquina' ? 'Máquina' : 'Contrato'} excluído com sucesso!` });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      custo_aquisicao: 0,
      quantidade: 1,
      valor_diaria: 0,
      observacao: ''
    });
  };

  const resetContratoForm = () => {
    setContratoForm({
      maquina_id: '',
      obra_id: '',
      data_inicio: format(new Date(), 'yyyy-MM-dd'),
      dias: 1,
      forma_pagamento: 'banco'
    });
    setValorCalculado(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
        <div>
          <h1 className="text-3xl text-[#FFD86F] mb-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            Maquinários
          </h1>
          <p className="text-muted" style={{ fontFamily: 'Inter, sans-serif' }}>
            Gestão de máquinas e contratos de locação
          </p>
        </div>

        <Tabs defaultValue="maquinas" className="space-y-6">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="maquinas" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Cadastro de Máquinas
            </TabsTrigger>
            <TabsTrigger value="contratos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contratos de Locação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="maquinas">
            <Card className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gold">Máquinas Cadastradas</h2>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Máquina
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-surface border-border">
                    <DialogHeader>
                      <DialogTitle className="text-gold">Cadastrar Máquina</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitMaquina} className="space-y-4">
                      <div>
                        <Label htmlFor="nome">Nome da Máquina *</Label>
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          className="input-dark"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="custo_aquisicao">Custo de Aquisição</Label>
                          <Input
                            id="custo_aquisicao"
                            type="number"
                            step="0.01"
                            value={formData.custo_aquisicao}
                            onChange={(e) => setFormData({ ...formData, custo_aquisicao: parseFloat(e.target.value) || 0 })}
                            className="input-dark"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quantidade">Quantidade</Label>
                          <Input
                            id="quantidade"
                            type="number"
                            min="1"
                            value={formData.quantidade}
                            onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                            className="input-dark"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="valor_diaria">Valor da Diária *</Label>
                        <Input
                          id="valor_diaria"
                          type="number"
                          step="0.01"
                          value={formData.valor_diaria}
                          onChange={(e) => setFormData({ ...formData, valor_diaria: parseFloat(e.target.value) || 0 })}
                          className="input-dark"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="observacao">Observação</Label>
                        <Input
                          id="observacao"
                          value={formData.observacao}
                          onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                          className="input-dark"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button type="submit" className="btn-primary flex-1">Cadastrar</Button>
                        <Button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Custo Aquisição</th>
                      <th>Quantidade</th>
                      <th>Valor Diária</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maquinas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-8">
                          Nenhuma máquina cadastrada
                        </td>
                      </tr>
                    ) : (
                      maquinas.map((maquina) => (
                        <tr key={maquina.id}>
                          <td className="font-medium">{maquina.nome}</td>
                          <td>{formatCurrency(maquina.custo_aquisicao || 0)}</td>
                          <td>{maquina.quantidade || 1}</td>
                          <td className="text-gold font-semibold">{formatCurrency(maquina.valor_diaria || 0)}</td>
                          <td>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              maquina.status === 'locado'
                                ? 'bg-warning/10 text-warning border border-warning/20'
                                : 'bg-success/10 text-success border border-success/20'
                            }`}>
                              {maquina.status === 'locado' ? 'Locado' : 'Disponível'}
                            </span>
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:text-danger hover:bg-danger/10"
                              onClick={() => {
                                setItemToDelete({ ...maquina, tipo: 'maquina' });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contratos">
            <Card className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gold">Contratos de Locação</h2>
                <Dialog open={contratoDialogOpen} onOpenChange={(open) => {
                  setContratoDialogOpen(open);
                  if (!open) resetContratoForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Contrato
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-surface border-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-gold">Novo Contrato de Locação</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleConfirmarContrato} className="space-y-4">
                      <div>
                        <Label htmlFor="maquina">Máquina *</Label>
                        <select
                          id="maquina"
                          value={contratoForm.maquina_id}
                          onChange={(e) => setContratoForm({ ...contratoForm, maquina_id: e.target.value })}
                          className="select-dark w-full"
                          required
                        >
                          <option value="">Selecione uma máquina</option>
                          {maquinas.filter(m => m.status === 'disponivel').map((maquina) => (
                            <option key={maquina.id} value={maquina.id}>
                              {maquina.nome} - {formatCurrency(maquina.valor_diaria)}/dia
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="obra">Obra *</Label>
                        <select
                          id="obra"
                          value={contratoForm.obra_id}
                          onChange={(e) => setContratoForm({ ...contratoForm, obra_id: e.target.value })}
                          className="select-dark w-full"
                          required
                        >
                          <option value="">Selecione uma obra</option>
                          {obras.map((obra) => (
                            <option key={obra.id} value={obra.id}>
                              {obra.nome_obra} - {obra.cliente}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="data_inicio">Data de Início *</Label>
                          <Input
                            id="data_inicio"
                            type="date"
                            value={contratoForm.data_inicio}
                            onChange={(e) => setContratoForm({ ...contratoForm, data_inicio: e.target.value })}
                            className="input-dark"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="dias">Tempo de Locação (dias) *</Label>
                          <Input
                            id="dias"
                            type="number"
                            min="1"
                            value={contratoForm.dias}
                            onChange={(e) => setContratoForm({ ...contratoForm, dias: parseInt(e.target.value) || 1 })}
                            className="input-dark"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
                        <select
                          id="forma_pagamento"
                          value={contratoForm.forma_pagamento}
                          onChange={(e) => setContratoForm({ ...contratoForm, forma_pagamento: e.target.value as 'banco' | 'dinheiro' })}
                          className="select-dark w-full"
                          required
                        >
                          <option value="banco">Banco (Itaú)</option>
                          <option value="dinheiro">Dinheiro (Físico)</option>
                        </select>
                      </div>

                      <div className="p-4 bg-gold/10 border border-gold/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted">Valor Total Calculado:</span>
                          <span className="text-2xl font-bold text-gold">{formatCurrency(valorCalculado)}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button type="submit" className="btn-primary flex-1">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmar Contrato
                        </Button>
                        <Button type="button" onClick={() => setContratoDialogOpen(false)} className="btn-secondary">
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th>Nº Contrato</th>
                      <th>Máquina</th>
                      <th>Obra</th>
                      <th>Período</th>
                      <th>Dias</th>
                      <th>Valor Total</th>
                      <th>Forma Pgto</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contratos.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-8">
                          Nenhum contrato registrado
                        </td>
                      </tr>
                    ) : (
                      contratos.map((contrato) => (
                        <tr key={contrato.id}>
                          <td className="font-mono text-sm">{contrato.numero_contrato}</td>
                          <td className="font-medium">{contrato.maquinas?.nome}</td>
                          <td>{contrato.obras?.nome_obra}</td>
                          <td className="text-sm">
                            {format(new Date(contrato.data_inicio), 'dd/MM/yy')} - {format(new Date(contrato.data_fim), 'dd/MM/yy')}
                          </td>
                          <td>{contrato.dias}</td>
                          <td className="text-gold font-semibold">{formatCurrency(contrato.valor_total)}</td>
                          <td>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              contrato.forma_pagamento === 'banco'
                                ? 'bg-info/10 text-info border border-info/20'
                                : 'bg-success/10 text-success border border-success/20'
                            }`}>
                              {contrato.forma_pagamento === 'banco' ? 'Banco' : 'Dinheiro'}
                            </span>
                          </td>
                          <td>
                            {contrato.recebido ? (
                              <span className="px-2 py-1 text-xs rounded-full bg-success/10 text-success border border-success/20">
                                Recebido
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-warning/10 text-warning border border-warning/20">
                                Ativo
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="flex gap-2">
                              {!contrato.recebido && (
                                <Button
                                  size="sm"
                                  className="btn-primary"
                                  onClick={() => handleMarcarRecebido(contrato)}
                                >
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  Recebido
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger hover:text-danger hover:bg-danger/10"
                                onClick={() => {
                                  setItemToDelete({ ...contrato, tipo: 'contrato' });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-surface border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gold">Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="text-muted">
                Tem certeza que deseja excluir este {itemToDelete?.tipo === 'maquina' ? 'máquina' : 'contrato'}?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="btn-secondary">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="btn-danger bg-danger hover:bg-danger/80">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
