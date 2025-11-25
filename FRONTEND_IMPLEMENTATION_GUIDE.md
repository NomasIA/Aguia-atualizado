# Frontend Implementation Guide

Este documento descreve os componentes frontend implementados e como completar a implementação.

## Componentes Implementados

### 1. Utilitários e Contextos

#### `/lib/format-utils.ts`
Funções de formatação:
- `formatCurrency()` - Formata valores em BRL
- `formatDate()` - Formata datas para dd/MM/yyyy
- `formatDateISO()` - Formata para inputs (yyyy-MM-dd)
- `formatCompetencia()` - Formata YYYY-MM para "Mês Ano"
- `getStatusColor()` - Retorna classes CSS para badges de status

#### `/lib/edit-mode-context.tsx`
Contexto global para modo de edição:
```tsx
import { EditModeProvider, useEditMode } from '@/lib/edit-mode-context';

// No componente raiz:
<EditModeProvider>
  <YourComponent />
</EditModeProvider>

// Dentro do componente:
const { isEditMode, toggleEditMode } = useEditMode();
```

### 2. Componentes Reutilizáveis

#### `/components/status-badge.tsx`
Badge colorido baseado em status:
```tsx
<StatusBadge status="Conciliado" />
<StatusBadge status="Pendente" />
```

#### `/components/vale-refeicao-calculator.tsx`
Calculadora de Vale Refeição:
```tsx
<ValeRefeicaoCalculator
  valorDia={35.00}
  diasMes={22}
  onChange={(valorDia, diasMes, total) => {
    // Atualizar estado
  }}
  readOnly={!isEditMode}
/>
```

### 3. Tela de Conciliação

#### `/app/conciliacao/page.tsx`
Tela completa de conciliação bancária com:
- KPIs de conciliação
- Lista de extratos importados
- Ações de conciliação:
  - Vincular a transação existente
  - Criar e conciliar
  - Desfazer conciliação
  - Excluir linha
- Modo de edição/visualização
- Atualização em tempo real após ações

## Próximos Passos de Implementação

### 1. Adicionar Vale Refeição aos Funcionários

Editar `/app/funcionarios/page.tsx`:

```tsx
import { ValeRefeicaoCalculator } from '@/components/vale-refeicao-calculator';

// Dentro do formulário de edição de funcionário:
<ValeRefeicaoCalculator
  valorDia={funcionario.vale_refeicao_valor_dia}
  diasMes={funcionario.vale_refeicao_dias_mes}
  onChange={(valorDia, diasMes, totalCalculado) => {
    setFuncionario({
      ...funcionario,
      vale_refeicao_valor_dia: valorDia,
      vale_refeicao_dias_mes: diasMes,
      vale_refeicao_total_calculado: totalCalculado
    });
  }}
  readOnly={!isEditMode}
/>
```

### 2. Criar Tela de Diaristas Detalhada

Criar `/app/diaristas/calculo/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate, getDayOfWeek } from '@/lib/format-utils';

interface DiaristaCalculo {
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

export default function DiaristaCalculoPage() {
  const [periodo, setPeriodo] = useState({
    dataInicio: '',
    dataFim: ''
  });
  const [calculos, setCalculos] = useState<DiaristaCalculo[]>([]);

  async function carregar() {
    const res = await fetch(
      `/api/diaristas?action=totais-periodo&dataInicio=${periodo.dataInicio}&dataFim=${periodo.dataFim}`
    );
    const data = await res.json();
    if (data.success) {
      setCalculos(data.data.detalhePorDiarista);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cálculo de Diaristas</h1>

      {/* Filtros de período */}
      <div className="flex gap-4">
        <input
          type="date"
          value={periodo.dataInicio}
          onChange={e => setPeriodo({...periodo, dataInicio: e.target.value})}
        />
        <input
          type="date"
          value={periodo.dataFim}
          onChange={e => setPeriodo({...periodo, dataFim: e.target.value})}
        />
        <button onClick={carregar}>Calcular</button>
      </div>

      {/* Tabela de resultados */}
      <div>
        {calculos.map(calc => (
          <div key={calc.diarista_id} className="mb-6">
            <h3 className="text-xl font-bold">{calc.nome}</h3>
            <div className="grid grid-cols-3 gap-4 my-4">
              <div>
                <p>Dias Úteis: {calc.dias_uteis}</p>
                <p>Valor: {formatCurrency(calc.valor_dias_uteis)}</p>
              </div>
              <div>
                <p>Fins de Semana: {calc.dias_fim_semana}</p>
                <p>Valor: {formatCurrency(calc.valor_fim_semana)}</p>
              </div>
              <div>
                <p>Total: {calc.total_dias} dias</p>
                <p className="font-bold">{formatCurrency(calc.total_geral)}</p>
              </div>
            </div>

            {/* Detalhes por dia */}
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Dia da Semana</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {calc.detalhes.map((det, i) => (
                  <tr key={i}>
                    <td>{formatDate(det.data)}</td>
                    <td>{det.dia_semana}</td>
                    <td>{det.tipo === 'util' ? 'Útil' : 'Fim de Semana'}</td>
                    <td>{formatCurrency(det.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Criar Tela de Relatórios

Criar `/app/relatorios/nova/page.tsx`:

```tsx
"use client";

