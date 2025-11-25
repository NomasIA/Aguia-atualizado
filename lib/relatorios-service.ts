/**
 * Relatórios Service
 *
 * Consolidated reporting services for all financial modules
 * All queries exclude soft-deleted records (deleted_at IS NULL)
 */

import { supabase } from './supabase';
import { getActiveTransacoes, calculateTransacoesKPIs } from './transacoes-service';
import { getActiveCustosFixos, calcularTotaisCustosFixos } from './custos-fixos-service';
import { getTotaisDiaristasPeriodo } from './diaristas-calculation-service';

export interface RelatorioMensalistas {
  totalFuncionarios: number;
  totalAtivos: number;
  totalInativos: number;
  totalSalarios: number;
  totalEncargos: number;
  totalVT: number;
  totalGeral: number;
  detalhes: Array<{
    id: string;
    nome: string;
    funcao: string;
    salario_base: number;
    ajuda_custo: number;
    vale_salario: number;
    vt_valor: number;
    encargos_valor: number;
    total: number;
    ativo: boolean;
  }>;
}

export interface RelatorioDiaristas {
  totalDiaristas: number;
  totalDiasUteis: number;
  totalDiasFimSemana: number;
  totalDias: number;
  valorDiasUteis: number;
  valorFimSemana: number;
  totalGeral: number;
}

export interface RelatorioEntradasSaidas {
  banco: {
    entradas: number;
    saidas: number;
    saldo: number;
  };
  dinheiro: {
    entradas: number;
    saidas: number;
    saldo: number;
  };
  total: {
    entradas: number;
    saidas: number;
    saldo: number;
  };
}

export interface RelatorioObras {
  totalObras: number;
  obrasAtivas: number;
  obrasInativas: number;
  totalReceitas: number;
  totalRecebido: number;
  totalPendente: number;
  detalhes: Array<{
    id: string;
    cliente: string;
    nome_obra: string;
    status: string;
    totalReceitas: number;
    totalRecebido: number;
    totalPendente: number;
  }>;
}

export interface RelatorioMaquinas {
  totalMaquinas: number;
  totalDisponiveis: number;
  totalLocadas: number;
  valorTotalPatrimonio: number;
  detalhes: Array<{
    id: string;
    nome: string;
    categoria: string;
    quantidade: number;
    quantidade_disponivel: number;
    valor_diaria: number;
    status: string;
  }>;
}

export interface RelatorioContratos {
  totalContratos: number;
  contratosAtivos: number;
  contratosEncerrados: number;
  valorTotalAtivos: number;
  valorRecebido: number;
  valorPendente: number;
}

export interface RelatorioFinanceiro {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  custosFixos: {
    total: number;
    pagos: number;
    pendentes: number;
  };
  custosVariaveis: {
    mensalistas: number;
    diaristas: number;
    outros: number;
    total: number;
  };
  receitas: {
    obras: number;
    contratos: number;
    outros: number;
    total: number;
  };
  resultado: {
    receitaTotal: number;
    custoTotal: number;
    lucro: number;
    margem: number;
  };
  saldos: {
    banco: number;
    dinheiro: number;
    total: number;
  };
}

/**
 * Generate report for mensalistas (monthly employees)
 *
 * @param competencia - Optional month filter (YYYY-MM)
 * @returns Report with totals and details
 */
export async function getRelatorioMensalistas(competencia?: string): Promise<RelatorioMensalistas> {
  const { data: funcionarios, error } = await supabase
    .from('funcionarios_mensalistas')
    .select('*')
    .is('deleted_at', null)
    .order('nome');

  if (error || !funcionarios) {
    console.error('Error fetching mensalistas:', error);
    return {
      totalFuncionarios: 0,
      totalAtivos: 0,
      totalInativos: 0,
      totalSalarios: 0,
      totalEncargos: 0,
      totalVT: 0,
      totalGeral: 0,
      detalhes: []
    };
  }

  const detalhes = funcionarios.map(f => {
    const salarioBase = f.salario_base || 0;
    const ajudaCusto = f.ajuda_custo || 0;
    const valeSalario = f.vale_salario || 0;
    const vtValor = f.vt_valor_unitario_dia ? (f.vt_valor_unitario_dia * 22) : 0; // Approximate
    const encargosValor = f.aplica_encargos ? (salarioBase * (f.encargos_pct || 0) / 100) : 0;
    const total = salarioBase + ajudaCusto + valeSalario + vtValor + encargosValor;

    return {
      id: f.id,
      nome: f.nome,
      funcao: f.funcao,
      salario_base: salarioBase,
      ajuda_custo: ajudaCusto,
      vale_salario: valeSalario,
      vt_valor: vtValor,
      encargos_valor: encargosValor,
      total,
      ativo: f.ativo || false
    };
  });

  const totalAtivos = detalhes.filter(d => d.ativo).length;
  const totalInativos = detalhes.filter(d => !d.ativo).length;
  const totalSalarios = detalhes.reduce((sum, d) => sum + d.salario_base, 0);
  const totalEncargos = detalhes.reduce((sum, d) => sum + d.encargos_valor, 0);
  const totalVT = detalhes.reduce((sum, d) => sum + d.vt_valor, 0);
  const totalGeral = detalhes.reduce((sum, d) => sum + d.total, 0);

  return {
    totalFuncionarios: funcionarios.length,
    totalAtivos,
    totalInativos,
    totalSalarios,
    totalEncargos,
    totalVT,
    totalGeral,
    detalhes
  };
}

