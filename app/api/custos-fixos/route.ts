/**
 * Custos Fixos API Routes
 *
 * Endpoints:
 * GET  /api/custos-fixos - List fixed costs with filters
 * POST /api/custos-fixos - Create or pay fixed cost
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveCustosFixos,
  marcarCustoFixoComoPago,
  gerarCustosFixosMes,
  calcularTotaisCustosFixos
} from '@/lib/custos-fixos-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Totals endpoint
    if (action === 'totais') {
      const competencia = searchParams.get('competencia') || undefined;
      const categoria = searchParams.get('categoria') || undefined;

      const totais = await calcularTotaisCustosFixos({ competencia, categoria });
      return NextResponse.json(totais);
    }

    // List fixed costs
    const filters = {
      categoria: searchParams.get('categoria') || undefined,
      pago: searchParams.get('pago') === 'true' ? true :
            searchParams.get('pago') === 'false' ? false : undefined,
      competencia: searchParams.get('competencia') || undefined,
      ativo: searchParams.get('ativo') === 'true' ? true :
             searchParams.get('ativo') === 'false' ? false : undefined
    };

    const custos = await getActiveCustosFixos(filters);

    return NextResponse.json({
      success: true,
      data: custos,
      total: custos.length
    });
  } catch (error) {
    console.error('GET /api/custos-fixos error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar custos fixos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, custoFixoId, dataPagamento, conta_pagamento, tipo_pagamento, competencia } = body;

    switch (action) {
      case 'pagar':
        // Mark fixed cost as paid
        if (!custoFixoId) {
          return NextResponse.json(
            { success: false, error: 'custoFixoId é obrigatório' },
            { status: 400 }
          );
        }

        const pagarResult = await marcarCustoFixoComoPago(
          custoFixoId,
          dataPagamento,
          conta_pagamento || 'banco',
          tipo_pagamento || 'transferencia'
        );

        return NextResponse.json(pagarResult);

      case 'gerar':
        // Generate fixed costs for month
        if (!competencia) {
          return NextResponse.json(
            { success: false, error: 'competencia é obrigatória' },
            { status: 400 }
          );
        }

        const gerados = await gerarCustosFixosMes(competencia);

        return NextResponse.json({
          success: true,
          message: `${gerados} custos fixos gerados para ${competencia}`,
          gerados
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Ação inválida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('POST /api/custos-fixos error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar custo fixo',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
