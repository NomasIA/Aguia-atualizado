/**
 * Extratos API Routes
 *
 * Endpoints:
 * GET    /api/extratos - List bank statements with filters
 * POST   /api/extratos - Import bank statements
 * DELETE /api/extratos?id={id} - Soft delete statement line
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveExtratos,
  importExtratos,
  softDeleteExtrato,
  getReconciliationStatus
} from '@/lib/extratos-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Reconciliation status endpoint
    if (action === 'status') {
      const conta_id = searchParams.get('conta_id') || undefined;
      const status = await getReconciliationStatus(conta_id);
      return NextResponse.json(status);
    }

    // List extratos
    const filters = {
      conta_id: searchParams.get('conta_id') || undefined,
      dataInicio: searchParams.get('dataInicio') || undefined,
      dataFim: searchParams.get('dataFim') || undefined,
      conciliado: searchParams.get('conciliado') === 'true' ? true :
                  searchParams.get('conciliado') === 'false' ? false : undefined
    };

    const extratos = await getActiveExtratos(filters);

    return NextResponse.json({
      success: true,
      data: extratos,
      total: extratos.length
    });
  } catch (error) {
    console.error('GET /api/extratos error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar extratos',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linhas, source } = body;

    if (!linhas || !Array.isArray(linhas)) {
      return NextResponse.json(
        { success: false, error: 'Linhas de extrato inválidas' },
        { status: 400 }
      );
    }

    const result = await importExtratos(linhas, source || 'manual_upload');

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/extratos error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao importar extratos',
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

    const result = await softDeleteExtrato(id);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('DELETE /api/extratos error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao excluir extrato',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