/**
 * Generate report for diaristas (daily workers)
 *
 * @param periodo - Date range
 * @returns Report with totals
 */
export async function getRelatorioDiaristas(periodo: {
  dataInicio: string;
  dataFim: string;
}): Promise<RelatorioDiaristas> {
  const totais = await getTotaisDiaristasPeriodo(periodo);

  return {
    totalDiaristas: totais.totalDiaristas,
    totalDiasUteis: totais.totalDiasUteis,
    totalDiasFimSemana: totais.totalDiasFimSemana,
    totalDias: totais.totalDias,
    valorDiasUteis: totais.totalValorUteis,
    valorFimSemana: totais.totalValorFimSemana,
    totalGeral: totais.totalGeral
  };
}

/**
 * Generate report for entries and exits separated by account
 *
 * @param periodo - Date range
 * @returns Report with banco and dinheiro totals
 */
export async function getRelatorioEntradasSaidas(periodo?: {
  dataInicio?: string;
  dataFim?: string;
}): Promise<RelatorioEntradasSaidas> {
  const transacoes = await getActiveTransacoes(periodo);

  const banco = {
    entradas: transacoes.filter(t => t.tipo === 'entrada' && t.conta === 'banco').reduce((s, t) => s + t.valor, 0),
    saidas: transacoes.filter(t => t.tipo === 'saida' && t.conta === 'banco').reduce((s, t) => s + t.valor, 0),
    saldo: 0
  };
  banco.saldo = banco.entradas - banco.saidas;

  const dinheiro = {
    entradas: transacoes.filter(t => t.tipo === 'entrada' && t.conta === 'dinheiro').reduce((s, t) => s + t.valor, 0),
    saidas: transacoes.filter(t => t.tipo === 'saida' && t.conta === 'dinheiro').reduce((s, t) => s + t.valor, 0),
    saldo: 0
  };
  dinheiro.saldo = dinheiro.entradas - dinheiro.saidas;

  const total = {
    entradas: banco.entradas + dinheiro.entradas,
    saidas: banco.saidas + dinheiro.saidas,
    saldo: banco.saldo + dinheiro.saldo
  };

  return { banco, dinheiro, total };
}

/**
 * Generate report for obras (construction projects) and receivables
 *
 * @returns Report with obras details
 */
export async function getRelatorioObras(): Promise<RelatorioObras> {
  const { data: obras, error } = await supabase
    .from('obras')
    .select(`
      *,
      receitas (
        id,
        valor_total,
        recebido,
        deleted_at
      )
    `)
    .order('nome_obra');

  if (error || !obras) {
    console.error('Error fetching obras:', error);
    return {
      totalObras: 0,
      obrasAtivas: 0,
      obrasInativas: 0,
      totalReceitas: 0,
      totalRecebido: 0,
      totalPendente: 0,
      detalhes: []
    };
  }

  const detalhes = obras.map(obra => {
    const receitasAtivas = (obra.receitas || []).filter((r: any) => !r.deleted_at);
    const totalReceitas = receitasAtivas.reduce((sum: number, r: any) => sum + (r.valor_total || 0), 0);
    const totalRecebido = receitasAtivas.filter((r: any) => r.recebido).reduce((sum: number, r: any) => sum + (r.valor_total || 0), 0);
    const totalPendente = totalReceitas - totalRecebido;

    return {
      id: obra.id,
      cliente: obra.cliente,
      nome_obra: obra.nome_obra,
      status: obra.status || 'ativa',
      totalReceitas,
      totalRecebido,
      totalPendente
    };
  });

  const obrasAtivas = detalhes.filter(d => d.status === 'ativa').length;
  const obrasInativas = detalhes.filter(d => d.status !== 'ativa').length;
  const totalReceitas = detalhes.reduce((sum, d) => sum + d.totalReceitas, 0);
  const totalRecebido = detalhes.reduce((sum, d) => sum + d.totalRecebido, 0);
  const totalPendente = detalhes.reduce((sum, d) => sum + d.totalPendente, 0);

  return {
    totalObras: obras.length,
    obrasAtivas,
    obrasInativas,
    totalReceitas,
    totalRecebido,
    totalPendente,
    detalhes
  };
}

