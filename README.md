# Dashboard Águia - Gestão Financeira

Sistema completo de gestão financeira para Águia Construções e Reforma.

## 🚀 Funcionalidades

- **Visão Geral**: Dashboard com KPIs e métricas financeiras em tempo real
- **Entradas & Saídas**: Controle completo de receitas e despesas (Banco e Dinheiro separados)
- **Funcionários**: Gestão de Mensalistas e Diaristas com sistema de ponto
- **Maquinários**: Cadastro de máquinas e gestão de contratos de locação
- **Obras**: Gerenciamento de obras, clientes e receitas
- **Caixa & Banco**: Controle separado de saldos (Itaú e Caixa Físico)
- **Conciliação**: Conciliação bancária automática
- **Custos Fixos**: Registro de despesas fixas mensais
- **Relatórios**: Exportação profissional em Excel com filtros de período
- **Análise**: Gráficos e análises financeiras

## 🛠️ Tecnologias

- **Next.js 13** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Supabase** - Banco de dados PostgreSQL
- **Tailwind CSS** - Estilização
- **Shadcn/ui** - Componentes de UI
- **XLSX** - Exportação de relatórios Excel
- **Date-fns** - Manipulação de datas

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start
```

## 🔒 Segurança e RLS (Row Level Security)

### Ambiente Atual (Interno)

**Este projeto está configurado para uso interno sem RLS ativado.**

- Todas as tabelas têm RLS **desabilitado**
- Acesso via `anon key` do Supabase
- Ideal para ambientes controlados e internos
- Não requer autenticação de usuários

### Para Produção (Recomendado)

Quando colocar em produção com múltiplos usuários:

1. **Reativar RLS em todas as tabelas:**
   ```sql
   ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
   ALTER TABLE funcionarios_mensalistas ENABLE ROW LEVEL SECURITY;
   -- ... para cada tabela
   ```

2. **Criar Policies específicas:**
   ```sql
   -- Exemplo: usuários podem ler apenas seus próprios dados
   CREATE POLICY "Users can read own data"
     ON maquinas FOR SELECT
     TO authenticated
     USING (auth.uid() = user_id);
   ```

3. **Implementar autenticação:**
   - Usar Supabase Auth
   - Criar tela de login
   - Gerenciar sessões de usuário

### Estrutura do Banco

Principais tabelas:
- `maquinas` - Cadastro de máquinas
- `locacoes_contratos` - Contratos de locação
- `funcionarios_mensalistas` - Funcionários mensalistas
- `diaristas` / `diarista_lancamentos` - Diaristas e ponto
- `obras` / `receitas` - Obras e receitas
- `cash_ledger` - Lançamentos financeiros
- `bank_accounts` / `cash_books` - Contas bancárias e caixas

## 📱 Uso

### Cadastrar uma Máquina

1. Acesse **Maquinários** > **Cadastro de Máquinas**
2. Clique em **Nova Máquina**
3. Preencha os campos:
   - Nome da Máquina
   - Custo de Aquisição
   - Quantidade
   - Valor da Diária
4. Clique em **Cadastrar**

### Criar Contrato de Locação

1. Acesse **Maquinários** > **Contratos de Locação**
2. Clique em **Novo Contrato**
3. Selecione:
   - Máquina (mostra valor da diária)
   - Obra
   - Data de início
   - Tempo de locação (dias)
   - Forma de pagamento (Banco ou Dinheiro)
4. O sistema calcula automaticamente o valor total
5. Clique em **Confirmar Contrato**

### Marcar Pagamento Recebido

1. Na lista de contratos, clique em **Recebido**
2. O sistema automaticamente:
   - Registra a entrada em Entradas & Saídas
   - Atualiza o saldo (Banco ou Dinheiro)
   - Atualiza os KPIs da Visão Geral
   - Marca o contrato como "Recebido"

### Exportar Relatórios

1. Acesse **Relatórios**
2. Defina o período (opcional)
3. Clique no botão do relatório desejado:
   - Mensalistas
   - Diaristas
   - Entradas & Saídas (2 abas: Banco e Dinheiro)
   - Máquinas
   - Contratos
   - Financeiro Geral

## 🎨 Design

- **Tema**: Escuro com dourado (#FFD86F)
- **Fonte**: Inter
- **Responsivo**: Desktop e Mobile
- **Componentes**: Shadcn/ui customizados

## 📊 Relatórios Excel

Todos os relatórios são exportados com:
- Cabeçalho dourado profissional
- Colunas ajustadas automaticamente
- Totais e subtotais calculados
- Formato brasileiro (dd/mm/aaaa e R$)
- Pronto para uso imediato

## 🔄 Atualizações em Tempo Real

O sistema atualiza automaticamente:
- KPIs da Visão Geral após cada operação
- Saldos de Banco e Caixa
- Listas e tabelas após inserção/exclusão
- Relatórios refletem dados mais recentes

## 📝 Licença

Projeto privado - Águia Construções e Reforma

## 🆘 Suporte

Para dúvidas ou problemas, entre em contato com o desenvolvedor.
