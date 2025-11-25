/**
 * Custos Fixos Service
 *
 * Handles business logic for fixed costs (custos_fixos table)
 * including payment processing with automatic transaction creation
 * and reconciliation.
 */

import { supabase } from './supabase';
import { ajustarDataUtil } from './business-days-service';
import { createTransacao } from './transacoes-service';
import { tentarConciliacaoAutomatica } from './conciliacao-service';

export interface CustoFixo {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  periodicidade?: string;
  dia_vencimento?: number;
  competencia?: string;
  data_vencimento?: string;
  pago?: boolean;
  data_pagamento?: string;
  tipo_pagamento?: string;
  conta_pagamento?: string;
  transacao_id?: string | null;
  ativo?: boolean;
  observacao?: string;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PagamentoCustoFixoResult {
  success: boolean;
  message: string;
  transacaoId?: string;
  dataAjustada?: string;
  conciliadoAutomaticamente?: boolean;
  error?: string;
}

/**
 * Mark fixed cost as paid and create transaction automatically
 * Prevents duplicate monthly transactions using competencia field
 *
 * @param custoFixoId - UUID of fixed cost
 * @param dataPagamento - Optional payment date (defaults to today, will be adjusted to business day)
 * @param conta_pagamento - Payment account ('banco', 'dinheiro', etc.)
 * @param tipo_pagamento - Payment type/method
 * @returns Result with transaction ID and adjusted date
 */
export async function marcarCustoFixoComoPago(
  custoFixoId: string,
  dataPagamento?: string,
  conta_pagamento: string = 'banco',
  tipo_pagamento: string = 'transferencia'
): Promise<PagamentoCustoFixoResult> {
  try {
    // 1. Fetch fixed cost
    const { data: custoFixo, error: fetchError } = await supabase
      .from('custos_fixos')
      .select('*')
      .eq('id', custoFixoId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !custoFixo) {
      return {
        success: false,
        message: 'Custo fixo não encontrado',
        error: fetchError?.message
      };
    }

    // 2. Check if already paid for this competencia
    if (custoFixo.pago && custoFixo.transacao_id && custoFixo.competencia) {
      return {
        success: false,
        message: 'Custo fixo já foi pago nesta competência',
        error: 'Already paid'
      };
    }

    // 3. Adjust payment date to business day
    const dataOriginal = dataPagamento || new Date().toISOString().split('T')[0];
    const dataAjustada = await ajustarDataUtil(dataOriginal, 'pagamento');

    // 4. Check if transaction already exists for this competencia
    let transacaoId = custoFixo.transacao_id;

    if (!transacaoId) {
      // 5. Create transaction
      const transacao = await createTransacao({
        data: dataAjustada,
        descricao: `Pagamento custo fixo - ${custoFixo.nome}`,
        valor: custoFixo.valor,
        tipo: 'saida',
        forma_pagamento: tipo_pagamento,
        categoria: custoFixo.categoria || 'Custo Fixo',
        conta: conta_pagamento
      });

      if (!transacao) {
        return {
          success: false,
          message: 'Erro ao criar transação',
          error: 'Transaction creation failed'
        };
      }

      transacaoId = transacao.id;
    }

    // 6. Update fixed cost
    const { error: updateError } = await supabase
      .from('custos_fixos')
      .update({
        pago: true,
        data_pagamento: dataAjustada,
        conta_pagamento,
        tipo_pagamento,
        transacao_id: transacaoId,
        updated_at: new Date().toISOString()
      })
      .eq('id', custoFixoId);

    if (updateError) {
      // Rollback: delete created transaction if update fails
      if (transacaoId) {
        await supabase
          .from('transacoes')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', transacaoId);
      }

      return {
        success: false,
        message: 'Erro ao atualizar custo fixo',
        error: updateError.message
      };
    }

    // 7. Attempt automatic reconciliation with bank statements
    let conciliadoAutomaticamente = false;
    if (conta_pagamento === 'banco' && transacaoId) {
      // Find matching bank statement lines
      const { data: extratos } = await supabase
        .from('extratos_importados')
        .select('id')
        .is('deleted_at', null)
        .is('conciliado_com_transacao_id', null)
        .eq('valor', -Math.abs(custoFixo.valor)) // Negative value for expenses
        .gte('data', new Date(new Date(dataAjustada).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lte('data', new Date(new Date(dataAjustada).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .limit(1);

      if (extratos && extratos.length > 0) {
        const result = await tentarConciliacaoAutomatica(extratos[0].id, conta_pagamento);
        conciliadoAutomaticamente = result.success;
      }
    }

    return {
      success: true,
      message: 'Pagamento registrado e conciliação atualizada.',
      transacaoId,
      dataAjustada,
      conciliadoAutomaticamente
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao processar pagamento',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all active fixed costs (not soft deleted)
 *
 * @param filters - Optional filters
 * @returns Array of active fixed costs
 */
export async function getActiveCustosFixos(filters?: {
  categoria?: string;
  pago?: boolean;
  competencia?: string;
  ativo?: boolean;
}): Promise<CustoFixo[]> {
  let query = supabase
    .from('custos_fixos')
    .select('*')
    .is('deleted_at', null)
    .order('data_vencimento', { ascending: true });

  if (filters?.categoria) {
    query = query.eq('categoria', filters.categoria);
  }
  if (filters?.pago !== undefined) {
    query = query.eq('pago', filters.pago);
  }
  if (filters?.competencia) {
    query = query.eq('competencia', filters.competencia);
  }
  if (filters?.ativo !== undefined) {
    query = query.eq('ativo', filters.ativo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching fixed costs:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate fixed costs for a specific month
 * Creates entries based on dia_vencimento and periodicidade
 *
 * @param competencia - Month in format YYYY-MM
 * @returns Number of fixed costs generated
 */
export async function gerarCustosFixosMes(competencia: string): Promise<number> {
  try {
    // Get all active recurring fixed costs
    const { data: custosBase, error: fetchError } = await supabase
      .from('custos_fixos')
      .select('*')
      .eq('ativo', true)
      .eq('periodicidade', 'mensal')
      .is('deleted_at', null);

    if (fetchError || !custosBase) {
      console.error('Error fetching fixed costs:', fetchError);
      return 0;
    }

    const [year, month] = competencia.split('-').map(Number);
    let generated = 0;

    for (const custoBase of custosBase) {
      // Check if already exists for this competencia
      const { data: existing } = await supabase
        .from('custos_fixos')
        .select('id')
        .eq('nome', custoBase.nome)
        .eq('competencia', competencia)
        .maybeSingle();

      if (existing) {
        continue; // Skip if already exists
      }

      // Calculate due date
      const dia = custoBase.dia_vencimento || 1;
      const dataVencimento = new Date(year, month - 1, dia);
      const dataVencimentoStr = dataVencimento.toISOString().split('T')[0];

      // Adjust to business day
      const dataVencimentoAjustada = await ajustarDataUtil(dataVencimentoStr, 'pagamento');

      // Create fixed cost entry for this month
      const { error: insertError } = await supabase
        .from('custos_fixos')
        .insert([{
          nome: custoBase.nome,
          categoria: custoBase.categoria,
          valor: custoBase.valor,
          periodicidade: custoBase.periodicidade,
          dia_vencimento: custoBase.dia_vencimento,
          competencia,
          data_vencimento: dataVencimentoAjustada,
          pago: false,
          tipo_pagamento: custoBase.tipo_pagamento,
          conta_pagamento: custoBase.conta_pagamento,
          ativo: true,
          observacao: `Gerado automaticamente para ${competencia}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (!insertError) {
        generated++;
      }
    }

    return generated;
  } catch (error) {
    console.error('Error generating monthly fixed costs:', error);
    return 0;
  }
}

/**
 * Calculate totals for fixed costs
 *
 * @param filters - Optional filters
 * @returns Totals object
 */
export async function calcularTotaisCustosFixos(filters?: {
  competencia?: string;
  categoria?: string;
}) {
  const custos = await getActiveCustosFixos(filters);

  const total = custos.reduce((sum, c) => sum + c.valor, 0);
  const pagos = custos.filter(c => c.pago).reduce((sum, c) => sum + c.valor, 0);
  const pendentes = custos.filter(c => !c.pago).reduce((sum, c) => sum + c.valor, 0);

  return {
    total,
    pagos,
    pendentes,
    quantidade: custos.length,
    quantidadePagos: custos.filter(c => c.pago).length,
    quantidadePendentes: custos.filter(c => !c.pago).length
  };
}
