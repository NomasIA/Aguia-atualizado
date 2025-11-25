/**
 * Relatórios API Routes
 *
 * Endpoints:
 * GET /api/relatorios?type={type} - Get specific report
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRelatorioMensalistas,
  getRelatorioDiaristas,
  getRelatorioEntradasSaidas,
  getRelatorioObras,
  getRelatorioMaquinas,
  getRelatorioContratos,
  getRelatorioFinanceiro
} from '@/lib/relatorios-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    switch (type) {
      case 'mensalistas':
        const competencia = searchParams.get('competencia') || undefined;
        const mensalistas = await getRelatorioMensalistas(competencia);
        return NextResponse.json({
          success: true,
          data: mensalistas
        });

      case 'diaristas':
        const dataInicio = searchParams.get('dataInicio');
        const dataFim = searchParams.get('dataFim');

        if (!dataInicio || !dataFim) {
          return NextResponse.json(
            { success: false, error: 'dataInicio e dataFim são obrigatórios' },
            { status: 400 }
          );
        }

        const diaristas = await getRelatorioDiaristas({ dataInicio, dataFim });
        return NextResponse.json({
          success: true,
          data: diaristas
        });

      case 'entradas-saidas':
        const dataInicioES = searchParams.get('dataInicio') || undefined;
        const dataFimES = searchParams.get('dataFim') || undefined;

        const entradasSaidas = await getRelatorioEntradasSaidas({
          dataInicio: dataInicioES,
          dataFim: dataFimES
        });
        return NextResponse.json({
          success: true,
          data: entradasSaidas
        });

      case 'obras':
        const obras = await getRelatorioObras();
        return NextResponse.json({
          success: true,
          data: obras
        });

      case 'maquinas':
        const maquinas = await getRelatorioMaquinas();
        return NextResponse.json({
          success: true,
          data: maquinas
        });

      case 'contratos':
        const contratos = await getRelatorioContratos();
        return NextResponse.json({
          success: true,
          data: contratos
        });

      case 'financeiro':
        const dataInicioFin = searchParams.get('dataInicio');
        const dataFimFin = searchParams.get('dataFim');

        if (!dataInicioFin || !dataFimFin) {
          return NextResponse.json(
            { success: false, error: 'dataInicio e dataFim são obrigatórios' },
            { status: 400 }
          );
        }

        const financeiro = await getRelatorioFinanceiro({
          dataInicio: dataInicioFin,
          dataFim: dataFimFin
        });
        return NextResponse.json({
          success: true,
          data: financeiro
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de relatório inválido' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('GET /api/relatorios error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar relatório',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
