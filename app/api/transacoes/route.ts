/**
 * Transações API Routes
 *
 * Endpoints:
 * GET    /api/transacoes - List transactions with filters
 * POST   /api/transacoes - Create new transaction
 * DELETE /api/transacoes?id={id} - Soft delete transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveTransacoes,
  createTransacao,
  softDeleteTransacao,
  calculateTransacoesKPIs
} from '@/lib/transacoes-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // KPIs endpoint
    if (action === 'kpis') {
      const dataInicio = searchParams.get('dataInicio') || undefined;
      const dataFim = searchParams.get('dataFim') || undefined;

      const kpis = await calculateTransacoesKPIs({
        dataInicio,
        dataFim
      });

      return NextResponse.json(kpis);
    }

    // List transactions
    const filters = {
      dataInicio: searchParams.get('dataInicio') || undefined,
      dataFim: searchParams.get('dataFim') || undefined,
      tipo: searchParams.get('tipo') as 'entrada' | 'saida' | undefined,
      conta: searchParams.get('conta') || undefined,
      categoria: searchParams.get('categoria') || undefined
    };

    const transacoes = await getActiveTransacoes(filters);

    return NextResponse.json({
      success: true,
      data: transacoes,
      total: transacoes.length
    });
  } catch (error) {
    console.error('GET /api/transacoes error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar transações',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const transacao = await createTransacao({
      data: body.data,
      descricao: body.descricao,
      valor: parseFloat(body.valor),
      tipo: body.tipo,
      forma_pagamento: body.forma_pagamento,
      categoria: body.categoria,
      conta: body.conta
    });

    if (!transacao) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar transação' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transação criada com sucesso',
      data: transacao
    });
  } catch (error) {
    console.error('POST /api/transacoes error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao criar transação',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID não fornecido' },
        { status: 400 }
      );
    }

    const result = await softDeleteTransacao(id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('DELETE /api/transacoes error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao excluir transação',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