/**
 * Generate report for available machines
 *
 * @returns Report with machines details
 */
export async function getRelatorioMaquinas(): Promise<RelatorioMaquinas> {
  const { data: maquinas, error } = await supabase
    .from('maquinas')
    .select('*')
    .is('deleted_at', null)
    .order('nome');

  if (error || !maquinas) {
    console.error('Error fetching maquinas:', error);
    return {
      totalMaquinas: 0,
      totalDisponiveis: 0,
      totalLocadas: 0,
      valorTotalPatrimonio: 0,
      detalhes: []
    };
  }

  const detalhes = maquinas.map(m => ({
    id: m.id,
    nome: m.nome,
    categoria: m.categoria || '',
    quantidade: m.quantidade || 1,
    quantidade_disponivel: m.quantidade_disponivel || 0,
    valor_diaria: m.valor_diaria || 0,
    status: m.status || 'disponivel'
  }));

  const totalDisponiveis = detalhes.reduce((sum, d) => sum + d.quantidade_disponivel, 0);
  const totalLocadas = detalhes.reduce((sum, d) => sum + (d.quantidade - d.quantidade_disponivel), 0);
  const valorTotalPatrimonio = detalhes.reduce((sum, d) => sum + (d.valor_diaria * d.quantidade * 30), 0);

  return {
    totalMaquinas: maquinas.length,
    totalDisponiveis,
    totalLocadas,
    valorTotalPatrimonio,
    detalhes
  };
}

/**
 * Generate report for rental contracts
 *
 * @returns Report with contracts summary
 */
export async function getRelatorioContratos(): Promise<RelatorioContratos> {
  const { data: contratos, error } = await supabase
    .from('locacoes_contratos')
    .select('*')
    .is('deleted_at', null);

  if (error || !contratos) {
    console.error('Error fetching contratos:', error);
    return {
      totalContratos: 0,
      contratosAtivos: 0,
      contratosEncerrados: 0,
      valorTotalAtivos: 0,
      valorRecebido: 0,
      valorPendente: 0
    };
  }

  const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;
  const contratosEncerrados = contratos.filter(c => c.status === 'encerrado').length;
  const valorTotalAtivos = contratos.filter(c => c.status === 'ativo').reduce((sum, c) => sum + (c.valor_total || 0), 0);
  const valorRecebido = contratos.filter(c => c.recebido).reduce((sum, c) => sum + (c.valor_total || 0), 0);
  const valorPendente = contratos.filter(c => !c.recebido && c.status === 'ativo').reduce((sum, c) => sum + (c.valor_total || 0), 0);

  return {
    totalContratos: contratos.length,
    contratosAtivos,
    contratosEncerrados,
    valorTotalAtivos,
    valorRecebido,
    valorPendente
  };
}

/**
 * Generate consolidated financial report
 *
 * @param periodo - Date range for the report
 * @returns Comprehensive financial report
 */
export async function getRelatorioFinanceiro(periodo: {
  dataInicio: string;
  dataFim: string;
}): Promise<RelatorioFinanceiro> {
  // Get all components
  const custosFixos = await calcularTotaisCustosFixos();
  const mensalistas = await getRelatorioMensalistas();
  const diaristas = await getRelatorioDiaristas(periodo);
  const entradasSaidas = await getRelatorioEntradasSaidas(periodo);
  const obras = await getRelatorioObras();
  const contratos = await getRelatorioContratos();

  // Calculate variable costs
  const custosVariaveis = {
    mensalistas: mensalistas.totalGeral,
    diaristas: diaristas.totalGeral,
    outros: 0, // Add other variable costs if needed
    total: mensalistas.totalGeral + diaristas.totalGeral
  };

  // Calculate revenues
  const receitas = {
    obras: obras.totalRecebido,
    contratos: contratos.valorRecebido,
    outros: 0,
    total: obras.totalRecebido + contratos.valorRecebido
  };

  // Calculate results
  const receitaTotal = receitas.total;
  const custoTotal = custosFixos.total + custosVariaveis.total;
  const lucro = receitaTotal - custoTotal;
  const margem = receitaTotal > 0 ? (lucro / receitaTotal * 100) : 0;

  return {
    periodo,
    custosFixos: {
      total: custosFixos.total,
      pagos: custosFixos.pagos,
      pendentes: custosFixos.pendentes
    },
    custosVariaveis,
    receitas,
    resultado: {
      receitaTotal,
      custoTotal,
      lucro,
      margem
    },
    saldos: {
      banco: entradasSaidas.banco.saldo,
      dinheiro: entradasSaidas.dinheiro.saldo,
      total: entradasSaidas.total.saldo
    }
  };
}
