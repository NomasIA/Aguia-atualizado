# Backend API Documentation

Este documento descreve a camada de backend completa implementada para o sistema financeiro.

## Visão Geral

A arquitetura backend foi implementada com:
- **Services**: Lógica de negócio reutilizável em `/lib/*-service.ts`
- **API Routes**: Endpoints REST em `/app/api/*`
- **TypeScript**: Tipagem completa para segurança
- **Supabase**: Cliente configurado para comunicação com banco de dados

---

## 1. Transações (transacoes)

### Service: `/lib/transacoes-service.ts`

Gerencia transações financeiras manuais com exclusão lógica e recálculo automático de KPIs.

#### Funções Principais

##### `softDeleteTransacao(transacaoId: string)`
- Marca transação como excluída (deleted_at)
- Remove vínculos de conciliação
- Retorna: `{ success, message }`

##### `getActiveTransacoes(filters?)`
- Lista transações ativas (deleted_at IS NULL)
- Filtros: dataInicio, dataFim, tipo, conta, categoria
- Retorna: Array de transações

##### `createTransacao(transacao)`
- Cria nova transação
- Retorna: Transação criada ou null

##### `calculateTransacoesKPIs(filters?)`
- Calcula totais de entradas, saídas e saldo
- Agrupa por conta
- Retorna: Objeto com KPIs

### API: `/api/transacoes`

#### `GET /api/transacoes`
Lista transações com filtros opcionais.

**Query Params:**
- `dataInicio` (opcional): Data inicial
- `dataFim` (opcional): Data final
- `tipo` (opcional): 'entrada' ou 'saida'
- `conta` (opcional): Nome da conta
- `categoria` (opcional): Categoria

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 150
}
```

#### `GET /api/transacoes?action=kpis`
Retorna KPIs calculados.

**Response:**
```json
{
  "totalEntradas": 50000,
  "totalSaidas": 30000,
  "saldo": 20000,
  "porConta": {
    "banco": { "entradas": 40000, "saidas": 25000, "saldo": 15000 },
    "dinheiro": { "entradas": 10000, "saidas": 5000, "saldo": 5000 }
  }
}
```

#### `POST /api/transacoes`
Cria nova transação.

**Body:**
```json
{
  "data": "2025-11-25",
  "descricao": "Pagamento fornecedor",
  "valor": 1500.00,
  "tipo": "saida",
  "forma_pagamento": "transferencia",
  "categoria": "Fornecedores",
  "conta": "banco"
}
```

#### `DELETE /api/transacoes?id={uuid}`
Exclusão lógica de transação.

**Response:**
```json
{
  "success": true,
  "message": "Exclusão processada e conciliação atualizada."
}
```

---

## 2. Extratos Bancários (extratos_importados)

### Service: `/lib/extratos-service.ts`

Gerencia importação de extratos com antidualização via hash único.

#### Funções Principais

##### `importExtratos(linhas, source?)`
- Importa linhas de extrato
- Gera hash único para cada linha
- Previne duplicatas
- Retorna: Estatísticas de importação

**Exemplo:**
```typescript
const result = await importExtratos([
  {
    conta_id: 'itau',
    data: '2025-11-25',
    historico: 'PIX RECEBIDO',
    valor: 5000.00,
    saldo: 25000.00
  }
], 'manual_upload');

