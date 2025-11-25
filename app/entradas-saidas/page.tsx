'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Download, Filter, TrendingUp, TrendingDown, Trash2, Edit, Eye, EyeOff, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { recalcAll, createLedgerEntry } from '@/lib/ledger-sync';
import { revalidateAll } from '@/lib/revalidation-utils';

interface Transaction {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  forma: 'banco' | 'dinheiro';
  categoria: string;
  descricao: string;
  valor: number;
  observacao: string;
  deleted_at: string | null;
}

export default function EntradasSaidasPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    tipo: '',
    forma: '',
    categoria: '',
  });

  const [formData, setFormData] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    tipo: 'entrada' as 'entrada' | 'saida',
    forma: 'banco' as 'banco' | 'dinheiro',
    categoria: 'receita',
    descricao: '',
    valor: 0,
    observacao: '',
  });

  useEffect(() => {
    loadTransactions();
  }, [showDeleted]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadTransactions = async () => {
    try {
      let query = supabase
        .from('cash_ledger')
        .select('*')
        .order('data', { ascending: false });

      if (!showDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.dataInicio) {
      filtered = filtered.filter(t => t.data >= filters.dataInicio);
    }
    if (filters.dataFim) {
      filtered = filtered.filter(t => t.data <= filters.dataFim);
    }
    if (filters.tipo) {
      filtered = filtered.filter(t => t.tipo === filters.tipo);
    }
    if (filters.forma) {
      filtered = filtered.filter(t => t.forma === filters.forma);
    }
    if (filters.categoria) {
      filtered = filtered.filter(t => t.categoria.toLowerCase().includes(filters.categoria.toLowerCase()));
    }

    setFilteredTransactions(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: bankAccount } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('nome', 'Itaú – Conta Principal')
        .maybeSingle();

      const { data: cashBook } = await supabase
        .from('cash_books')
        .select('id')
        .eq('nome', 'Caixa Dinheiro (Físico)')
        .maybeSingle();

      const transaction = {
        data: formData.data,
        tipo: formData.tipo,
        forma: formData.forma,
        categoria: formData.categoria,
        descricao: formData.descricao,
        valor: formData.valor,
        observacao: formData.observacao,
        bank_account_id: formData.forma === 'banco' ? bankAccount?.id : null,
        cash_book_id: formData.forma === 'dinheiro' ? cashBook?.id : null,
        updated_at: new Date().toISOString(),
      };

      if (editingTransaction) {
        // Update existing transaction
        console.log('Atualizando transação:', transaction);
        console.log('ID da transação:', editingTransaction.id);

        const { data: updated, error } = await supabase
          .from('cash_ledger')
          .update(transaction)
          .eq('id', editingTransaction.id)
          .select();

        if (error) {
          console.error('Erro ao atualizar:', error);
          throw error;
        }

        console.log('Transação atualizada:', updated);

        // Recalcular saldos após edição
        await recalcAll();

        toast({ title: 'Sucesso', description: 'Transação atualizada com sucesso' });
      } else {
        // Insert new transaction
        const { error } = await supabase.from('cash_ledger').insert([transaction]);

        if (error) throw error;

        toast({ title: 'Sucesso', description: 'Transação registrada com sucesso' });
      }

      setDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      loadTransactions();

      // Trigger global revalidation
      revalidateAll();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      toast({ title: 'Erro', description: 'Não foi possível registrar a transação', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      data: format(new Date(), 'yyyy-MM-dd'),
      tipo: 'entrada',
      forma: 'banco',
      categoria: 'receita',
      descricao: '',
      valor: 0,
      observacao: '',
    });
    setEditingTransaction(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      data: transaction.data,
      tipo: transaction.tipo,
      forma: transaction.forma,
      categoria: transaction.categoria,
      descricao: transaction.descricao,
      valor: transaction.valor,
      observacao: transaction.observacao || '',
    });
    setDialogOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Tipo', 'Forma', 'Categoria', 'Descrição', 'Valor'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.data + 'T00:00:00'), 'dd/MM/yyyy'),
      t.tipo.toUpperCase(),
      t.forma === 'banco' ? 'Banco (Itaú)' : 'Dinheiro (Físico)',
      t.categoria,
      t.descricao,
      t.valor.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    try {
      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('cash_ledger')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', transactionToDelete.id);

      if (error) throw error;

      // Recalcular tudo e atualizar saldos
      await recalcAll();

      toast({
        title: 'Sucesso',
        description: 'Transação excluída. Saldos recalculados.'
      });

      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      loadTransactions();

      // Trigger global revalidation
      revalidateAll();
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a transação',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          console.log('Dados importados:', jsonData);

          const { data: bankAccount } = await supabase
            .from('bank_accounts')
            .select('id')
            .eq('nome', 'Itaú – Conta Principal')
            .maybeSingle();

          let importedCount = 0;
          let skippedCount = 0;

          for (const row of jsonData as any[]) {
            const data = row['Data'] || row['data'] || row['DATE'];
            const descricao = row['Descrição'] || row['Descricao'] || row['descricao'] || row['Historico'] || row['historico'] || row['DESCRIPTION'];
            const valorStr = String(row['Valor'] || row['valor'] || row['VALUE'] || '0').replace(/\./g, '').replace(',', '.');
            const valor = parseFloat(valorStr);

            if (!data || !descricao || isNaN(valor)) {
              skippedCount++;
              continue;
            }

            const dateFormatted = typeof data === 'string'
              ? data.split('/').reverse().join('-')
              : new Date(data).toISOString().split('T')[0];

            const tipo = valor >= 0 ? 'entrada' : 'saida';
            const valorAbs = Math.abs(valor);

            const hash = `${dateFormatted}-${descricao.trim()}-${valorAbs.toFixed(2)}-${Date.now()}-${Math.random()}`;

            const { data: existing } = await supabase
              .from('extratos_importados')
              .select('id')
              .eq('data', dateFormatted)
              .eq('historico', descricao.trim())
              .eq('valor', valorAbs)
              .maybeSingle();

            if (existing) {
              skippedCount++;
              continue;
            }

            await supabase.from('extratos_importados').insert({
              conta_id: 'itau-principal',
              data: dateFormatted,
              historico: descricao.trim(),
              valor: valorAbs,
              hash_unico: hash,
              source: 'manual_upload',
            });

            await supabase.from('cash_ledger').insert({
              data: dateFormatted,
              tipo: tipo,
              forma: 'banco',
              categoria: 'Importação Automática',
              descricao: descricao.trim(),
              valor: valorAbs,
              bank_account_id: bankAccount?.id,
              observacao: 'Importado do extrato bancário',
            });

            importedCount++;
          }

          await recalcAll();

          toast({
            title: 'Importação concluída',
            description: `${importedCount} transações importadas, ${skippedCount} duplicadas ignoradas.`,
          });

          setImportDialogOpen(false);
          loadTransactions();
          revalidateAll();
        } catch (error) {
          console.error('Erro ao processar arquivo:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível processar o arquivo',
            variant: 'destructive',
          });
        } finally {
          setImporting(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Erro ao importar arquivo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível importar o arquivo',
        variant: 'destructive',
      });
      setImporting(false);
    }
  };

  const getSubtotals = () => {
    const entradas = filteredTransactions
      .filter(t => t.tipo === 'entrada')
      .reduce((sum, t) => sum + t.valor, 0);

    const saidas = filteredTransactions
      .filter(t => t.tipo === 'saida')
      .reduce((sum, t) => sum + t.valor, 0);

    const entradasBanco = filteredTransactions
      .filter(t => t.tipo === 'entrada' && t.forma === 'banco')
      .reduce((sum, t) => sum + t.valor, 0);

    const entradasDinheiro = filteredTransactions
      .filter(t => t.tipo === 'entrada' && t.forma === 'dinheiro')
      .reduce((sum, t) => sum + t.valor, 0);

    const saidasBanco = filteredTransactions
      .filter(t => t.tipo === 'saida' && t.forma === 'banco')
      .reduce((sum, t) => sum + t.valor, 0);

    const saidasDinheiro = filteredTransactions
      .filter(t => t.tipo === 'saida' && t.forma === 'dinheiro')
      .reduce((sum, t) => sum + t.valor, 0);

    return { entradas, saidas, saldo: entradas - saidas, entradasBanco, entradasDinheiro, saidasBanco, saidasDinheiro };
  };

  const subtotals = getSubtotals();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gold text-lg">Carregando transações...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gold glow-gold mb-2">Entradas & Saídas</h1>
            <p className="text-muted">Histórico completo de transações financeiras</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowDeleted(!showDeleted)}
              className="btn-secondary"
              variant="outline"
            >
              {showDeleted ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showDeleted ? 'Ocultar excluídas' : 'Ver excluídas'}
            </Button>
            <Button onClick={exportToCSV} className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-secondary">
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Extrato
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-border">
                <DialogHeader>
                  <DialogTitle className="text-gold">Importar Extrato Bancário</DialogTitle>
                  <DialogDescription className="text-muted">
                    Faça upload de um arquivo Excel ou CSV com as transações do banco.
                    O arquivo deve conter as colunas: Data, Descrição e Valor.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportFile}
                      disabled={importing}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-12 h-12 text-gold mb-4" />
                      <p className="text-sm font-medium mb-1">
                        {importing ? 'Importando...' : 'Clique para selecionar arquivo'}
                      </p>
                      <p className="text-xs text-muted">
                        Formatos aceitos: Excel (.xlsx, .xls) ou CSV
                      </p>
                    </label>
                  </div>
                  <div className="bg-black/30 rounded p-4 text-sm text-muted space-y-2">
                    <p className="font-medium text-gold">Formato esperado do arquivo:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Data:</strong> Formato DD/MM/AAAA ou AAAA-MM-DD</li>
                      <li><strong>Descrição:</strong> Texto descritivo da transação</li>
                      <li><strong>Valor:</strong> Número positivo para entrada, negativo para saída</li>
                    </ul>
                    <p className="mt-3 text-xs">
                      ℹ️ Transações duplicadas serão automaticamente ignoradas
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-border max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-gold">
                    {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Data</label>
                      <Input
                        type="date"
                        value={formData.data}
                        onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                        required
                        className="input-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Tipo</label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                        className="select-dark w-full"
                      >
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Forma</label>
                      <select
                        value={formData.forma}
                        onChange={(e) => setFormData({ ...formData, forma: e.target.value as any })}
                        className="select-dark w-full"
                      >
                        <option value="banco">Banco (Itaú)</option>
                        <option value="dinheiro">Dinheiro (Físico)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Categoria</label>
                      <Input
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        required
                        className="input-dark"
                        placeholder="ex: receita, fornecedor"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Descrição</label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      required
                      className="input-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Valor</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                      required
                      className="input-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Observação</label>
                    <Input
                      value={formData.observacao}
                      onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                      className="input-dark"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="btn-primary flex-1">
                      {editingTransaction ? 'Atualizar' : 'Registrar'}
                    </Button>
                    <Button type="button" onClick={() => setDialogOpen(false)} className="btn-secondary">
                      Cancelar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="card p-6">
          <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data Início</label>
              <Input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data Fim</label>
              <Input
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                className="input-dark"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                className="select-dark w-full"
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Forma</label>
              <select
                value={filters.forma}
                onChange={(e) => setFilters({ ...filters, forma: e.target.value })}
                className="select-dark w-full"
              >
                <option value="">Todas</option>
                <option value="banco">Banco</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Categoria</label>
              <Input
                value={filters.categoria}
                onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
                placeholder="Buscar..."
                className="input-dark"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="card p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-success" />
              <div>
                <p className="text-xs text-muted">Total Entradas</p>
                <p className="text-xl font-bold text-success">{formatCurrency(subtotals.entradas)}</p>
              </div>
            </div>
          </Card>
          <Card className="card p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-danger" />
              <div>
                <p className="text-xs text-muted">Total Saídas</p>
                <p className="text-xl font-bold text-danger">{formatCurrency(subtotals.saidas)}</p>
              </div>
            </div>
          </Card>
          <Card className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">B</span>
              </div>
              <div>
                <p className="text-xs text-muted">Saldo Banco</p>
                <p className="text-lg font-bold">{formatCurrency(subtotals.entradasBanco - subtotals.saidasBanco)}</p>
              </div>
            </div>
          </Card>
          <Card className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <span className="text-success font-bold text-sm">D</span>
              </div>
              <div>
                <p className="text-xs text-muted">Saldo Dinheiro</p>
                <p className="text-lg font-bold">{formatCurrency(subtotals.entradasDinheiro - subtotals.saidasDinheiro)}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="card">
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Forma</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-8">
                      Nenhuma transação encontrada
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className={transaction.deleted_at ? 'opacity-50' : ''}>
                      <td>{format(new Date(transaction.data + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                      <td>
                        {transaction.tipo === 'entrada' ? (
                          <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                            Entrada
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-danger/10 text-danger rounded-full">
                            Saída
                          </span>
                        )}
                      </td>
                      <td>
                        {transaction.forma === 'banco' ? (
                          <span className="chip-banco">Banco (Itaú)</span>
                        ) : (
                          <span className="chip-dinheiro">Dinheiro (Físico)</span>
                        )}
                      </td>
                      <td className="capitalize">{transaction.categoria}</td>
                      <td>{transaction.descricao}</td>
                      <td className={`font-semibold ${transaction.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                        {transaction.tipo === 'entrada' ? '+' : '-'} {formatCurrency(transaction.valor)}
                      </td>
                      <td>
                        {transaction.deleted_at ? (
                          <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                            🗑️ Excluído
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-gold hover:text-gold hover:bg-gold/10"
                              onClick={() => handleEdit(transaction)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:text-danger hover:bg-danger/10"
                              onClick={() => {
                                setTransactionToDelete(transaction);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-surface border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gold">Excluir Transação</AlertDialogTitle>
              <AlertDialogDescription className="text-muted">
                Tem certeza que deseja excluir esta transação? Esta ação irá atualizar os saldos de Banco e Caixa imediatamente.
                {transactionToDelete && (
                  <div className="mt-4 p-3 bg-black/30 rounded border border-border">
                    <p><strong>Data:</strong> {format(new Date(transactionToDelete.data + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                    <p><strong>Descrição:</strong> {transactionToDelete.descricao}</p>
                    <p><strong>Valor:</strong> {formatCurrency(transactionToDelete.valor)}</p>
                  </div>
                )}
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
