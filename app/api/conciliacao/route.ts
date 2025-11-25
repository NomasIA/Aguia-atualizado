/**
 * Conciliação API Routes
 *
 * Endpoints:
 * POST /api/conciliacao/link - Link extrato to existing transaction
 * POST /api/conciliacao/create - Create transaction and link
 * POST /api/conciliacao/unlink - Unlink reconciliation
 * POST /api/conciliacao/auto - Attempt automatic reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  conciliarComTransacao,
  criarTransacaoEConciliar,
  desfazerConciliacao,
  tentarConciliacaoAutomatica
} from '@/lib/conciliacao-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, extratoId, transacaoId, tipo, categoria, conta, deleteTransacao, contaId } = body;

    switch (action) {
      case 'link':
        // Link extrato to existing transaction
        if (!extratoId || !transacaoId) {
          return NextResponse.json(
            { success: false, error: 'extratoId e transacaoId são obrigatórios' },
            { status: 400 }
          );
        }

        const linkResult = await conciliarComTransacao(extratoId, transacaoId);
        return NextResponse.json(linkResult);

      case 'create':
        // Create new transaction and link
        if (!extratoId || !tipo) {
          return NextResponse.json(
            { success: false, error: 'extratoId e tipo são obrigatórios' },
            { status: 400 }
          );
        }

        const createResult = await criarTransacaoEConciliar(
          extratoId,
          tipo,
          categoria,
          conta
        );
        return NextResponse.json(createResult);

      case 'unlink':
        // Unlink reconciliation
        if (!extratoId) {
          return NextResponse.json(
            { success: false, error: 'extratoId é obrigatório' },
            { status: 400 }
          );
        }

        const unlinkResult = await desfazerConciliacao(extratoId, deleteTransacao || false);
        return NextResponse.json(unlinkResult);

      case 'auto':
        // Attempt automatic reconciliation
        if (!extratoId) {
          return NextResponse.json(
            { success: false, error: 'extratoId é obrigatório' },
            { status: 400 }
          );
        }

        const autoResult = await tentarConciliacaoAutomatica(extratoId, contaId);
        return NextResponse.json(autoResult);

      default:
        return NextResponse.json(
          { success: false, error: 'Ação inválida' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('POST /api/conciliacao error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar conciliação',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
