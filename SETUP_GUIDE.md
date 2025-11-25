# 🔧 Guia de Configuração Completo

Este guia complementa o COMO_VISUALIZAR.md com foco específico nas variáveis de ambiente e configuração do Supabase.

## 📝 Checklist Rápido

- [ ] Conta Supabase criada
- [ ] Projeto Supabase criado
- [ ] URL e Anon Key copiados
- [ ] Arquivo `.env` criado e configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor rodando (`npm run dev`)
- [ ] Sistema acessível em http://localhost:3000

## 🎯 Configuração das Variáveis de Ambiente

### Passo 1: Criar arquivo .env

```bash
cp .env.example .env
```

### Passo 2: Obter credenciais do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL**
   - **anon public key**

### Passo 3: Configurar .env

Abra `.env` e configure:

```env
# ==============================================
# SUPABASE CONFIGURATION (OBRIGATÓRIO)
# ==============================================

NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================
# FEATURE FLAGS (OPCIONAL)
# ==============================================

# Habilitar conciliação bancária (true/false)
ENABLE_CONCILIACAO=true

# ==============================================
# ADMIN CONFIGURATION (OPCIONAL)
# ==============================================

# Emails com acesso admin (separados por vírgula)
ADMIN_EMAILS=admin@empresa.com
```

### Passo 4: Validar Configuração

```bash
# Reiniciar servidor
npm run dev

# Verificar no console
# ✅ Não deve ter erros de "Invalid environment variables"
# ✅ Sistema deve conectar ao Supabase
```

## 🚨 Mensagens de Erro Comuns

### ❌ "NEXT_PUBLIC_SUPABASE_URL is required"

**Problema:** Variável não definida

**Solução:**
```bash
# 1. Verificar se .env existe
ls -la .env

# 2. Se não existe, criar
cp .env.example .env

# 3. Editar e adicionar URL
nano .env
```

### ❌ "Invalid Supabase URL"

**Problema:** Formato de URL incorreto

**Solução:**
- URL deve começar com `https://`
- Não incluir barra no final
- Exemplo correto: `https://xyzabc.supabase.co`
- Exemplo errado: `xyzabc.supabase.co/`

### ❌ "Failed to connect to Supabase"

**Problema:** Credenciais incorretas

**Solução:**
1. Volte ao Supabase Dashboard
2. Settings → API
3. Copie credenciais novamente
4. Certifique-se de copiar **anon public** (não service_role)
5. Cole no `.env`
6. Reinicie: Ctrl+C e `npm run dev`

## 🔐 Segurança

### ✅ O que é seguro expor

- `NEXT_PUBLIC_SUPABASE_URL` - Público
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Público (respeita RLS)

### ❌ O que NÃO expor

- `SUPABASE_SERVICE_ROLE_KEY` - Admin key (NUNCA usar no frontend)
- `DATABASE_URL` - String de conexão direta

### 🔒 RLS (Row Level Security)

Atualmente RLS está **desabilitado** para uso interno.

Para produção com múltiplos usuários:
1. Habilitar RLS em todas as tabelas
2. Criar policies de acesso
3. Implementar autenticação

Ver [README.md](./README.md#-segurança-e-rls) para mais detalhes.

## 🎛️ Feature Flags

### ENABLE_CONCILIACAO

Controla funcionalidades de conciliação bancária.

**Quando usar `true`:**
- Precisa importar extratos bancários
- Quer conciliar transações automaticamente
- Usa funcionalidades bancárias completas

**Quando usar `false`:**
- Não precisa de conciliação
- Quer interface simplificada
- Fase de testes sem dados bancários

**Como funciona:**

```typescript
// lib/feature-flags.ts
import { env } from './env';

export function isConciliacaoEnabled(): boolean {
  return env.ENABLE_CONCILIACAO;
}

// No componente
import { isConciliacaoEnabled } from '@/lib/feature-flags';

if (isConciliacaoEnabled()) {
  // Mostrar botões de conciliação
}
```

### Adicionar Nova Feature Flag

1. Adicione ao `.env.example`:
```env
ENABLE_MINHA_FEATURE=false
```

2. Atualize validação (`lib/env.ts`):
```typescript
ENABLE_MINHA_FEATURE: z
  .string()
  .optional()
  .default('false')
  .transform((val) => val === 'true'),
```

3. Crie helper (`lib/feature-flags.ts`):
```typescript
export function isMinhaFeatureEnabled(): boolean {
  return env.ENABLE_MINHA_FEATURE;
}
```

## 🔄 Atualizar Configuração

### Mudou variáveis durante desenvolvimento?

```bash
# 1. Parar servidor
Ctrl+C

# 2. Deletar cache do Next.js
rm -rf .next

# 3. Reiniciar
npm run dev
```

### Mudou URL do Supabase?

```bash
# 1. Atualizar .env
nano .env

# 2. Limpar e rebuild
rm -rf .next
npm run build
npm run dev
```

## 📊 Verificar Configuração

### Script de Verificação

Crie `scripts/check-env.js`:

```javascript
const fs = require('fs');

console.log('🔍 Verificando configuração...\n');

// Check .env exists
if (!fs.existsSync('.env')) {
  console.error('❌ Arquivo .env não encontrado');
  console.log('💡 Execute: cp .env.example .env');
  process.exit(1);
}

// Read .env
const env = fs.readFileSync('.env', 'utf8');

// Check required variables
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

let ok = true;
required.forEach(key => {
  if (!env.includes(key + '=')) {
    console.error(`❌ ${key} não configurado`);
    ok = false;
  } else {
    console.log(`✅ ${key} configurado`);
  }
});

if (ok) {
  console.log('\n✅ Configuração válida!');
} else {
  console.log('\n❌ Configure as variáveis faltantes');
  process.exit(1);
}
```

Execute:
```bash
node scripts/check-env.js
```

## 📚 Referências

- [Documentação Completa](./CONFIGURATION.md)
- [Como Visualizar](./COMO_VISUALIZAR.md)
- [README Principal](./README.md)
- [Backend API](./BACKEND_API_DOCUMENTATION.md)

## 🆘 Ainda com Problemas?

1. ✅ Verifique todos os passos deste guia
2. ✅ Consulte [CONFIGURATION.md](./CONFIGURATION.md)
3. ✅ Revise logs no console (F12)
4. ✅ Entre em contato com desenvolvedor

---

**✨ Configuração concluída com sucesso!**
