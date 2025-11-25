/**
 * Diaristas API Routes
 *
 * Endpoints:
 * GET  /api/diaristas - List diaristas or calculate payments
 * POST /api/diaristas - Calculate specific diarista payment
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveDiaristas,
  calcularPagamentoDiarista,
  calcularPagamentosDiaristasPeriodo,
  getTotaisDiaristasPeriodo,
  updateDiaristaRates
} from '@/lib/diaristas-calculation-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Calculate payments for period
    if (action === 'calcular-periodo') {
      const dataInicio = searchParams.get('dataInicio');
      const dataFim = searchParams.get('dataFim');

      if (!dataInicio || !dataFim) {
        return NextResponse.json(
          { success: false, error: 'dataInicio e dataFim são obrigatórios' },
          { status: 400 }
        );
      }

      const calculos = await calcularPagamentosDiaristasPeriodo({ dataInicio, dataFim });

      return NextResponse.json({
        success: true,
        data: calculos
      });
    }

    // Get totals for period
    if (action === 'totais-periodo') {
      const dataInicio = searchParams.get('dataInicio');
      const dataFim = searchParams.get('dataFim');

      if (!dataInicio || !dataFim) {
        return NextResponse.json(
          { success: false, error: 'dataInicio e dataFim são obrigatórios' },
          { status: 400 }
        );
      }

      const totais = await getTotaisDiaristasPeriodo({ dataInicio, dataFim });

      return NextResponse.json({
        success: true,
        data: totais
      });
    }

    // List active diaristas
    const diaristas = await getActiveDiaristas();

    return NextResponse.json({
      success: true,
      data: diaristas,
      total: diaristas.length
    });
  } catch (error) {
    console.error('GET /api/diaristas error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar diaristas',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, diaristaId, datasTrabalho, valorSemana, valorFimSemana } = body;

    switch (action) {
      case 'calcular':
        // Calculate payment for specific diarista
        if (!diaristaId || !datasTrabalho || !Array.isArray(datasTrabalho)) {
          return NextResponse.json(
            { success: false, error: 'diaristaId e datasTrabalho são obrigatórios' },
            { status: 400 }
          );
        }

        const calculo = await calcularPagamentoDiarista(diaristaId, datasTrabalho);

        if (!calculo) {
          return NextResponse.json(
            { success: false, error: 'Erro ao calcular pagamento' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: calculo
        });

      case 'update-rates':
        // Update diarista rates
        if (!diaristaId || valorSemana === undefined || valorFimSemana === undefined) {
          return NextResponse.json(
            { success: false, error: 'diaristaId, valorSemana e valorFimSemana são obrigatórios' },
            { status: 400 }
          );
        }

        const updated = await updateDiaristaRates(
          diaristaId,
          parseFloat(valorSemana),
          parseFloat(valorFimSemana)
        );

        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Erro ao atualizar valores' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Valores atualizados com sucesso'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Ação inválida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('POST /api/diaristas error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar diarista',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
