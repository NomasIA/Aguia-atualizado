'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Banknote, Bus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { createLedgerEntry, recalcAll } from '@/lib/ledger-sync';
import { revalidateAfterFolha, revalidateAll } from '@/lib/revalidation-utils';

interface Mensalista {
  id: string;
  nome: string;
  funcao: string;
  salario_base: number;
  ajuda_custo: number;
  vale_salario: number;
  recebe_vt: boolean;
  vt_valor_unitario_dia: number;
  vt_dias_uteis_override: number;
  ativo: boolean;
}

interface Pagamento {
  tipo_pagamento: 'salario' | 'vale_salario' | 'vt';
  data_pagamento: string;
  valor: number;
}

export default function MensalistasContent() {
  const [mensalistas, setMensalistas] = useState<Mensalista[]>([]);
  const [pagamentos, setPagamentos] = useState<Record<string, Record<string, Pagamento>>>({});
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const { toast } = useToast();

  const [competencia, setCompetencia] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });

  useEffect(() => {
    loadData();
  }, [competencia]);

  const loadData = async () => {
    try {
      const { data: mensalistasData, error: mensalistasError } = await supabase
        .from('funcionarios_mensalistas')
        .select('*')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome');

      if (mensalistasError) throw mensalistasError;

      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from('mensalista_pagamentos_competencia')
        .select('*')
        .eq('competencia', competencia)
        .is('deleted_at', null);

      if (pagamentosError) throw pagamentosError;

      setMensalistas(mensalistasData || []);

      const pagamentosMap: Record<string, Record<string, Pagamento>> = {};
      (pagamentosData || []).forEach((pag: any) => {
        if (!pagamentosMap[pag.mensalista_id]) {
          pagamentosMap[pag.mensalista_id] = {};
        }
        pagamentosMap[pag.mensalista_id][pag.tipo_pagamento] = {
          tipo_pagamento: pag.tipo_pagamento,
          data_pagamento: pag.data_pagamento,
          valor: parseFloat(pag.valor)
        };
      });

      setPagamentos(pagamentosMap);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularVTMensal = (mensalista: Mensalista) => {
    if (!mensalista.recebe_vt) return 0;
    const diasUteis = mensalista.vt_dias_uteis_override || 22;
    return mensalista.vt_valor_unitario_dia * diasUteis;
  };

  const calcularCustoTotal = (mensalista: Mensalista) => {
    const salario = parseFloat(mensalista.salario_base?.toString() || '0');
    const ajuda = parseFloat(mensalista.ajuda_custo?.toString() || '0');
    const vale = parseFloat(mensalista.vale_salario?.toString() || '0');
    const vt = calcularVTMensal(mensalista);
    return salario + ajuda + vale + vt;
  };

  const getDataPagamento = (tipo: 'salario' | 'vale_salario' | 'vt') => {
    const [ano, mes] = competencia.split('-');
    const dataBase = new Date(parseInt(ano), parseInt(mes) - 1, 1);

    if (tipo === 'salario') {
      return new Date(dataBase.getFullYear(), dataBase.getMonth(), 5);
    } else if (tipo === 'vale_salario') {
      return new Date(dataBase.getFullYear(), dataBase.getMonth(), 20);
    } else {
      const ultimoDia = new Date(dataBase.getFullYear(), dataBase.getMonth() + 1, 0);
      let dia = ultimoDia.getDate();
      let data = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);

      while (data.getDay() === 0 || data.getDay() === 6) {
        dia--;
        data = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
      }

      return data;
    }
  };

  const handlePagamento = async (
    mensalista: Mensalista,
    tipo: 'salario' | 'vale_salario' | 'vt'
  ) => {
    const key = `${mensalista.id}-${tipo}`;
    setProcessingPayment(key);

    try {
      let valor = 0;
      let descricao = '';
      let categoria = tipo;

      if (tipo === 'salario') {
        valor = parseFloat(mensalista.salario_base?.toString() || '0') +
                parseFloat(mensalista.ajuda_custo?.toString() || '0');
        descricao = `Salário ${competencia} - ${mensalista.nome}`;
      } else if (tipo === 'vale_salario') {
        valor = parseFloat(mensalista.vale_salario?.toString() || '0');
        if (valor === 0) {
          toast({
            title: 'Aviso',
            description: 'Este funcionário não tem vale-salário configurado',
            variant: 'destructive'
          });
          return;
        }
        descricao = `Vale-Salário ${competencia} - ${mensalista.nome}`;
      } else {
        if (!mensalista.recebe_vt) {
          toast({
            title: 'Aviso',
            description: 'Este funcionário não recebe vale-transporte',
            variant: 'destructive'
          });
          return;
        }
        valor = calcularVTMensal(mensalista);
        descricao = `Vale-Transporte ${competencia} - ${mensalista.nome}`;
      }

      const dataPagamento = getDataPagamento(tipo);

      const ledger = await createLedgerEntry({
        data: format(dataPagamento, 'yyyy-MM-dd'),
        tipo: 'saida',
        forma: 'banco',
        categoria,
        descricao,
        valor,
        origem: 'mensalista',
        origem_id: mensalista.id,
        funcionario_id: mensalista.id
      });

      const { error: pagError } = await supabase
        .from('mensalista_pagamentos_competencia')
        .insert([{
          mensalista_id: mensalista.id,
          competencia,
          tipo_pagamento: tipo,
          data_pagamento: format(dataPagamento, 'yyyy-MM-dd'),
          valor,
          forma: 'banco',
          ledger_id: ledger.id
        }]);

      if (pagError) throw pagError;

      await recalcAll();
      revalidateAfterFolha();
      revalidateAll();

      toast({
        title: 'Sucesso',
        description: `Pagamento registrado com sucesso!`
      });

      loadData();
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);

      if (error.code === '23505') {
        toast({
          title: 'Aviso',
          description: 'Este pagamento já foi processado para esta competência',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro',
          description: error.message || 'Não foi possível processar o pagamento',
          variant: 'destructive'
        });
      }
    } finally {
      setProcessingPayment(null);
    }
  };

  const isPago = (mensalistaId: string, tipo: 'salario' | 'vale_salario' | 'vt') => {
    return pagamentos[mensalistaId]?.[tipo] !== undefined;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gold text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gold">Folha de Pagamento - Mensalistas</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted">Competência:</label>
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="input-dark px-3 py-2 rounded-md"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr>
                <th className="text-left">Nome</th>
                <th className="text-left">Cargo</th>
                <th className="text-right">Salário</th>
                <th className="text-right">Ajuda Custo</th>
                <th className="text-right">Vale</th>
                <th className="text-right">VT Mensal</th>
                <th className="text-right">Total</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mensalistas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">
                    Nenhum funcionário cadastrado
                  </td>
                </tr>
              ) : (
                mensalistas.map((mensalista) => {
                  const vtMensal = calcularVTMensal(mensalista);
                  const custoTotal = calcularCustoTotal(mensalista);
                  const salarioPago = isPago(mensalista.id, 'salario');
                  const valePago = isPago(mensalista.id, 'vale_salario');
                  const vtPago = isPago(mensalista.id, 'vt');

                  return (
                    <tr key={mensalista.id}>
                      <td className="font-medium">{mensalista.nome}</td>
                      <td className="text-muted">{mensalista.funcao}</td>
                      <td className="text-right">{formatCurrency(parseFloat(mensalista.salario_base?.toString() || '0'))}</td>
                      <td className="text-right">{formatCurrency(parseFloat(mensalista.ajuda_custo?.toString() || '0'))}</td>
                      <td className="text-right">{formatCurrency(parseFloat(mensalista.vale_salario?.toString() || '0'))}</td>
                      <td className="text-right">{formatCurrency(vtMensal)}</td>
                      <td className="text-right font-semibold text-gold">{formatCurrency(custoTotal)}</td>
                      <td>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            className={salarioPago ? 'btn-success' : 'btn-primary'}
                            onClick={() => handlePagamento(mensalista, 'salario')}
                            disabled={salarioPago || processingPayment === `${mensalista.id}-salario`}
                          >
                            {salarioPago ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Salário Pago ✅
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-3 h-3 mr-1" />
                                {processingPayment === `${mensalista.id}-salario` ? 'Processando...' : 'Pagar Salário dia 5'}
                              </>
                            )}
                          </Button>

                          {parseFloat(mensalista.vale_salario?.toString() || '0') > 0 && (
                            <Button
                              size="sm"
                              className={valePago ? 'btn-success' : 'btn-primary'}
                              onClick={() => handlePagamento(mensalista, 'vale_salario')}
                              disabled={valePago || processingPayment === `${mensalista.id}-vale_salario`}
                            >
                              {valePago ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  Vale Pago ✅
                                </>
                              ) : (
                                <>
                                  <Banknote className="w-3 h-3 mr-1" />
                                  {processingPayment === `${mensalista.id}-vale_salario` ? 'Processando...' : 'Pagar Vale dia 20'}
                                </>
                              )}
                            </Button>
                          )}

                          {mensalista.recebe_vt && (
                            <Button
                              size="sm"
                              className={vtPago ? 'btn-success' : 'btn-primary'}
                              onClick={() => handlePagamento(mensalista, 'vt')}
                              disabled={vtPago || processingPayment === `${mensalista.id}-vt`}
                            >
                              {vtPago ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  VT Pago ✅
                                </>
                              ) : (
                                <>
                                  <Bus className="w-3 h-3 mr-1" />
                                  {processingPayment === `${mensalista.id}-vt` ? 'Processando...' : 'Pagar VT último dia'}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gold/30">
                <td colSpan={2} className="font-semibold text-gold">TOTAL</td>
                <td className="text-right font-semibold">
                  {formatCurrency(mensalistas.reduce((sum, m) => sum + parseFloat(m.salario_base?.toString() || '0'), 0))}
                </td>
                <td className="text-right font-semibold">
                  {formatCurrency(mensalistas.reduce((sum, m) => sum + parseFloat(m.ajuda_custo?.toString() || '0'), 0))}
                </td>
                <td className="text-right font-semibold">
                  {formatCurrency(mensalistas.reduce((sum, m) => sum + parseFloat(m.vale_salario?.toString() || '0'), 0))}
                </td>
                <td className="text-right font-semibold">
                  {formatCurrency(mensalistas.reduce((sum, m) => sum + calcularVTMensal(m), 0))}
                </td>
                <td className="text-right font-bold text-gold text-lg">
                  {formatCurrency(mensalistas.reduce((sum, m) => sum + calcularCustoTotal(m), 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="card p-6 bg-surface/50">
        <h3 className="text-lg font-semibold text-gold mb-4">Legenda de Pagamentos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-gold mt-1" />
            <div>
              <p className="font-medium text-white">💸 Salário (dia 5)</p>
              <p className="text-sm text-muted">Salário base + Ajuda de custo</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Banknote className="w-5 h-5 text-gold mt-1" />
            <div>
              <p className="font-medium text-white">💵 Vale-Salário (dia 20)</p>
              <p className="text-sm text-muted">Adiantamento quinzenal</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Bus className="w-5 h-5 text-gold mt-1" />
            <div>
              <p className="font-medium text-white">🚎 Vale-Transporte (último dia útil)</p>
              <p className="text-sm text-muted">Créditos de transporte mensal</p>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gold/10 border border-gold/20 rounded-lg">
          <p className="text-sm text-muted">
            <strong className="text-gold">Importante:</strong> Cada pagamento só pode ser processado uma vez por competência.
            Após processar, o lançamento é registrado em <strong>Entradas & Saídas</strong> e atualiza
            automaticamente a <strong>Visão Geral</strong>, <strong>Caixa & Banco</strong> e <strong>Relatórios</strong>.
          </p>
        </div>
      </Card>
    </div>
  );
}
