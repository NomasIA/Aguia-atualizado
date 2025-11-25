/**
 * Extratos Service
 *
 * Handles business logic for imported bank statements (extratos_importados table)
 * including import with deduplication, reconciliation, and soft delete.
 */

import { supabase } from './supabase';
import { createHash } from 'crypto';
import { createTransacao } from './transacoes-service';

export interface ExtratoImportado {
  id: string;
  conta_id: string;
  data: string;
  historico: string;
  valor: number;
  saldo?: number;
  hash_unico: string;
  source: string;
  conciliado_com_transacao_id?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExtratoImportInput {
  conta_id: string;
  data: string;
  historico: string;
  valor: number;
  saldo?: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: number;
  message: string;
  details?: Array<{
    linha: number;
    status: 'imported' | 'duplicate' | 'error';
    hash?: string;
  }>;
}

export interface SoftDeleteExtratoResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Generate unique hash for bank statement line
 * Used for deduplication
 *
 * @param linha - Statement line data
 * @returns SHA-256 hash string
 */
export function generateExtratoHash(linha: ExtratoImportInput): string {
  const dataStr = new Date(linha.data).toISOString().split('T')[0];
  const valorStr = linha.valor.toFixed(2);
  const historicoNorm = linha.historico.trim().toLowerCase();

  const composite = `${linha.conta_id}|${dataStr}|${valorStr}|${historicoNorm}`;
  return createHash('sha256').update(composite).digest('hex');
}

/**
 * Import bank statement lines with deduplication
 * Checks hash_unico to prevent duplicate imports
 *
 * @param linhas - Array of statement lines to import
 * @param source - Import source ('manual_upload', 'api', etc.)
 * @returns Import result with statistics
 */
export async function importExtratos(
  linhas: ExtratoImportInput[],
  source: string = 'manual_upload'
): Promise<ImportResult> {
  let imported = 0;
  let duplicates = 0;
  let errors = 0;
  const details: Array<{
    linha: number;
    status: 'imported' | 'duplicate' | 'error';
    hash?: string;
  }> = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];

    try {
      // Generate unique hash
      const hash = generateExtratoHash(linha);

      // Check if hash already exists
      const { data: existing } = await supabase
        .from('extratos_importados')
        .select('id')
        .eq('hash_unico', hash)
        .maybeSingle();

      if (existing) {
        // Duplicate - skip
        duplicates++;
        details.push({ linha: i + 1, status: 'duplicate', hash });
        continue;
      }

      // Insert new statement line
      const { error: insertError } = await supabase
        .from('extratos_importados')
        .insert([{
          conta_id: linha.conta_id,
          data: linha.data,
          historico: linha.historico,
          valor: linha.valor,
          saldo: linha.saldo,
          hash_unico: hash,
          source,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (insertError) {
        errors++;
        details.push({ linha: i + 1, status: 'error' });
        console.error(`Error importing line ${i + 1}:`, insertError);
      } else {
        imported++;
        details.push({ linha: i + 1, status: 'imported', hash });
      }
    } catch (error) {
      errors++;
      details.push({ linha: i + 1, status: 'error' });
      console.error(`Error processing line ${i + 1}:`, error);
    }
  }

  return {
    success: errors === 0,
    imported,
    duplicates,
    errors,
    message: `Importação concluída: ${imported} linhas importadas, ${duplicates} duplicadas, ${errors} erros.`,
    details
  };
}

/**
 * Soft delete a bank statement line
 * Only allows deletion of 'manual_upload' source
 * Unlinks reconciliation if exists
 *
 * @param extratoId - UUID of statement line to delete
 * @returns Result object with success status and message
 */
export async function softDeleteExtrato(extratoId: string): Promise<SoftDeleteExtratoResult> {
  try {
    // Get statement line to check source
    const { data: extrato, error: fetchError } = await supabase
      .from('extratos_importados')
      .select('*')
      .eq('id', extratoId)
      .maybeSingle();

    if (fetchError || !extrato) {
      return {
        success: false,
        message: 'Linha de extrato não encontrada',
        error: fetchError?.message
      };
    }

    // Check if source is manual_upload
    if (extrato.source !== 'manual_upload') {
      return {
        success: false,
        message: 'Apenas linhas importadas manualmente podem ser excluídas',
        error: 'Invalid source'
      };
    }

    // Mark as deleted
    const { error: deleteError } = await supabase
      .from('extratos_importados')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        conciliado_com_transacao_id: null // Unlink reconciliation
      })
      .eq('id', extratoId);

    if (deleteError) {
      return {
        success: false,
        message: 'Erro ao excluir linha',
        error: deleteError.message
      };
    }

    return {
      success: true,
      message: 'Linha excluída e conciliação atualizada.'
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
 * Get all active bank statement lines (not soft deleted)
 *
 * @param filters - Optional filters
 * @returns Array of active statement lines
 */
export async function getActiveExtratos(filters?: {
  conta_id?: string;
  dataInicio?: string;
  dataFim?: string;
  conciliado?: boolean;
}): Promise<ExtratoImportado[]> {
  let query = supabase
    .from('extratos_importados')
    .select('*')
    .is('deleted_at', null)
    .order('data', { ascending: false });

  if (filters?.conta_id) {
    query = query.eq('conta_id', filters.conta_id);
  }
  if (filters?.dataInicio) {
    query = query.gte('data', filters.dataInicio);
  }
  if (filters?.dataFim) {
    query = query.lte('data', filters.dataFim);
  }
  if (filters?.conciliado === true) {
    query = query.not('conciliado_com_transacao_id', 'is', null);
  } else if (filters?.conciliado === false) {
    query = query.is('conciliado_com_transacao_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching extratos:', error);
    return [];
  }

  return data || [];
}

/**
 * Get reconciliation status for statement lines
 *
 * @param conta_id - Optional filter by account
 * @returns Statistics about reconciliation
 */
export async function getReconciliationStatus(conta_id?: string) {
  const extratos = await getActiveExtratos({ conta_id });

  const conciliados = extratos.filter(e => e.conciliado_com_transacao_id).length;
  const naoConciliados = extratos.filter(e => !e.conciliado_com_transacao_id).length;

  return {
    total: extratos.length,
    conciliados,
    naoConciliados,
    percentualConciliado: extratos.length > 0
      ? (conciliados / extratos.length * 100).toFixed(1)
      : '0'
  };
}
