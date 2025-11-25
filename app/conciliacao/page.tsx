"use client";

/**
 * Conciliação Page
 *
 * Bank reconciliation screen with import, link, and manage functionalities
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format-utils';
import { Edit, Eye, Link as LinkIcon, Plus, Trash2, Unlink } from 'lucide-react';
import { EditModeProvider, useEditMode } from '@/lib/edit-mode-context';
import { StatusBadge } from '@/components/status-badge';

interface Extrato {
  id: string;
  conta_id: string;
  data: string;
  historico: string;
  valor: number;
  saldo?: number;
  conciliado_com_transacao_id?: string | null;
}

interface Transacao {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
}

function ConciliacaoContent() {
  const { isEditMode, toggleEditMode } = useEditMode();
  const [extratos, setExtratos] = useState<Extrato[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExtrato, setSelectedExtrato] = useState<Extrato | null>(null);
  const [selectedTransacao, setSelectedTransacao] = useState<string>('');
  const [transacaoTipo, setTransacaoTipo] = useState<'entrada' | 'saida'>('entrada');
  const [stats, setStats] = useState({ total: 0, conciliados: 0, naoConciliados: 0, percentualConciliado: '0' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load extratos
      const extratosRes = await fetch('/api/extratos');
      const extratosData = await extratosRes.json();
      if (extratosData.success) {
        setExtratos(extratosData.data);
      }

      // Load transacoes for linking
      const transacoesRes = await fetch('/api/transacoes');
      const transacoesData = await transacoesRes.json();
      if (transacoesData.success) {
        setTransacoes(transacoesData.data);
      }

      // Load stats
      const statsRes = await fetch('/api/extratos?action=status');
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  async function handleConciliarComTransacao(extratoId: string) {
    if (!selectedTransacao) {
      toast.error('Selecione uma transação');
      return;
    }

    try {
      const res = await fetch('/api/conciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          extratoId,
          transacaoId: selectedTransacao
        })
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Conciliação realizada com sucesso');
        setSelectedExtrato(null);
        setSelectedTransacao('');
        await loadData();
      } else {
        toast.error(result.message || 'Erro ao conciliar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar conciliação');
    }
  }

  async function handleCriarEConciliar(extratoId: string) {
    try {
      const res = await fetch('/api/conciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          extratoId,
          tipo: transacaoTipo,
          categoria: 'Conciliação automática',
          conta: 'banco'
        })
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Transação criada e conciliada com sucesso');
        setSelectedExtrato(null);
        await loadData();
      } else {
        toast.error(result.message || 'Erro ao criar transação');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar criação');
    }
  }

  async function handleDesfazerConciliacao(extratoId: string) {
    try {
      const res = await fetch('/api/conciliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlink',
          extratoId,
          deleteTransacao: false
        })
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Conciliação desfeita com sucesso');
        await loadData();
      } else {
        toast.error(result.message || 'Erro ao desfazer conciliação');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar operação');
    }
  }

  async function handleExcluirExtrato(extratoId: string) {
    if (!confirm('Tem certeza que deseja excluir esta linha de extrato?')) {
      return;
    }

    try {
      const res = await fetch(`/api/extratos?id=${extratoId}`, {
        method: 'DELETE'
      });

      const result = await res.json();

      if (result.success) {
        toast.success('Linha excluída e conciliação atualizada.');
        await loadData();
      } else {
        toast.error(result.message || 'Erro ao excluir linha');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar exclusão');
    }
  }

  function getStatus(extrato: Extrato): string {
    if (extrato.conciliado_com_transacao_id) {
      return 'Conciliado';
    }
    return 'Não conciliado';
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Conciliação Bancária</h1>
            <p className="text-gray-600">Gerencie a conciliação de extratos bancários</p>
          </div>
          <Button onClick={toggleEditMode} variant={isEditMode ? 'default' : 'outline'}>
            {isEditMode ? <><Eye className="mr-2 h-4 w-4" /> Modo Visualização</> : <><Edit className="mr-2 h-4 w-4" /> Modo Edição</>}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Linhas</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Conciliados</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.conciliados}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Não Conciliados</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.naoConciliados}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>% Conciliado</CardDescription>
              <CardTitle className="text-3xl">{stats.percentualConciliado}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Extratos Table */}
        <Card>
          <CardHeader>
            <CardTitle>Linhas de Extrato</CardTitle>
            <CardDescription>Lista de transações bancárias importadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    {isEditMode && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extratos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isEditMode ? 6 : 5} className="text-center text-gray-500">
                        Nenhum extrato encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    extratos.map((extrato) => (
                      <TableRow key={extrato.id}>
                        <TableCell>{formatDate(extrato.data)}</TableCell>
                        <TableCell className="max-w-xs truncate">{extrato.historico}</TableCell>
                        <TableCell className="text-right">{formatCurrency(extrato.valor)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(extrato.saldo)}</TableCell>
                        <TableCell>
                          <StatusBadge status={getStatus(extrato)} />
                        </TableCell>
                        {isEditMode && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!extrato.conciliado_com_transacao_id ? (
                                <>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedExtrato(extrato)}
                                      >
                                        <LinkIcon className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Conciliar com Transação</DialogTitle>
                                        <DialogDescription>
                                          Selecione uma transação existente para vincular
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Transação</Label>
                                          <Select value={selectedTransacao} onValueChange={setSelectedTransacao}>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Selecione uma transação" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {transacoes
                                                .filter(t => Math.abs(t.valor - Math.abs(extrato.valor)) < 0.01)
                                                .map((t) => (
                                                  <SelectItem key={t.id} value={t.id}>
                                                    {formatDate(t.data)} - {t.descricao} - {formatCurrency(t.valor)}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Button onClick={() => handleConciliarComTransacao(extrato.id)} className="w-full">
                                          Conciliar
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedExtrato(extrato)}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Criar e Conciliar</DialogTitle>
                                        <DialogDescription>
                                          Criar nova transação a partir deste extrato
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <Label>Tipo de Transação</Label>
                                          <Select value={transacaoTipo} onValueChange={(v) => setTransacaoTipo(v as 'entrada' | 'saida')}>
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="entrada">Entrada</SelectItem>
                                              <SelectItem value="saida">Saída</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Button onClick={() => handleCriarEConciliar(extrato.id)} className="w-full">
                                          Criar e Conciliar
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDesfazerConciliacao(extrato.id)}
                                >
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleExcluirExtrato(extrato.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function ConciliacaoPage() {
  return (
    <EditModeProvider>
      <ConciliacaoContent />
    </EditModeProvider>
  );
}
