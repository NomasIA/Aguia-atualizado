/*
  # Sincronização Automática: cash_ledger → transacoes
  
  ## Objetivo
  
  Toda entrada/saída adicionada em `cash_ledger` deve aparecer automaticamente em `transacoes` para conciliação bancária.
  
  ## Implementação
  
  1. **Copiar dados existentes**: Migra todos os registros atuais de cash_ledger para transacoes
  2. **Trigger de INSERT**: Quando inserir em cash_ledger, cria automaticamente em transacoes
  3. **Trigger de UPDATE**: Quando atualizar em cash_ledger, atualiza em transacoes
  4. **Trigger de DELETE**: Quando deletar (soft delete) em cash_ledger, marca deleted_at em transacoes
  
  ## Mapeamento de Campos
  
  - cash_ledger.id → transacoes.id (mesmo UUID)
  - cash_ledger.data → transacoes.data
  - cash_ledger.descricao → transacoes.descricao
  - cash_ledger.valor → transacoes.valor
  - cash_ledger.tipo → transacoes.tipo
  - cash_ledger.forma → transacoes.forma_pagamento
  - cash_ledger.categoria → transacoes.categoria
  - cash_ledger.conta_bancaria → transacoes.conta
  - cash_ledger.deleted_at → transacoes.deleted_at
*/

-- Passo 1: Copiar dados existentes de cash_ledger para transacoes
INSERT INTO transacoes (
  id,
  data,
  descricao,
  valor,
  tipo,
  forma_pagamento,
  categoria,
  conta,
  deleted_at,
  created_at,
  updated_at
)
SELECT 
  id,
  data,
  descricao,
  valor,
  tipo,
  forma,
  categoria,
  COALESCE(conta_bancaria, 'Não especificado'),
  deleted_at,
  NOW(),
  NOW()
FROM cash_ledger
ON CONFLICT (id) DO NOTHING;

-- Passo 2: Criar função de sincronização
CREATE OR REPLACE FUNCTION sync_cash_ledger_to_transacoes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Inserir nova transação
    INSERT INTO transacoes (
      id,
      data,
      descricao,
      valor,
      tipo,
      forma_pagamento,
      categoria,
      conta,
      deleted_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.data,
      NEW.descricao,
      NEW.valor,
      NEW.tipo,
      NEW.forma,
      NEW.categoria,
      COALESCE(NEW.conta_bancaria, 'Não especificado'),
      NEW.deleted_at,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Atualizar transação existente
    UPDATE transacoes SET
      data = NEW.data,
      descricao = NEW.descricao,
      valor = NEW.valor,
      tipo = NEW.tipo,
      forma_pagamento = NEW.forma,
      categoria = NEW.categoria,
      conta = COALESCE(NEW.conta_bancaria, 'Não especificado'),
      deleted_at = NEW.deleted_at,
      updated_at = NOW()
    WHERE id = NEW.id;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Soft delete na transação
    UPDATE transacoes SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = OLD.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Passo 3: Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_cash_ledger ON cash_ledger;

CREATE TRIGGER trigger_sync_cash_ledger
AFTER INSERT OR UPDATE OR DELETE ON cash_ledger
FOR EACH ROW
EXECUTE FUNCTION sync_cash_ledger_to_transacoes();

COMMENT ON FUNCTION sync_cash_ledger_to_transacoes IS 'Sincroniza automaticamente cash_ledger → transacoes para conciliação bancária';
COMMENT ON TRIGGER trigger_sync_cash_ledger ON cash_ledger IS 'Mantém transacoes sincronizada com cash_ledger';
