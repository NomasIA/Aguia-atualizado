/**
 * Conciliação Service
 *
 * Handles reconciliation between bank statements (extratos_importados)
 * and financial transactions (transacoes).
 */

import { supabase } from './supabase';
import { createTransacao } from './transacoes-service';

export interface ConciliacaoResult {
  success: boolean;
  message: string;
  transacaoId?: string;
  error?: string;
}

/**
 * Reconcile a bank statement line with an existing transaction
 *
 * @param extratoId - UUID of bank statement line
 * @param transacaoId - UUID of transaction to link
 * @returns Result object with success status
 */
export async function conciliarComTransacao(
  extratoId: string,
  transacaoId: string
): Promise<ConciliacaoResult> {
  try {
    // Verify transaction exists and is not deleted
    const { data: transacao, error: transacaoError } = await supabase
      .from('transacoes')
      .select('id')
      .eq('id', transacaoId)
      .is('deleted_at', null)
      .maybeSingle();

    if (transacaoError || !transacao) {
      return {
        success: false,
        message: 'Transação não encontrada',
        error: transacaoError?.message
      };
    }

    // Verify extrato exists and is not deleted
    const { data: extrato, error: extratoError } = await supabase
      .from('extratos_importados')
      .select('id')
      .eq('id', extratoId)
      .is('deleted_at', null)
      .maybeSingle();

    if (extratoError || !extrato) {
      return {
        success: false,
        message: 'Linha de extrato não encontrada',
        error: extratoError?.message
      };
    }

    // Link extrato to transacao
    const { error: updateError } = await supabase
      .from('extratos_importados')
      .update({
        conciliado_com_transacao_id: transacaoId,
        updated_at: new Date().toISOString()
      })
      .eq('id', extratoId);

    if (updateError) {
      return {
        success: false,
        message: 'Erro ao conciliar',
        error: updateError.message
      };
    }

    return {
      success: true,
      message: 'Conciliação realizada com sucesso',
      transacaoId
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao processar conciliação',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a new transaction from bank statement line and reconcile automatically
 *
 * @param extratoId - UUID of bank statement line
 * @param tipo - Transaction type ('entrada' or 'saida')
 * @param categoria - Optional category
 * @param conta - Optional account (defaults to 'banco')
 * @returns Result object with created transaction ID
 */
export async function criarTransacaoEConciliar(
  extratoId: string,
  tipo: 'entrada' | 'saida',
  categoria?: string,
  conta: string = 'banco'
): Promise<ConciliacaoResult> {
  try {
    // Get extrato details
    const { data: extrato, error: extratoError } = await supabase
      .from('extratos_importados')
      .select('*')
      .eq('id', extratoId)
      .is('deleted_at', null)
      .maybeSingle();

    if (extratoError || !extrato) {
      return {
        success: false,
        message: 'Linha de extrato não encontrada',
        error: extratoError?.message
      };
    }

    // Check if already reconciled
    if (extrato.conciliado_com_transacao_id) {
      return {
        success: false,
        message: 'Linha já está conciliada',
        error: 'Already reconciled'
      };
    }

    // Create transaction
    const transacao = await createTransacao({
      data: extrato.data,
      descricao: extrato.historico,
      valor: Math.abs(extrato.valor),
      tipo,
      forma_pagamento: 'banco',
      categoria: categoria || 'Conciliação automática',
      conta
    });

    if (!transacao) {
      return {
        success: false,
        message: 'Erro ao criar transação',
        error: 'Transaction creation failed'
      };
    }

    // Link extrato to new transacao
    const { error: linkError } = await supabase
      .from('extratos_importados')
      .update({
        conciliado_com_transacao_id: transacao.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', extratoId);

    if (linkError) {
      // Rollback: delete created transaction
      await supabase
        .from('transacoes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', transacao.id);

      return {
        success: false,
        message: 'Erro ao vincular conciliação',
        error: linkError.message
      };
    }

    return {
      success: true,
      message: 'Transação criada e conciliada com sucesso',
      transacaoId: transacao.id
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao processar criação e conciliação',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Unlink reconciliation between bank statement and transaction
 * Does not delete the transaction by default
 *
 * @param extratoId - UUID of bank statement line
 * @param deleteTransacao - Whether to also soft delete the linked transaction (default: false)
 * @returns Result object with success status
 */
export async function desfazerConciliacao(
  extratoId: string,
  deleteTransacao: boolean = false
): Promise<ConciliacaoResult> {
  try {
    // Get extrato details
    const { data: extrato, error: extratoError } = await supabase
      .from('extratos_importados')
      .select('conciliado_com_transacao_id')
      .eq('id', extratoId)
      .is('deleted_at', null)
      .maybeSingle();

    if (extratoError || !extrato) {
      return {
        success: false,
        message: 'Linha de extrato não encontrada',
        error: extratoError?.message
      };
    }

    const transacaoId = extrato.conciliado_com_transacao_id;

    // Unlink reconciliation
    const { error: unlinkError } = await supabase
      .from('extratos_importados')
      .update({
        conciliado_com_transacao_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', extratoId);

    if (unlinkError) {
      return {
        success: false,
        message: 'Erro ao desfazer conciliação',
        error: unlinkError.message
      };
    }

    // Optionally delete linked transaction
    if (deleteTransacao && transacaoId) {
      await supabase
        .from('transacoes')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transacaoId);
    }

    return {
      success: true,
      message: deleteTransacao
        ? 'Conciliação desfeita e transação excluída'
        : 'Conciliação desfeita com sucesso'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao processar desfazer conciliação',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Attempt automatic reconciliation based on matching criteria
 * Matches: same amount, date within ±2 days, same account
 *
 * @param extratoId - UUID of bank statement line
 * @param contaId - Account identifier to match
 * @returns Result object with reconciliation status
 */
export async function tentarConciliacaoAutomatica(
  extratoId: string,
  contaId?: string
): Promise<ConciliacaoResult> {
  try {
    // Get extrato details
    const { data: extrato, error: extratoError } = await supabase
      .from('extratos_importados')
      .select('*')
      .eq('id', extratoId)
      .is('deleted_at', null)
      .maybeSingle();

    if (extratoError || !extrato) {
      return {
        success: false,
        message: 'Linha de extrato não encontrada',
        error: extratoError?.message
      };
    }

    // Check if already reconciled
    if (extrato.conciliado_com_transacao_id) {
      return {
        success: false,
        message: 'Linha já está conciliada',
        error: 'Already reconciled'
      };
    }

    // Calculate date range (±2 days)
    const dataExtrato = new Date(extrato.data);
    const dataMin = new Date(dataExtrato);
    dataMin.setDate(dataMin.getDate() - 2);
    const dataMax = new Date(dataExtrato);
    dataMax.setDate(dataMax.getDate() + 2);

    // Find matching transaction
    let query = supabase
      .from('transacoes')
      .select('*')
      .is('deleted_at', null)
      .eq('valor', Math.abs(extrato.valor))
      .gte('data', dataMin.toISOString().split('T')[0])
      .lte('data', dataMax.toISOString().split('T')[0]);

    if (contaId) {
      query = query.eq('conta', contaId);
    }

    const { data: transacoes, error: transError } = await query;

    if (transError || !transacoes || transacoes.length === 0) {
      return {
        success: false,
        message: 'Nenhuma transação correspondente encontrada',
        error: 'No match found'
      };
    }

    // If multiple matches, use the closest date
    const closest = transacoes.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev.data).getTime() - dataExtrato.getTime());
      const currDiff = Math.abs(new Date(curr.data).getTime() - dataExtrato.getTime());
      return currDiff < prevDiff ? curr : prev;
    });

    // Reconcile with closest match
    return await conciliarComTransacao(extratoId, closest.id);
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao tentar conciliação automática',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