import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/format-utils';
import * as XLSX from 'xlsx';

type TipoRelatorio = 'mensalistas' | 'diaristas' | 'entradas-saidas' | 'obras' | 'maquinas' | 'contratos' | 'financeiro';

export default function RelatoriosPage() {
  const [tipo, setTipo] = useState<TipoRelatorio>('financeiro');
  const [periodo, setPeriodo] = useState({
    dataInicio: '',
    dataFim: ''
  });
  const [dados, setDados] = useState<any>(null);

  async function carregar() {
    let url = `/api/relatorios?type=${tipo}`;

    if (['diaristas', 'entradas-saidas', 'financeiro'].includes(tipo)) {
      url += `&dataInicio=${periodo.dataInicio}&dataFim=${periodo.dataFim}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setDados(data.data);
    }
  }

  function exportarExcel() {
    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Converter dados para formato de planilha
    const ws = XLSX.utils.json_to_sheet(
      // Transformar dados conforme tipo de relatório
      []
    );

    // Estilização (cabeçalho preto + dourado)
    // Nota: SheetJS suporta estilos apenas na versão Pro
    // Para versão básica, os dados são exportados sem formatação

    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${tipo}_${new Date().toISOString()}.xlsx`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Relatórios</h1>

      <div className="flex gap-4">
        <select value={tipo} onChange={e => setTipo(e.target.value as TipoRelatorio)}>
          <option value="mensalistas">Mensalistas</option>
          <option value="diaristas">Diaristas</option>
          <option value="entradas-saidas">Entradas & Saídas</option>
          <option value="obras">Obras</option>
          <option value="maquinas">Máquinas</option>
          <option value="contratos">Contratos</option>
          <option value="financeiro">Financeiro Geral</option>
        </select>

        {['diaristas', 'entradas-saidas', 'financeiro'].includes(tipo) && (
          <>
            <input
              type="date"
              value={periodo.dataInicio}
              onChange={e => setPeriodo({...periodo, dataInicio: e.target.value})}
            />
            <input
              type="date"
              value={periodo.dataFim}
              onChange={e => setPeriodo({...periodo, dataFim: e.target.value})}
            />
          </>
        )}

        <button onClick={carregar}>Gerar</button>
        {dados && <button onClick={exportarExcel}>Exportar Excel</button>}
      </div>

      {/* Renderizar dados conforme tipo */}
      {dados && (
        <div className="bg-white rounded-lg shadow">
          {/* Cabeçalho preto + dourado */}
          <div className="bg-black text-yellow-500 p-4">
            <h2 className="text-2xl font-bold">Relatório: {tipo}</h2>
          </div>

          {/* Conteúdo específico por tipo */}
          {tipo === 'financeiro' && (
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3>Custos Fixos</h3>
                  <p>Total: {formatCurrency(dados.custosFixos.total)}</p>
                  <p>Pagos: {formatCurrency(dados.custosFixos.pagos)}</p>
                  <p>Pendentes: {formatCurrency(dados.custosFixos.pendentes)}</p>
                </div>
                <div>
                  <h3>Custos Variáveis</h3>
                  <p>Mensalistas: {formatCurrency(dados.custosVariaveis.mensalistas)}</p>
                  <p>Diaristas: {formatCurrency(dados.custosVariaveis.diaristas)}</p>
                  <p>Total: {formatCurrency(dados.custosVariaveis.total)}</p>
                </div>
                <div>
                  <h3>Receitas</h3>
                  <p>Obras: {formatCurrency(dados.receitas.obras)}</p>
                  <p>Contratos: {formatCurrency(dados.receitas.contratos)}</p>
                  <p>Total: {formatCurrency(dados.receitas.total)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-xl font-bold mb-4">Resultado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p>Receita Total: {formatCurrency(dados.resultado.receitaTotal)}</p>
                    <p>Custo Total: {formatCurrency(dados.resultado.custoTotal)}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      Lucro: {formatCurrency(dados.resultado.lucro)}
                    </p>
                    <p>Margem: {dados.resultado.margem.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Integração com APIs

Todos os endpoints estão documentados em `BACKEND_API_DOCUMENTATION.md`.

### Padrão de Consumo

```tsx
// GET
const res = await fetch('/api/transacoes?dataInicio=2025-11-01&dataFim=2025-11-30');
const data = await res.json();

// POST
const res = await fetch('/api/transacoes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: '2025-11-25', valor: 1500, ... })
});

// DELETE
const res = await fetch(`/api/transacoes?id=${id}`, { method: 'DELETE' });
```

### Atualização em Tempo Real

Após qualquer ação (criar/editar/excluir/conciliar):

```tsx
async function handleAction() {
  try {
    const res = await fetch('/api/endpoint', { ... });
    const result = await res.json();

    if (result.success) {
      toast.success(result.message);
      await recarregarDados(); // Refetch sem reload
      await atualizarKPIs(); // Atualizar dashboards
    } else {
      toast.error(result.message);
    }
  } catch (error) {
    toast.error('Erro ao processar');
  }
}
```

## Exportação Excel

Instale a dependência:
```bash
npm install xlsx
```

Exemplo básico:
```tsx
import * as XLSX from 'xlsx';

function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

## Checklist de Implementação

### Conciliação ✅
- [x] Tela de listagem de extratos
- [x] Botões de ação (vincular, criar, desfazer, excluir)
- [x] Modo de edição/visualização
- [x] KPIs de conciliação
- [x] Toasts de feedback
- [x] Atualização em tempo real

### Funcionários (Parcial)
- [x] Componente Vale Refeição criado
- [ ] Integrar VR na tela de edição
- [ ] Salvar dados de VR no backend
- [ ] Mostrar VR em modo visualização

### Diaristas (Pendente)
- [ ] Tela de cálculo detalhado
- [ ] Filtro por período
- [ ] Tabela com dias trabalhados
- [ ] Diferenciação de taxas (útil/fim de semana)
- [ ] Totais consolidados

### Relatórios (Pendente)
- [ ] Seletor de tipo de relatório
- [ ] Filtros de período
- [ ] Visualização de dados
- [ ] Exportação Excel
- [ ] Formatação BRL
- [ ] Cabeçalho preto + dourado

### Melhorias Gerais
- [ ] Loading states em todas as telas
- [ ] Error boundaries
- [ ] Validação de formulários
- [ ] Acessibilidade (ARIA labels)
- [ ] Responsividade mobile
- [ ] Testes unitários

## Boas Práticas

1. **Sempre use as funções de formatação**:
   - `formatCurrency()` para valores
   - `formatDate()` para datas
   - `formatCompetencia()` para mês/ano

2. **Toast para feedback**:
   - Sucesso: `toast.success('mensagem')`
   - Erro: `toast.error('mensagem')`

3. **Loading states**:
   ```tsx
   if (loading) return <div>Carregando...</div>
   ```

4. **Error handling**:
   ```tsx
   try {
     // operação
   } catch (error) {
     console.error(error);
     toast.error('Erro');
   }
   ```

5. **Modo de edição**:
   ```tsx
   {isEditMode && <Button>Editar</Button>}
   ```
