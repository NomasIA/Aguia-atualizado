/**
 * Transações Service
 *
 * Handles business logic for financial transactions (transacoes table)
 * including soft delete, KPI recalculation, and reconciliation updates.
 */

import { supabase } from './supabase';

export interface Transacao {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida';
  forma_pagamento?: string;
  categoria?: string;
  conta?: string;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SoftDeleteResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Soft delete a transaction by setting deleted_at timestamp
 * Triggers KPI recalculation and reconciliation updates
 *
 * @param transacaoId - UUID of the transaction to delete
 * @returns Result object with success status and message
 */
export async function softDeleteTransacao(transacaoId: string): Promise<SoftDeleteResult> {
  try {
    // Mark transaction as deleted
    const { error: deleteError } = await supabase
      .from('transacoes')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transacaoId);

    if (deleteError) {
      return {
        success: false,
        message: 'Erro ao excluir transação',
        error: deleteError.message
      };
    }

    // Delete any reconciled bank statements (soft delete)
    await supabase
      .from('extratos_importados')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        conciliado_com_transacao_id: null
      })
      .eq('conciliado_com_transacao_id', transacaoId);

    // Note: KPI recalculation happens automatically in queries by filtering deleted_at IS NULL

    return {
      success: true,
      message: 'Exclusão processada e conciliação atualizada.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao processar exclusão',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all active transactions (not soft deleted)
 * Used for KPI calculations, reports, and reconciliation
 *
 * @param filters - Optional filters (date range, type, conta, etc.)
 * @returns Array of active transactions
 */
export async function getActiveTransacoes(filters?: {
  dataInicio?: string;
  dataFim?: string;
  tipo?: 'entrada' | 'saida';
  conta?: string;
  categoria?: string;
}): Promise<Transacao[]> {
  let query = supabase
    .from('transacoes')
    .select('*')
    .is('deleted_at', null)
    .order('data', { ascending: false });

  if (filters?.dataInicio) {
    query = query.gte('data', filters.dataInicio);
  }
  if (filters?.dataFim) {
    query = query.lte('data', filters.dataFim);
  }
  if (filters?.tipo) {
    query = query.eq('tipo', filters.tipo);
  }
  if (filters?.conta) {
    query = query.eq('conta', filters.conta);
  }
  if (filters?.categoria) {
    query = query.eq('categoria', filters.categoria);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new transaction
 *
 * @param transacao - Transaction data to create
 * @returns Created transaction or null on error
 */
export async function createTransacao(
  transacao: Omit<Transacao, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<Transacao | null> {
  try {
    const { data, error } = await supabase
      .from('transacoes')
      .insert([{
        ...transacao,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
}

/**
 * Update an existing transaction
 *
 * @param transacaoId - UUID of transaction to update
 * @param updates - Fields to update
 * @returns Updated transaction or null on error
 */
export async function updateTransacao(
  transacaoId: string,
  updates: Partial<Omit<Transacao, 'id' | 'created_at' | 'deleted_at'>>
): Promise<Transacao | null> {
  try {
    const { data, error } = await supabase
      .from('transacoes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', transacaoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating transaction:', error);
    return null;
  }
}

/**
 * Calculate KPIs from active transactions
 * Used by dashboards and reports
 *
 * @param filters - Optional date range filters
 * @returns KPI metrics
 */
export async function calculateTransacoesKPIs(filters?: {
  dataInicio?: string;
  dataFim?: string;
}) {
  const transacoes = await getActiveTransacoes(filters);

  const entradas = transacoes
    .filter(t => t.tipo === 'entrada')
    .reduce((sum, t) => sum + t.valor, 0);

  const saidas = transacoes
    .filter(t => t.tipo === 'saida')
    .reduce((sum, t) => sum + t.valor, 0);

  const saldo = entradas - saidas;

  // Group by conta
  const porConta = transacoes.reduce((acc, t) => {
    if (!t.conta) return acc;
    if (!acc[t.conta]) {
      acc[t.conta] = { entradas: 0, saidas: 0, saldo: 0 };
    }
    if (t.tipo === 'entrada') {
      acc[t.conta].entradas += t.valor;
    } else {
      acc[t.conta].saidas += t.valor;
    }
    acc[t.conta].saldo = acc[t.conta].entradas - acc[t.conta].saidas;
    return acc;
  }, {} as Record<string, { entradas: number; saidas: number; saldo: number }>);

  return {
    totalEntradas: entradas,
    totalSaidas: saidas,
    saldo,
    porConta,
    totalTransacoes: transacoes.length
  };
}
