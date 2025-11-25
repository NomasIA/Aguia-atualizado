# Guia de Configuração do Sistema

Este documento detalha todas as configurações disponíveis no sistema.

## 📋 Índice

- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Cliente Supabase](#cliente-supabase)
- [Feature Flags](#feature-flags)
- [Validação de Configuração](#validação-de-configuração)
- [Solução de Problemas](#solução-de-problemas)

---

## Variáveis de Ambiente

### Estrutura de Arquivos

```
project/
├── .env                 # Suas configurações (não versionado)
├── .env.example         # Template com documentação
└── lib/
    ├── env.ts          # Validação e tipagem com Zod
    └── supabase.ts     # Cliente Supabase
```

### Variáveis Disponíveis

#### 1. `NEXT_PUBLIC_SUPABASE_URL` (obrigatória)

**Descrição:** URL do seu projeto Supabase.

**Formato:** `https://[project-id].supabase.co`

**Como obter:**
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie **Project URL**

**Exemplo:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzabcdef.supabase.co
```

**Importante:**
- Prefixo `NEXT_PUBLIC_` torna a variável acessível no cliente
- Não confundir com `SUPABASE_SERVICE_ROLE_KEY` (não usar no frontend)

---

#### 2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` (obrigatória)

**Descrição:** Chave anônima/pública do Supabase.

**Formato:** JWT token (string longa)

**Como obter:**
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie **anon public** key

**Exemplo:**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

**Importante:**
- Seguro para expor no cliente
- Respeita Row Level Security (RLS)
- Não permite operações administrativas

---

#### 3. `ENABLE_CONCILIACAO` (opcional)

**Descrição:** Controla disponibilidade de funcionalidades de conciliação bancária.

**Valores:** `true` | `false`

**Padrão:** `true`

**Quando usar `false`:**
- Fase de testes sem dados bancários reais
- Cliente não precisa de conciliação
- Deseja simplificar interface

**Efeitos quando `false`:**
- ❌ Tela de conciliação exibe mensagem de desabilitada
- ❌ Endpoints `/api/extratos` e `/api/conciliacao` retornam erro
- ✅ Demais funcionalidades continuam normais

**Exemplo:**
```env
ENABLE_CONCILIACAO=true
```

**Verificação no código:**
```typescript
import { isConciliacaoEnabled } from '@/lib/feature-flags';

if (isConciliacaoEnabled()) {
  // Mostrar botões de conciliação
}
```

---

#### 4. `ADMIN_EMAILS` (opcional)

**Descrição:** Lista de emails com privilégios administrativos.

**Formato:** Emails separados por vírgula

**Padrão:** String vazia

**Exemplo:**
```env
ADMIN_EMAILS=admin@empresa.com,gerente@empresa.com,financeiro@empresa.com
```

**Uso no código:**
```typescript
import { isAdminEmail } from '@/lib/env';

if (isAdminEmail(user.email)) {
  // Permitir ações administrativas
}
```

---

## Cliente Supabase

### Configuração Centralizada

Todo o sistema usa um único cliente Supabase definido em `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
```

### Uso em Componentes

```typescript
// Client Components
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('table_name')
  .select('*');
```

### Uso em API Routes

```typescript
// app/api/route.ts
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data } = await supabase
    .from('table_name')
    .select('*');

  return Response.json(data);
}
```

---

## Feature Flags

### Sistema de Feature Flags

O projeto usa feature flags para controlar funcionalidades opcionais.

**Arquivo:** `lib/feature-flags.ts`

```typescript
import { env } from './env';

export function isConciliacaoEnabled(): boolean {
  return env.ENABLE_CONCILIACAO;
}
```

### Adicionar Nova Feature Flag

1. **Adicionar ao .env.example:**
```env
ENABLE_NOVA_FUNCIONALIDADE=true
```

2. **Adicionar ao schema de validação (lib/env.ts):**
```typescript
const envSchema = z.object({
  // ... outras variáveis
  ENABLE_NOVA_FUNCIONALIDADE: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});
```

3. **Criar função helper (lib/feature-flags.ts):**
```typescript
export function isNovaFuncionalidadeEnabled(): boolean {
  return env.ENABLE_NOVA_FUNCIONALIDADE;
}
```

4. **Usar no componente:**
```typescript
import { isNovaFuncionalidadeEnabled } from '@/lib/feature-flags';

if (isNovaFuncionalidadeEnabled()) {
  // Renderizar funcionalidade
}
```

---

## Validação de Configuração

### Como Funciona

O sistema valida todas as variáveis de ambiente na inicialização usando **Zod**.

**Arquivo:** `lib/env.ts`

### Validações Aplicadas

1. **Presença de obrigatórias:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Formato correto:**
   - URLs devem ser válidas
   - Strings não podem estar vazias

3. **Transformações:**
   - `ENABLE_CONCILIACAO` string → boolean
   - `ADMIN_EMAILS` string → array

### Mensagens de Erro

Se configuração inválida:

```bash
❌ Invalid environment variables: {
  NEXT_PUBLIC_SUPABASE_URL: ['Required'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ['String must contain at least 1 character']
}
Error: Invalid environment variables
```

---

## Solução de Problemas

### Erro: "NEXT_PUBLIC_SUPABASE_URL is required"

**Causa:** Variável não definida no `.env`

**Solução:**
1. Verifique se existe arquivo `.env` na raiz
2. Copie de `.env.example` se necessário
3. Adicione a URL do Supabase

```bash
cp .env.example .env
# Edite .env e adicione suas credenciais
```

---

### Erro: "Failed to connect to Supabase"

**Causa:** URL ou KEY incorretos

**Solução:**
1. Verifique URL: deve começar com `https://`
2. Verifique KEY: deve ser a `anon public` key, não `service_role`
3. Teste conexão no Supabase Dashboard

---

### Conciliação não aparece

**Causa:** `ENABLE_CONCILIACAO=false`

**Solução:**
1. Abra `.env`
2. Altere para `ENABLE_CONCILIACAO=true`
3. Reinicie o servidor (`npm run dev`)

```env
ENABLE_CONCILIACAO=true
```

---

### Variáveis não atualizando

**Causa:** Next.js cacheia variáveis de ambiente

**Solução:**
1. Pare o servidor (Ctrl+C)
2. Delete pasta `.next`
3. Reinicie

```bash
rm -rf .next
npm run dev
```

---

### Build falha com erro de env

**Causa:** Variáveis não disponíveis em build time

**Solução:**
1. Variáveis do cliente precisam do prefixo `NEXT_PUBLIC_`
2. Variáveis server-only não devem ser usadas no client
3. Verifique arquivo `.env` antes de buildar

```bash
# Verificar variáveis
cat .env

# Build com debug
npm run build -- --debug
```

---

## Checklist de Configuração

### Configuração Inicial

- [ ] Copiar `.env.example` para `.env`
- [ ] Obter URL do Supabase Dashboard
- [ ] Obter Anon Key do Supabase Dashboard
- [ ] Configurar `ENABLE_CONCILIACAO` conforme necessidade
- [ ] Adicionar emails admin (opcional)
- [ ] Testar conexão com Supabase
- [ ] Verificar build sem erros

### Verificação de Funcionamento

```bash
# 1. Instalar dependências
npm install

# 2. Verificar configuração
cat .env

# 3. Testar desenvolvimento
npm run dev

# 4. Testar build
npm run build

# 5. Verificar logs
# Não deve haver erros de env
```

---

## Suporte

Para problemas de configuração:
1. Verifique este documento
2. Revise `.env.example`
3. Consulte logs do console
4. Contate o desenvolvedor

---

## Referências

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Zod Documentation](https://zod.dev/)
