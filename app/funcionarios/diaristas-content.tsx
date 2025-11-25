/* eslint-disable */
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Calendar, DollarSign, CheckCircle, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Diarista {
  id: string;
  nome: string;
  funcao: string;
  valor_diaria: number;
  valor_diaria_semana?: number;
  valor_diaria_fimsemana?: number;
  ativo: boolean;
}

interface PontoSemanal {
  diarista_id: string;
  dias: { [key: string]: boolean };
  valores: { [key: string]: number };
}

export default function DiaristasContent() {
  const [diaristas, setDiaristas] = useState<Diarista[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [semanaAtual, setSemanaAtual] = useState(new Date());
  const [pontos, setPontos] = useState<{ [key: string]: PontoSemanal }>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nome: '',
    funcao: 'Ajudante',
    valor_diaria: 0,
    valor_diaria_semana: 0,
    valor_diaria_fimsemana: 0,
    ativo: true,
  });

  useEffect(() => {
    loadDiaristas();
    loadPontoSemanal();
  }, [semanaAtual]);

  const loadDiaristas = async () => {
    try {
      const { data, error } = await supabase
        .from('diaristas')
        .select('id, nome, funcao, valor_diaria, valor_diaria_semana, valor_diaria_fimsemana, ativo')
        .order('nome');

      if (error) throw error;
      console.log('Diaristas carregados:', data);
      setDiaristas(data || []);
    } catch (error) {
      console.error('Erro ao carregar diaristas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPontoSemanal = async () => {
    const inicio = startOfWeek(semanaAtual, { weekStartsOn: 6 });
    const fim = endOfWeek(semanaAtual, { weekStartsOn: 6 });

    try {
      const { data, error } = await supabase
        .from('diarista_ponto')
        .select('*')
        .gte('data', format(inicio, 'yyyy-MM-dd'))
        .lte('data', format(fim, 'yyyy-MM-dd'));

      if (error) throw error;

      console.log('Pontos carregados do banco:', data);

      const pontosMap: { [key: string]: PontoSemanal } = {};

      data?.forEach((ponto) => {
        if (!pontosMap[ponto.diarista_id]) {
          pontosMap[ponto.diarista_id] = {
            diarista_id: ponto.diarista_id,
            dias: {},
            valores: {},
          };
        }
        pontosMap[ponto.diarista_id].dias[ponto.data] = ponto.presente;
        // Armazenar o valor da diária que foi usado quando o ponto foi marcado
        pontosMap[ponto.diarista_id].valores[ponto.data] = ponto.valor_diaria || 0;
      });

      console.log('Pontos mapeados:', pontosMap);
      setPontos(pontosMap);
    } catch (error) {
      console.error('Erro ao carregar ponto:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from('diaristas')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Diarista atualizado com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('diaristas')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Diarista cadastrado com sucesso',
        });
      }

      setDialogOpen(false);
      resetForm();
      loadDiaristas();
    } catch (error) {
      console.error('Erro ao salvar diarista:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o diarista',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (diarista: Diarista) => {
    setEditingId(diarista.id);
    setFormData({
      nome: diarista.nome,
      funcao: diarista.funcao,
      valor_diaria: diarista.valor_diaria,
      valor_diaria_semana: diarista.valor_diaria_semana || 0,
      valor_diaria_fimsemana: diarista.valor_diaria_fimsemana || 0,
      ativo: diarista.ativo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este diarista?')) return;

    try {
      const { error } = await supabase
        .from('diaristas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Diarista excluído com sucesso',
      });
      loadDiaristas();
    } catch (error) {
      console.error('Erro ao excluir diarista:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o diarista',
        variant: 'destructive',
      });
    }
  };

  const togglePonto = async (diaristaId: string, data: string, presente: boolean) => {
    try {
      // Buscar o diarista para obter os valores de diária
      const diarista = diaristas.find(d => d.id === diaristaId);
      if (!diarista) {
        console.error('Diarista não encontrado');
        return;
      }

      // Determinar o valor da diária baseado no dia da semana
      const dia = parseISO(data);
      const diaSemana = dia.getDay();

      let valorDiaria: number;
      if (diaSemana === 0 || diaSemana === 6) {
        // Domingo (0) ou Sábado (6)
        valorDiaria = diarista.valor_diaria_fimsemana || diarista.valor_diaria;
        console.log(`Ponto fim de semana ${data}: R$ ${valorDiaria}`);
      } else {
        // Segunda a sexta
        valorDiaria = diarista.valor_diaria_semana || diarista.valor_diaria;
        console.log(`Ponto dia de semana ${data}: R$ ${valorDiaria}`);
      }

      const { data: existing } = await supabase
        .from('diarista_ponto')
        .select('id')
        .eq('diarista_id', diaristaId)
        .eq('data', data)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('diarista_ponto')
          .update({
            presente,
            valor_diaria: valorDiaria
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('diarista_ponto')
          .insert([{
            diarista_id: diaristaId,
            data,
            presente,
            valor_diaria: valorDiaria,
          }]);

        if (error) throw error;
      }

      loadPontoSemanal();
    } catch (error) {
      console.error('Erro ao salvar ponto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o ponto',
        variant: 'destructive',
      });
    }
  };

  const processarPagamentoSemanal = async () => {
    if (!confirm('Processar pagamento semanal (sábado a sexta)?')) return;

    const inicio = startOfWeek(semanaAtual, { weekStartsOn: 6 });
    const fim = endOfWeek(semanaAtual, { weekStartsOn: 6 });

    try {
      const { data: cashBook } = await supabase
        .from('cash_books')
        .select('id')
        .eq('nome', 'Caixa Dinheiro (Físico)')
        .maybeSingle();

      if (!cashBook) {
        toast({
          title: 'Erro',
          description: 'Caixa dinheiro não encontrado',
          variant: 'destructive',
        });
        return;
      }

      for (const diarista of diaristas.filter(d => d.ativo)) {
        const pontosDiarista = pontos[diarista.id];
        if (!pontosDiarista) continue;

        const diasTrabalhados = Object.values(pontosDiarista.dias).filter(p => p).length;
        if (diasTrabalhados === 0) continue;

        // Calcular valor total considerando dias de semana vs fim de semana
        let valorTotal = 0;
        let diasSemana = 0;
        let diasFimSemana = 0;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processando pagamento para: ${diarista.nome}`);
        console.log(`${'='.repeat(60)}`);
        console.log('Valores do diarista:', {
          valor_diaria: diarista.valor_diaria,
          valor_diaria_semana: diarista.valor_diaria_semana,
          valor_diaria_fimsemana: diarista.valor_diaria_fimsemana
        });
        console.log('\nDias trabalhados:');

        Object.entries(pontosDiarista.dias).forEach(([data, presente]) => {
          if (presente) {
            const dia = parseISO(data);
            const diaSemana = dia.getDay();
            const nomeDiaSemana = ['Domingo', 'Segunda', 'Ter\u00e7a', 'Quarta', 'Quinta', 'Sexta', 'S\u00e1bado'][diaSemana];

            // Usar o valor que foi salvo no banco quando o ponto foi marcado
            const valorSalvo = pontosDiarista.valores?.[data];
            let valorDia: number;

            if (valorSalvo && valorSalvo > 0) {
              // Usar valor salvo no ponto
              valorDia = Number(valorSalvo);
              console.log(`  \u{1F4C5} ${data} (${nomeDiaSemana}) - Valor salvo no ponto: R$ ${valorDia.toFixed(2)}`);
            } else {
              // Fallback: calcular baseado no dia da semana (para pontos antigos sem valor)
              if (diaSemana === 0 || diaSemana === 6) {
                valorDia = Number(diarista.valor_diaria_fimsemana || diarista.valor_diaria);
                console.log(`  \u{1F4C5} ${data} (${nomeDiaSemana}) - FIM DE SEMANA (calculado): R$ ${valorDia.toFixed(2)}`);
              } else {
                valorDia = Number(diarista.valor_diaria_semana || diarista.valor_diaria);
                console.log(`  \u{1F4C5} ${data} (${nomeDiaSemana}) - Dia de semana (calculado): R$ ${valorDia.toFixed(2)}`);
              }
            }

            if (diaSemana === 0 || diaSemana === 6) {
              diasFimSemana++;
            } else {
              diasSemana++;
            }

            valorTotal += valorDia;
            console.log(`     Subtotal acumulado: R$ ${valorTotal.toFixed(2)}`);
          }
        });

        console.log(`\n${'='.repeat(60)}`);
        console.log(`RESUMO DO PAGAMENTO:`);
        console.log(`  Dias de semana: ${diasSemana} dias`);
        console.log(`  Fins de semana: ${diasFimSemana} dias`);
        console.log(`  VALOR TOTAL: R$ ${valorTotal.toFixed(2)}`);
        console.log(`${'='.repeat(60)}\n`);

        const { error: lancError } = await supabase
          .from('diarista_lancamentos')
          .insert([{
            diarista_id: diarista.id,
            periodo_inicio: format(inicio, 'yyyy-MM-dd'),
            periodo_fim: format(fim, 'yyyy-MM-dd'),
            dias_trabalhados: diasTrabalhados,
            valor_diaria: diarista.valor_diaria,
            valor_total: valorTotal,
            data_pagamento: format(fim, 'yyyy-MM-dd'),
            pago: true,
            cash_book_id: cashBook.id,
          }]);

        if (lancError) throw lancError;

        const descricaoDias = diasFimSemana > 0
          ? `${diasTrabalhados} dias (${diasSemana} semana, ${diasFimSemana} fim de semana)`
          : `${diasTrabalhados} dias`;

        const { error: ledgerError } = await supabase
          .from('cash_ledger')
          .insert([{
            data: format(fim, 'yyyy-MM-dd'),
            tipo: 'saida',
            forma: 'dinheiro',
            categoria: 'diarista',
            descricao: `Pagamento diarista ${diarista.nome} (${descricaoDias})`,
            valor: valorTotal,
            cash_book_id: cashBook.id,
            diarista_id: diarista.id,
          }]);

        if (ledgerError) throw ledgerError;
      }

      toast({
        title: 'Sucesso',
        description: 'Pagamento semanal processado com sucesso',
      });

      loadPontoSemanal();
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o pagamento',
        variant: 'destructive',
      });
    }
  };

  const handleImportPonto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('Nenhum arquivo selecionado');
      return;
    }

    console.log('Arquivo selecionado:', file.name, file.type);

    toast({
      title: 'Processando...',
      description: 'Importando ponto, aguarde...',
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        console.log('Conteúdo do arquivo (primeiras 500 chars):', text.substring(0, 500));

        const lines = text.split('\n').filter(line => line.trim());
        console.log('Total de linhas:', lines.length);

        if (lines.length < 2) {
          toast({
            title: 'Erro',
            description: 'Arquivo vazio ou inválido',
            variant: 'destructive',
          });
          return;
        }

        const inicio = startOfWeek(semanaAtual, { weekStartsOn: 6 });
        const fim = addDays(inicio, 6);
        console.log('Período da semana:', format(inicio, 'dd/MM/yyyy'), 'até', format(fim, 'dd/MM/yyyy'));

        let importados = 0;
        let naoEncontrados: string[] = [];
        const colaboradoresProcessados = new Map<string, Set<string>>();

        const isPontomaisFormat = text.includes('Colaborador,') || text.includes('Relatório de Registros de ponto');
        console.log('Formato detectado:', isPontomaisFormat ? 'PONTOMAIS' : 'SIMPLES');

        if (isPontomaisFormat) {
          let colaboradorAtual = '';

          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let insideQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];

              if (char === '"') {
                insideQuotes = !insideQuotes;
              } else if (char === ',' && !insideQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }

            if (current) {
              result.push(current.trim());
            }

            return result;
          };

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('Colaborador,')) {
              colaboradorAtual = line.replace('Colaborador,', '').trim();
              console.log('📋 Colaborador:', colaboradorAtual);
              continue;
            }

            if (!colaboradorAtual) {
              continue;
            }

            if (line.startsWith('Nome,Data,Hora') || line.startsWith('Nome,Data') || line.startsWith('Resumo,') || line.startsWith('Total,')) {
              continue;
            }

            const parts = parseCSVLine(line);

            if (parts.length >= 3) {
              const nomeParte = parts[0];
              const dataParte = parts[1];

              if (nomeParte === colaboradorAtual) {
                const dataMatch = dataParte.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

                if (!dataMatch) {
                  continue;
                }

                const [, dia, mes, ano] = dataMatch;
                const dataRegistro = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));

                if (dataRegistro >= inicio && dataRegistro <= fim) {
                  if (!colaboradoresProcessados.has(colaboradorAtual)) {
                    colaboradoresProcessados.set(colaboradorAtual, new Set());
                  }

                  const dataFormatada = format(dataRegistro, 'yyyy-MM-dd');
                  colaboradoresProcessados.get(colaboradorAtual)!.add(dataFormatada);
                  console.log(`  ✓ ${format(dataRegistro, 'dd/MM/yyyy')}`);
                }
              }
            }
          }

          console.log('\n🎯 RESUMO:');
          console.log('Total:', colaboradoresProcessados.size, 'colaboradores');
          for (const [nome, datas] of Array.from(colaboradoresProcessados.entries())) {
            console.log(`  ${nome}: ${datas.size} dias`);
          }

          for (const [nomeColaborador, datasPresenca] of Array.from(colaboradoresProcessados.entries())) {
            const normalizar = (texto: string) => texto
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/\s+/g, ' ')
              .trim();

            const calcularScore = (nomeDiarista: string, nomeColaborador: string): number => {
              const d = normalizar(nomeDiarista);
              const c = normalizar(nomeColaborador);

              if (d === c) return 100;

              const palavrasD = d.split(' ');
              const palavrasC = c.split(' ');

              let matchExatos = 0;
              for (const palavra of palavrasC) {
                if (palavra.length > 2 && palavrasD.some(p => p === palavra)) {
                  matchExatos++;
                }
              }

              const scoreMatch = (matchExatos / palavrasC.length) * 100;

              if (matchExatos >= 2) return scoreMatch;
              if (matchExatos === 1 && palavrasC.length <= 2) return scoreMatch;

              return 0;
            };

            let melhorDiarista = null;
            let melhorScore = 0;

            for (const d of diaristas) {
              const score = calcularScore(d.nome, nomeColaborador);
              if (score > melhorScore) {
                melhorScore = score;
                melhorDiarista = d;
              }
            }

            if (!melhorDiarista || melhorScore < 50) {
              console.log(`❌ Não encontrado: ${nomeColaborador} (melhor match: ${melhorScore}%)`);
              naoEncontrados.push(nomeColaborador);
              continue;
            }

            if (!melhorDiarista.ativo) {
              console.log(`⚠️ Inativo: ${melhorDiarista.nome}`);
              continue;
            }

            console.log(`✅ ${nomeColaborador} → ${melhorDiarista.nome} (${melhorScore}%)`);
            const diarista = melhorDiarista;

            for (const data of Array.from(datasPresenca)) {
              const { data: existing, error: selectError } = await supabase
                .from('diarista_ponto')
                .select('id')
                .eq('diarista_id', diarista.id)
                .eq('data', data)
                .maybeSingle();

              if (selectError) {
                console.error('Erro ao buscar ponto:', selectError);
                throw selectError;
              }

              if (existing) {
                const { error: updateError } = await supabase
                  .from('diarista_ponto')
                  .update({ presente: true })
                  .eq('id', existing.id);

                if (updateError) throw updateError;
              } else {
                const { error: insertError } = await supabase
                  .from('diarista_ponto')
                  .insert([{
                    diarista_id: diarista.id,
                    data,
                    presente: true,
                  }]);

                if (insertError) throw insertError;
              }
            }
            importados++;
          }

        } else {
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(/[;,\t]/).map(p => p.trim());
            console.log(`Linha ${i}:`, parts);

            if (parts.length < 2) {
              console.log(`Linha ${i} ignorada: formato inválido`);
              continue;
            }

            const nomeDiarista = parts[0];
            const diasTrabalhados = parseInt(parts[1]) || 0;
            console.log(`Procurando: ${nomeDiarista}, Dias: ${diasTrabalhados}`);

            const diarista = diaristas.find(d =>
              d.nome.toLowerCase().includes(nomeDiarista.toLowerCase()) ||
              nomeDiarista.toLowerCase().includes(d.nome.toLowerCase())
            );

            if (!diarista) {
              console.log(`Diarista não encontrado: ${nomeDiarista}`);
              naoEncontrados.push(nomeDiarista);
              continue;
            }

            if (!diarista.ativo) {
              console.log(`Diarista inativo: ${diarista.nome}`);
              continue;
            }

            console.log(`Diarista encontrado: ${diarista.nome} (ID: ${diarista.id})`);

            for (let dia = 0; dia < diasTrabalhados && dia < 7; dia++) {
              const data = format(addDays(inicio, dia), 'yyyy-MM-dd');

              const { data: existing, error: selectError } = await supabase
                .from('diarista_ponto')
                .select('id')
                .eq('diarista_id', diarista.id)
                .eq('data', data)
                .maybeSingle();

              if (selectError) {
                console.error('Erro ao buscar ponto:', selectError);
                throw selectError;
              }

              if (existing) {
                const { error: updateError } = await supabase
                  .from('diarista_ponto')
                  .update({ presente: true })
                  .eq('id', existing.id);

                if (updateError) {
                  console.error('Erro ao atualizar ponto:', updateError);
                  throw updateError;
                }
                console.log(`Atualizado: ${diarista.nome} em ${data}`);
              } else {
                const { error: insertError } = await supabase
                  .from('diarista_ponto')
                  .insert([{
                    diarista_id: diarista.id,
                    data,
                    presente: true,
                  }]);

                if (insertError) {
                  console.error('Erro ao inserir ponto:', insertError);
                  throw insertError;
                }
                console.log(`Inserido: ${diarista.nome} em ${data}`);
              }
            }
            importados++;
          }
        }

        let mensagem = `Ponto importado para ${importados} diarista(s)`;
        if (naoEncontrados.length > 0) {
          mensagem += `\n\nNão encontrados: ${naoEncontrados.join(', ')}`;
        }

        toast({
          title: 'Sucesso',
          description: mensagem,
        });

        setImportDialogOpen(false);
        loadPontoSemanal();

        event.target.value = '';
      } catch (error: any) {
        console.error('Erro ao importar ponto:', error);
        toast({
          title: 'Erro',
          description: error.message || 'Erro ao processar arquivo. Verifique o console.',
          variant: 'destructive',
        });
      }
    };

    reader.onerror = (error) => {
      console.error('Erro ao ler arquivo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao ler o arquivo',
        variant: 'destructive',
      });
    };

    reader.readAsText(file, 'UTF-8');
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      funcao: 'Ajudante',
      valor_diaria: 0,
      valor_diaria_semana: 0,
      valor_diaria_fimsemana: 0,
      ativo: true,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDiasSemana = () => {
    const inicio = startOfWeek(semanaAtual, { weekStartsOn: 6 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  };

  const calcularTotalSemana = () => {
    let total = 0;
    diaristas.filter(d => d.ativo).forEach(diarista => {
      const pontoDiarista = pontos[diarista.id];
      if (pontoDiarista) {
        // Calcular usando os valores salvos nos pontos
        Object.entries(pontoDiarista.dias).forEach(([data, presente]) => {
          if (presente) {
            const valorSalvo = pontoDiarista.valores?.[data];
            if (valorSalvo && valorSalvo > 0) {
              // Usar valor salvo no ponto
              total += Number(valorSalvo);
            } else {
              // Fallback: calcular baseado no dia da semana
              const dia = parseISO(data);
              const diaSemana = dia.getDay();
              if (diaSemana === 0 || diaSemana === 6) {
                total += Number(diarista.valor_diaria_fimsemana || diarista.valor_diaria);
              } else {
                total += Number(diarista.valor_diaria_semana || diarista.valor_diaria);
              }
            }
          }
        });
      }
    });
    return total;
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-96">
          <div className="text-gold text-lg">Carregando diaristas...</div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Novo Diarista
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-surface border-border">
              <DialogHeader>
                <DialogTitle className="text-gold">
                  {editingId ? 'Editar Diarista' : 'Novo Diarista'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Função</label>
                  <select
                    value={formData.funcao}
                    onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                    className="select-dark w-full"
                  >
                    <option value="Ajudante">Ajudante</option>
                    <option value="Pedreiro">Pedreiro</option>
                    <option value="Pintor">Pintor</option>
                    <option value="Eletricista">Eletricista</option>
                    <option value="Encanador">Encanador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Valor da Diária (padrão)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_diaria}
                    onChange={(e) => setFormData({ ...formData, valor_diaria: parseFloat(e.target.value) || 0 })}
                    className="input-dark"
                    required
                  />
                  <p className="text-xs text-muted mt-1">Valor padrão para compatibilidade</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gold">Diária Semana (Seg-Sex)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_diaria_semana}
                      onChange={(e) => setFormData({ ...formData, valor_diaria_semana: parseFloat(e.target.value) || 0 })}
                      className="input-dark"
                      placeholder="Ex: 150.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gold">Diária Final de Semana</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_diaria_fimsemana}
                      onChange={(e) => setFormData({ ...formData, valor_diaria_fimsemana: parseFloat(e.target.value) || 0 })}
                      className="input-dark"
                      placeholder="Ex: 200.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Ativo</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="btn-primary flex-1">
                    {editingId ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="cadastro" className="space-y-6">
          <TabsList className="bg-surface border border-border">
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="ponto">Controle de Ponto</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="space-y-6">
            <Card className="card">
              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Função</th>
                      <th>Diária Semana</th>
                      <th>Diária Fim Semana</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diaristas.map((diarista) => (
                      <tr key={diarista.id}>
                        <td className="font-medium">{diarista.nome}</td>
                        <td>{diarista.funcao}</td>
                        <td className="text-gold font-semibold">
                          {formatCurrency(diarista.valor_diaria_semana || diarista.valor_diaria)}
                        </td>
                        <td className="text-blue-400 font-semibold">
                          {formatCurrency(diarista.valor_diaria_fimsemana || diarista.valor_diaria)}
                        </td>
                        <td>
                          {diarista.ativo ? (
                            <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                              Ativo
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-muted/10 text-muted rounded-full">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(diarista)}
                              className="hover:bg-gold/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(diarista.id)}
                              className="hover:bg-danger/10 hover:text-danger"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ponto" className="space-y-6">
            <Card className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setSemanaAtual(addDays(semanaAtual, -7))}
                    className="btn-secondary"
                  >
                    ← Semana Anterior
                  </Button>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gold">
                      {format(startOfWeek(semanaAtual, { weekStartsOn: 6 }), 'dd/MM', { locale: ptBR })} a{' '}
                      {format(endOfWeek(semanaAtual, { weekStartsOn: 6 }), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted">Sábado a Sexta</p>
                  </div>
                  <Button
                    onClick={() => setSemanaAtual(addDays(semanaAtual, 7))}
                    className="btn-secondary"
                  >
                    Próxima Semana →
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="btn-secondary">
                        <Upload className="w-4 h-4 mr-2" />
                        Importar Ponto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-surface border-border">
                      <DialogHeader>
                        <DialogTitle className="text-[#FFD86F]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                          Importar Ponto CSV
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-panel/50 rounded-lg">
                          <h4 className="font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Formato do Arquivo</h4>
                          <p className="text-sm text-muted mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                            O arquivo CSV deve ter o seguinte formato:
                          </p>
                          <pre className="text-xs bg-black/30 p-3 rounded">
Nome;Dias Trabalhados
João Silva;5
Maria Santos;4
Pedro Costa;3
                          </pre>
                          <p className="text-xs text-muted mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                            • Separador: ponto e vírgula (;), vírgula (,) ou tab
                            <br />• Dias: número de 0 a 7
                            <br />• Os pontos serão marcados sequencialmente a partir de sábado
                          </p>
                        </div>
                        <div>
                          <label htmlFor="import-file" className="cursor-pointer">
                            <div className="flex items-center justify-center p-6 border-2 border-dashed border-gold/30 rounded-lg hover:border-gold/50 transition-colors">
                              <Upload className="h-8 w-8 text-gold mr-3" />
                              <div>
                                <p className="font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Selecionar arquivo CSV</p>
                                <p className="text-xs text-muted" style={{ fontFamily: 'Inter, sans-serif' }}>Clique para escolher</p>
                              </div>
                            </div>
                            <Input
                              id="import-file"
                              type="file"
                              accept=".csv,.txt"
                              className="hidden"
                              onChange={handleImportPonto}
                            />
                          </label>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={processarPagamentoSemanal} className="btn-primary">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Processar Pagamento Semanal
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-panel">Diarista</th>
                      {getDiasSemana().map((dia) => (
                        <th key={dia.toISOString()} className="text-center">
                          <div className="text-xs text-muted">
                            {format(dia, 'EEE', { locale: ptBR })}
                          </div>
                          <div className="font-semibold">
                            {format(dia, 'dd/MM')}
                          </div>
                        </th>
                      ))}
                      <th>Total Dias</th>
                      <th>Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diaristas.filter(d => d.ativo).map((diarista) => {
                      const pontoDiarista = pontos[diarista.id] || { dias: {}, valores: {} };
                      const diasTrabalhados = Object.values(pontoDiarista.dias).filter(p => p).length;

                      // Calcular valor total usando os valores salvos nos pontos
                      let valorTotal = 0;
                      Object.entries(pontoDiarista.dias).forEach(([data, presente]) => {
                        if (presente) {
                          const valorSalvo = pontoDiarista.valores?.[data];
                          if (valorSalvo && valorSalvo > 0) {
                            // Usar valor salvo no ponto
                            valorTotal += Number(valorSalvo);
                          } else {
                            // Fallback: calcular baseado no dia da semana
                            const dia = parseISO(data);
                            const diaSemana = dia.getDay();
                            if (diaSemana === 0 || diaSemana === 6) {
                              valorTotal += Number(diarista.valor_diaria_fimsemana || diarista.valor_diaria);
                            } else {
                              valorTotal += Number(diarista.valor_diaria_semana || diarista.valor_diaria);
                            }
                          }
                        }
                      });

                      return (
                        <tr key={diarista.id}>
                          <td className="sticky left-0 bg-panel font-medium">
                            {diarista.nome}
                          </td>
                          {getDiasSemana().map((dia) => {
                            const dataStr = format(dia, 'yyyy-MM-dd');
                            const presente = pontoDiarista.dias[dataStr] || false;

                            return (
                              <td key={dataStr} className="text-center">
                                <button
                                  onClick={() => togglePonto(diarista.id, dataStr, !presente)}
                                  className={`w-8 h-8 rounded-full transition-all ${
                                    presente
                                      ? 'bg-success text-white'
                                      : 'bg-panel border border-border hover:border-gold'
                                  }`}
                                >
                                  {presente && <CheckCircle className="w-4 h-4 mx-auto" />}
                                </button>
                              </td>
                            );
                          })}
                          <td className="text-center font-semibold">{diasTrabalhados}</td>
                          <td className="text-gold font-semibold">
                            {formatCurrency(valorTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gold/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[#FFD86F]">
                    {formatCurrency(calcularTotalSemana())}
                  </p>
                  <p className="text-sm text-muted">Total da Semana</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