// Result:
// {
//   success: true,
//   imported: 10,
//   duplicates: 2,
//   errors: 0,
//   message: "Importação concluída: 10 linhas importadas, 2 duplicadas, 0 erros."
// }
```

##### `softDeleteExtrato(extratoId)`
- Verifica se source = 'manual_upload'
- Remove conciliação se existir
- Marca como excluído
- Retorna: `{ success, message }`

##### `getActiveExtratos(filters?)`
- Lista extratos ativos
- Filtros: conta_id, dataInicio, dataFim, conciliado

##### `getReconciliationStatus(conta_id?)`
- Estatísticas de conciliação
- Retorna: total, conciliados, naoConciliados, percentual

### API: `/api/extratos`

#### `GET /api/extratos`
Lista extratos bancários.

**Query Params:**
- `conta_id`, `dataInicio`, `dataFim`, `conciliado`

#### `GET /api/extratos?action=status`
Status de conciliação.

**Response:**
```json
{
  "total": 150,
  "conciliados": 120,
  "naoConciliados": 30,
  "percentualConciliado": "80.0"
}
```

#### `POST /api/extratos`
Importa extratos.

**Body:**
```json
{
  "linhas": [
    {
      "conta_id": "itau",
      "data": "2025-11-25",
      "historico": "PIX RECEBIDO CLIENTE X",
      "valor": 5000.00,
      "saldo": 25000.00
    }
  ],
  "source": "manual_upload"
}
```

#### `DELETE /api/extratos?id={uuid}`
Exclusão lógica (apenas manual_upload).

---

## 3. Conciliação

### Service: `/lib/conciliacao-service.ts`

Reconcilia extratos bancários com transações.

#### Funções Principais

##### `conciliarComTransacao(extratoId, transacaoId)`
Vincula extrato a transação existente.

##### `criarTransacaoEConciliar(extratoId, tipo, categoria?, conta?)`
Cria transação a partir do extrato e vincula automaticamente.

##### `desfazerConciliacao(extratoId, deleteTransacao?)`
Remove vínculo de conciliação. Opcionalmente exclui a transação vinculada.

##### `tentarConciliacaoAutomatica(extratoId, contaId?)`
Busca transação correspondente por:
- Valor igual
- Data ±2 dias
- Conta correspondente

### API: `/api/conciliacao`

#### `POST /api/conciliacao`

**Action: link** - Vincular a transação existente
```json
{
  "action": "link",
  "extratoId": "uuid",
  "transacaoId": "uuid"
}
```

**Action: create** - Criar transação e vincular
```json
{
  "action": "create",
  "extratoId": "uuid",
  "tipo": "entrada",
  "categoria": "Recebimentos",
  "conta": "banco"
}
```

**Action: unlink** - Desfazer conciliação
```json
{
  "action": "unlink",
  "extratoId": "uuid",
  "deleteTransacao": false
}
```

**Action: auto** - Conciliação automática
```json
{
  "action": "auto",
  "extratoId": "uuid",
  "contaId": "itau"
}
```

---

## 4. Calendário de Negócios (business-days)

### Service: `/lib/business-days-service.ts`

Cálculo de dias úteis considerando feriados brasileiros.

#### Funções Principais

##### `ajustarDataUtil(date, tipo_operacao?)`
Ajusta data para próximo dia útil se cair em final de semana ou feriado.

```typescript
const dataAjustada = await ajustarDataUtil('2025-12-25', 'pagamento');
// Se 25/12 for feriado, retorna próximo dia útil
```

##### `calcularDiasUteis(dataInicio, dataFim)`
Conta dias úteis entre duas datas.

##### `getUltimoDiaUtilMes(year, month)`
Retorna último dia útil do mês.

##### `adicionarDiasUteis(date, diasUteis)`
Adiciona N dias úteis a uma data.

#### Uso em Serviços

Esta função é usada automaticamente em:
- Criação de transações
- Pagamento de custos fixos
- Vencimento de receitas
- Qualquer operação financeira

---

## 5. Custos Fixos

### Service: `/lib/custos-fixos-service.ts`

Gerencia custos fixos com pagamento automático.

#### Funções Principais

##### `marcarCustoFixoComoPago(custoFixoId, dataPagamento?, conta?, tipo?)`
Processa pagamento:
1. Ajusta data para dia útil
2. Verifica duplicidade por competência
3. Cria transação automaticamente
4. Vincula transacao_id
5. Tenta conciliação automática
6. Retorna: `{ success, message, transacaoId, dataAjustada, conciliadoAutomaticamente }`

##### `gerarCustosFixosMes(competencia)`
Gera custos fixos mensais automaticamente baseado em custos base.

**Exemplo:**
```typescript
const gerados = await gerarCustosFixosMes('2025-12');
// Cria entradas para todos os custos fixos recorrentes do mês
```

##### `calcularTotaisCustosFixos(filters?)`
Retorna totais: total, pagos, pendentes, quantidade.

### API: `/api/custos-fixos`

#### `GET /api/custos-fixos`
Lista custos fixos.

**Query Params:**
- `categoria`, `pago`, `competencia`, `ativo`

#### `GET /api/custos-fixos?action=totais`
Totais calculados.

#### `POST /api/custos-fixos`

**Action: pagar** - Marcar como pago
```json
{
  "action": "pagar",
  "custoFixoId": "uuid",
  "dataPagamento": "2025-11-25",
  "conta_pagamento": "banco",
  "tipo_pagamento": "transferencia"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pagamento registrado e conciliação atualizada.",
  "transacaoId": "uuid",
  "dataAjustada": "2025-11-26",
  "conciliadoAutomaticamente": true
}
```

**Action: gerar** - Gerar custos do mês
```json
{
  "action": "gerar",
  "competencia": "2025-12"
}
```

---

## 6. Diaristas

### Service: `/lib/diaristas-calculation-service.ts`

Cálculo de pagamentos com taxas diferenciadas para dias úteis e finais de semana.

#### Funções Principais

##### `calcularPagamentoDiarista(diaristaId, datasTrabalho[])`
Calcula pagamento baseado em:
- `valor_diaria_semana` para segunda a sexta
- `valor_diaria_fimsemana` para sábado e domingo

**Retorna:**
```typescript
{
  diarista_id: string,
  nome: string,
  dias_uteis: number,
  dias_fim_semana: number,
  total_dias: number,
  valor_dias_uteis: number,
  valor_fim_semana: number,
  total_geral: number,
  detalhes: [
    {
      data: "2025-11-25",
      dia_semana: "Segunda",
      tipo: "util",
      valor: 150.00
    }
  ]
}
```

##### `calcularPagamentosDiaristasPeriodo(periodo)`
Calcula para todos os diaristas em um período.

##### `getTotaisDiaristasPeriodo(periodo)`
Totais consolidados de todos os diaristas.

### API: `/api/diaristas`

#### `GET /api/diaristas`
Lista diaristas ativos.

#### `GET /api/diaristas?action=calcular-periodo`
Calcula pagamentos do período.

**Query Params:**
- `dataInicio`, `dataFim`

#### `GET /api/diaristas?action=totais-periodo`
Totais consolidados.

#### `POST /api/diaristas`

**Action: calcular** - Calcular pagamento específico
```json
{
  "action": "calcular",
  "diaristaId": "uuid",
  "datasTrabalho": ["2025-11-25", "2025-11-26", "2025-11-30"]
}
```

**Action: update-rates** - Atualizar taxas
```json
{
  "action": "update-rates",
  "diaristaId": "uuid",
  "valorSemana": 150.00,
  "valorFimSemana": 200.00
}
```

---

## 7. Relatórios Consolidados

### Service: `/lib/relatorios-service.ts`

Relatórios integrados de todos os módulos.

#### Funções Disponíveis

##### `getRelatorioMensalistas(competencia?)`
Relatório de funcionários mensalistas com totais.

##### `getRelatorioDiaristas(periodo)`
Relatório de diaristas com cálculos de dias e valores.

##### `getRelatorioEntradasSaidas(periodo?)`
Entradas e saídas separadas por banco/dinheiro.

##### `getRelatorioObras()`
Obras com receitas, recebidos e pendentes.

##### `getRelatorioMaquinas()`
Máquinas disponíveis, locadas e patrimônio.

##### `getRelatorioContratos()`
Contratos de locação com valores.

##### `getRelatorioFinanceiro(periodo)`
Relatório financeiro completo com:
- Custos fixos e variáveis
- Receitas
- Resultado (lucro/margem)
- Saldos

### API: `/api/relatorios`

#### `GET /api/relatorios?type={type}`

**Types disponíveis:**

##### `mensalistas`
```
GET /api/relatorios?type=mensalistas&competencia=2025-11
```

##### `diaristas`
```
GET /api/relatorios?type=diaristas&dataInicio=2025-11-01&dataFim=2025-11-30
```

##### `entradas-saidas`
```
GET /api/relatorios?type=entradas-saidas&dataInicio=2025-11-01&dataFim=2025-11-30
```

##### `obras`
```
GET /api/relatorios?type=obras
```

##### `maquinas`
```
GET /api/relatorios?type=maquinas
```

##### `contratos`
```
GET /api/relatorios?type=contratos
```

##### `financeiro`
```
GET /api/relatorios?type=financeiro&dataInicio=2025-11-01&dataFim=2025-11-30
```

**Response exemplo (financeiro):**
```json
{
  "success": true,
  "data": {
    "periodo": {
      "dataInicio": "2025-11-01",
      "dataFim": "2025-11-30"
    },
    "custosFixos": {
      "total": 15000,
      "pagos": 12000,
      "pendentes": 3000
    },
    "custosVariaveis": {
      "mensalistas": 45000,
      "diaristas": 12000,
      "outros": 0,
      "total": 57000
    },
    "receitas": {
      "obras": 80000,
      "contratos": 25000,
      "outros": 0,
      "total": 105000
    },
    "resultado": {
      "receitaTotal": 105000,
      "custoTotal": 72000,
      "lucro": 33000,
      "margem": 31.43
    },
    "saldos": {
      "banco": 50000,
      "dinheiro": 8000,
      "total": 58000
    }
  }
}
```

---

## Regras de Negócio Importantes

### 1. Exclusão Lógica (Soft Delete)
- Todas as queries filtram `deleted_at IS NULL`
- KPIs, relatórios e conciliações ignoram registros excluídos
- Preserva histórico para auditoria

### 2. Antidualização de Extratos
- Hash único: `SHA-256(conta_id + data + valor + historico)`
- Linhas duplicadas são ignoradas na importação
- Status: 'imported', 'duplicate', 'error'

### 3. Calendário Bancário Brasileiro
- Considera sábados, domingos e feriados
- Ajusta automaticamente para próximo dia útil
- Cache de feriados com 1 hora de duração
- Timezone: America/Sao_Paulo

### 4. Custos Fixos - Competência
- Campo `competencia` formato 'YYYY-MM'
- Previne duplicação de lançamentos mensais
- Geração automática baseada em custos base

### 5. Conciliação Automática
- Critérios: valor igual, data ±2 dias, conta correspondente
- Prioriza correspondência com data mais próxima
- Executada automaticamente após pagamento de custos fixos

### 6. Diaristas - Taxas Diferenciadas
- Segunda a Sexta: `valor_diaria_semana`
- Sábado e Domingo: `valor_diaria_fimsemana`
- Fallback para `valor_diaria` se campos específicos não existirem

---

## Consumo no Frontend

### Exemplo com fetch:

```typescript
// Criar transação
const response = await fetch('/api/transacoes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: '2025-11-25',
    descricao: 'Pagamento fornecedor',
    valor: 1500.00,
    tipo: 'saida',
    conta: 'banco'
  })
});
const result = await response.json();

