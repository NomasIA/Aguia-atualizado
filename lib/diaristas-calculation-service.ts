/**
 * Diaristas Calculation Service
 *
 * Handles calculation of daily worker payments with differentiated rates
 * for weekdays (Monday-Friday) and weekends (Saturday-Sunday)
 */

import { supabase } from './supabase';
import { isWeekend } from './business-days-service';

export interface Diarista {
  id: string;
  nome: string;
  funcao: string;
  valor_diaria?: number; // Legacy field
  valor_diaria_semana?: number; // Weekday rate
  valor_diaria_fimsemana?: number; // Weekend rate
  ativo?: boolean;
}

export interface DiaTrabalho {
  data: string;
  diarista_id: string;
  presente?: boolean;
  obra_id?: string;
}

export interface CalculoDiarista {
  diarista_id: string;
  nome: string;
  dias_uteis: number;
  dias_fim_semana: number;
  total_dias: number;
  valor_dias_uteis: number;
  valor_fim_semana: number;
  total_geral: number;
  detalhes: Array<{
    data: string;
    dia_semana: string;
    tipo: 'util' | 'fim_semana';
    valor: number;
  }>;
}

/**
 * Get the day of week name in Portuguese
 */
function getDiaSemanaPortugues(date: Date): string {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return dias[date.getDay()];
}

/**
 * Calculate payment for a daily worker based on worked dates
 * Applies different rates for weekdays and weekends
 *
 * @param diaristaId - UUID of the daily worker
 * @param datasTrabalho - Array of work dates
 * @returns Calculation details with totals
 */
export async function calcularPagamentoDiarista(
  diaristaId: string,
  datasTrabalho: string[]
): Promise<CalculoDiarista | null> {
  try {
    // Fetch diarista details
    const { data: diarista, error: diaristaError } = await supabase
      .from('diaristas')
      .select('*')
      .eq('id', diaristaId)
      .maybeSingle();

    if (diaristaError || !diarista) {
      console.error('Diarista not found:', diaristaError);
      return null;
    }

    // Use specific rates or fall back to generic valor_diaria
    const taxaSemana = diarista.valor_diaria_semana || diarista.valor_diaria || 0;
    const taxaFimSemana = diarista.valor_diaria_fimsemana || diarista.valor_diaria || 0;

    let diasUteis = 0;
    let diasFimSemana = 0;
    let valorDiasUteis = 0;
    let valorFimSemana = 0;

    const detalhes: Array<{
      data: string;
      dia_semana: string;
      tipo: 'util' | 'fim_semana';
      valor: number;
    }> = [];

    // Process each work date
    for (const dataStr of datasTrabalho) {
      const data = new Date(dataStr + 'T12:00:00-03:00');
      const isFimSemana = isWeekend(data);

      if (isFimSemana) {
        diasFimSemana++;
        valorFimSemana += taxaFimSemana;
        detalhes.push({
          data: dataStr,
          dia_semana: getDiaSemanaPortugues(data),
          tipo: 'fim_semana',
          valor: taxaFimSemana
        });
      } else {
        diasUteis++;
        valorDiasUteis += taxaSemana;
        detalhes.push({
          data: dataStr,
          dia_semana: getDiaSemanaPortugues(data),
          tipo: 'util',
          valor: taxaSemana
        });
      }
    }

    return {
      diarista_id: diaristaId,
      nome: diarista.nome,
      dias_uteis: diasUteis,
      dias_fim_semana: diasFimSemana,
      total_dias: diasUteis + diasFimSemana,
      valor_dias_uteis: valorDiasUteis,
      valor_fim_semana: valorFimSemana,
      total_geral: valorDiasUteis + valorFimSemana,
      detalhes: detalhes.sort((a, b) => a.data.localeCompare(b.data))
    };
  } catch (error) {
    console.error('Error calculating diarista payment:', error);
    return null;
  }
}

/**
 * Calculate payment for multiple daily workers for a period
 *
 * @param periodo - Object with start and end dates
 * @returns Array of calculations for each diarista
 */
export async function calcularPagamentosDiaristasPeriodo(periodo: {
  dataInicio: string;
  dataFim: string;
}): Promise<CalculoDiarista[]> {
  try {
    // Fetch all attendance records for period
    const { data: pontos, error: pontosError } = await supabase
      .from('diarista_ponto')
      .select('diarista_id, data')
      .gte('data', periodo.dataInicio)
      .lte('data', periodo.dataFim)
      .eq('presente', true);

    if (pontosError || !pontos) {
      console.error('Error fetching attendance:', pontosError);
      return [];
    }

    // Group by diarista
    const pontosPorDiarista = pontos.reduce((acc, ponto) => {
      if (!acc[ponto.diarista_id]) {
        acc[ponto.diarista_id] = [];
      }
      acc[ponto.diarista_id].push(ponto.data);
      return acc;
    }, {} as Record<string, string[]>);

    // Calculate for each diarista
    const calculos: CalculoDiarista[] = [];

    for (const [diaristaId, datas] of Object.entries(pontosPorDiarista)) {
      const calculo = await calcularPagamentoDiarista(diaristaId, datas);
      if (calculo) {
        calculos.push(calculo);
      }
    }

    return calculos.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error('Error calculating period payments:', error);
    return [];
  }
}

/**
 * Get summary totals for diaristas in a period
 *
 * @param periodo - Object with start and end dates
 * @returns Summary with totals
 */
export async function getTotaisDiaristasPeriodo(periodo: {
  dataInicio: string;
  dataFim: string;
}) {
  const calculos = await calcularPagamentosDiaristasPeriodo(periodo);

  const totalDiasUteis = calculos.reduce((sum, c) => sum + c.dias_uteis, 0);
  const totalDiasFimSemana = calculos.reduce((sum, c) => sum + c.dias_fim_semana, 0);
  const totalValorUteis = calculos.reduce((sum, c) => sum + c.valor_dias_uteis, 0);
  const totalValorFimSemana = calculos.reduce((sum, c) => sum + c.valor_fim_semana, 0);
  const totalGeral = calculos.reduce((sum, c) => sum + c.total_geral, 0);

  return {
    totalDiaristas: calculos.length,
    totalDiasUteis,
    totalDiasFimSemana,
    totalDias: totalDiasUteis + totalDiasFimSemana,
    totalValorUteis,
    totalValorFimSemana,
    totalGeral,
    detalhePorDiarista: calculos
  };
}

/**
 * Get all active diaristas
 *
 * @returns Array of active diaristas
 */
export async function getActiveDiaristas(): Promise<Diarista[]> {
  const { data, error } = await supabase
    .from('diaristas')
    .select('*')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    console.error('Error fetching diaristas:', error);
    return [];
  }

  return data || [];
}

/**
 * Update diarista rates
 *
 * @param diaristaId - UUID of diarista
 * @param valorSemana - Weekday rate
 * @param valorFimSemana - Weekend rate
 * @returns Success status
 */
export async function updateDiaristaRates(
  diaristaId: string,
  valorSemana: number,
  valorFimSemana: number
): Promise<boolean> {
  const { error } = await supabase
    .from('diaristas')
    .update({
      valor_diaria_semana: valorSemana,
      valor_diaria_fimsemana: valorFimSemana,
      updated_at: new Date().toISOString()
    })
    .eq('id', diaristaId);

  if (error) {
    console.error('Error updating diarista rates:', error);
    return false;
  }

  return true;
}
