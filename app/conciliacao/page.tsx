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
import { Edit, Eye, Link as LinkIcon, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { EditModeProvider, useEditMode } from '@/lib/edit-mode-context';
import { StatusBadge } from '@/components/status-badge';
import { isConciliacaoEnabled } from '@/lib/feature-flags';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  forma_pagamento?: string;
  categoria?: string;
  conta?: string;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConciliarDialogOpen, setBulkConciliarDialogOpen] = useState(false);

  // Check if conciliation feature is enabled
  const conciliacaoEnabled = isConciliacaoEnabled();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!conciliacaoEnabled) {
      setLoading(false);
      return;
    }

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


  function toggleSelection(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    if (selectedIds.size === extratos.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(extratos.map(e => e.id));
      setSelectedIds(allIds);
    }
  }

  async function handleBulkConciliar() {
    if (selectedIds.size === 0) return;

    try {
      const idsArray = Array.from(selectedIds);
      console.log(`Conciliando ${idsArray.length} extratos...`);

      // Criar e conciliar cada extrato
      const conciliarPromises = idsArray.map(extratoId =>
        fetch('/api/conciliacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            extratoId,
            tipo: 'entrada',
            categoria: 'Conciliação automática',
            conta: 'banco'
          })
        }).then(r => r.json())
      );

      const results = await Promise.all(conciliarPromises);

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.length - successCount;

      if (errorCount === 0) {
        toast.success(`${successCount} linha(s) conciliada(s) com sucesso`);
      } else {
        toast.error(`${successCount} conciliada(s), ${errorCount} com erro`);
      }

      setBulkConciliarDialogOpen(false);
      setSelectedIds(new Set());
      await loadData();
    } catch (error) {
      console.error('Erro ao conciliar extratos:', error);
      toast.error('Erro ao processar conciliação');
    }
  }

  function getStatus(extrato: Extrato): string {
    if (extrato.conciliado_com_transacao_id) {
      return 'Conciliado';
    }
    return 'Não conciliado';
  }

  if (!conciliacaoEnabled) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Funcionalidade Desabilitada</AlertTitle>
            <AlertDescription>
              A conciliação bancária está desabilitada. Para habilitar, configure ENABLE_CONCILIACAO=true no arquivo .env
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
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
          <div className="flex gap-3">
            {isEditMode && selectedIds.size > 0 && (
              <Button
                onClick={() => setBulkConciliarDialogOpen(true)}
                variant="default"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Conciliar {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
              </Button>
            )}
            <Button onClick={toggleEditMode} variant={isEditMode ? 'default' : 'outline'}>
              {isEditMode ? <><Eye className="mr-2 h-4 w-4" /> Modo Visualização</> : <><Edit className="mr-2 h-4 w-4" /> Modo Edição</>}
            </Button>
          </div>
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
            <CardTitle>Linhas de Extrato Bancário</CardTitle>
            <CardDescription>Extratos bancários importados para conciliação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isEditMode && (
                      <TableHead className="w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="text-gold hover:text-gold/80"
                          title="Selecionar todos"
                        >
                          {selectedIds.size === extratos.length && extratos.length > 0 ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Status</TableHead>
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
                        {isEditMode && (
                          <TableCell>
                            <button
                              onClick={() => toggleSelection(extrato.id)}
                              className="text-gold hover:text-gold/80"
                            >
                              {selectedIds.has(extrato.id) ? (
                                <CheckSquare className="w-5 h-5" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell>{formatDate(extrato.data)}</TableCell>
                        <TableCell className="max-w-xs truncate">{extrato.historico}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${extrato.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {extrato.valor >= 0 ? 'ENTRADA' : 'SAÍDA'} {formatCurrency(Math.abs(extrato.valor))}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(extrato.saldo)}</TableCell>
                        <TableCell>
                          <StatusBadge status={getStatus(extrato)} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Conciliar Dialog */}
        <Dialog open={bulkConciliarDialogOpen} onOpenChange={setBulkConciliarDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conciliar Múltiplas Linhas</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja criar transações e conciliar automaticamente {selectedIds.size} linha(s) de extrato selecionada(s)?
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-semibold mb-2 text-blue-900">Linhas a conciliar:</p>
                  <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                    {Array.from(selectedIds).map(id => {
                      const extrato = extratos.find(e => e.id === id);
                      if (!extrato) return null;
                      return (
                        <li key={id} className="text-blue-800">
                          {formatDate(extrato.data)} - {extrato.historico} - {formatCurrency(extrato.valor)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> Para excluir linhas conciliadas, use a aba "Entradas & Saídas". Ao excluir uma transação, o extrato vinculado será automaticamente excluído.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setBulkConciliarDialogOpen(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleBulkConciliar} variant="default" className="flex-1">
                Conciliar {selectedIds.size} linha(s)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