// Importar extratos
const importResult = await fetch('/api/extratos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    linhas: extractLines,
    source: 'manual_upload'
  })
});

// Conciliar automaticamente
const concilResult = await fetch('/api/conciliacao', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'auto',
    extratoId: 'uuid-do-extrato'
  })
});

// Marcar custo fixo como pago
const pagoResult = await fetch('/api/custos-fixos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'pagar',
    custoFixoId: 'uuid-do-custo',
    conta_pagamento: 'banco'
  })
});
```

---

## Segurança e Boas Práticas

1. **Todas as queries filtram deleted_at IS NULL** - Dados excluídos não aparecem
2. **Validação de tipos** - TypeScript garante tipos corretos
3. **Error handling** - Try/catch em todos os endpoints
4. **Transações atômicas** - Rollback em caso de erro
5. **Cache inteligente** - Feriados em cache por 1 hora
6. **Logs estruturados** - console.error com contexto
7. **Respostas padronizadas** - `{ success, message, data?, error? }`

---

## Próximos Passos (Frontend)

1. Criar componentes de importação de extratos (CSV/XLSX/OFX)
2. Interface de conciliação bancária
3. Dashboard de KPIs com os endpoints disponíveis
4. Telas de gestão de custos fixos
5. Calculadora de diaristas com visualização de detalhes
6. Relatórios consolidados com gráficos
