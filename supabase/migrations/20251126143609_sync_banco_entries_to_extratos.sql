/*
  # Sincronização Automática: cash_ledger (BANCO) → extratos_importados
  
  ## Objetivo
  
  Quando uma entrada/saída de BANCO for cadastrada em cash_ledger, ela deve aparecer 
  automaticamente em extratos_importados para conciliação bancária.
  
  IMPORTANTE: Apenas entradas com forma = 'banco' vão para extratos. Caixa não entra!
  
  ## Implementação
  
  1. **Migração Inicial**: Copia todos os registros BANCO existentes de cash_ledger para extratos_importados
  2. **Trigger INSERT**: Quando inserir entrada BANCO em cash_ledger → cria em extratos_importados
  3. **Trigger UPDATE**: Quando atualizar entrada BANCO em cash_ledger → atualiza em extratos_importados
  4. **Trigger DELETE**: Quando deletar entrada BANCO em cash_ledger → marca deleted_at em extratos_importados
  
  ## Mapeamento de Campos
  
  - cash_ledger.id → extratos_importados.id (mesmo UUID)
  - cash_ledger.conta_bancaria → extratos_importados.conta_id
  - cash_ledger.data → extratos_importados.data
  - cash_ledger.descricao → extratos_importados.historico
  - cash_ledger.valor → extratos_importados.valor (saída = negativo)
  - 'sistema' → extratos_importados.source
  - cash_ledger.deleted_at → extratos_importados.deleted_at
*/

-- Passo 1: Limpar e copiar dados BANCO existentes
DELETE FROM extratos_importados WHERE source = 'sistema';

INSERT INTO extratos_importados (
  id,
  conta_id,
  data,
  historico,
  valor,
  saldo,
  hash_unico,
  source,
  deleted_at,
  created_at,
  updated_at
)
SELECT 
  id,
  COALESCE(conta_bancaria, 'Banco Geral'),
  data,
  descricao,
  CASE 
    WHEN tipo = 'entrada' THEN valor
    WHEN tipo = 'saida' THEN -valor
  END,
  NULL, -- saldo será NULL
  MD5(id::text || data::text || descricao || valor::text),
  'sistema',
  deleted_at,
  created_at,
  updated_at
FROM cash_ledger
WHERE forma = 'banco'; -- APENAS BANCO!

-- Passo 2: Criar função de sincronização
CREATE OR REPLACE FUNCTION sync_banco_to_extratos()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas processar se for BANCO
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.forma != 'banco' THEN
    -- Se mudou de banco para caixa, deletar do extrato
    IF TG_OP = 'UPDATE' AND OLD.forma = 'banco' THEN
      DELETE FROM extratos_importados WHERE id = OLD.id AND source = 'sistema';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Inserir novo extrato (apenas se BANCO)
    INSERT INTO extratos_importados (
      id,
      conta_id,
      data,
      historico,
      valor,
      saldo,
      hash_unico,
      source,
      deleted_at,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.conta_bancaria, 'Banco Geral'),
      NEW.data,
      NEW.descricao,
      CASE 
        WHEN NEW.tipo = 'entrada' THEN NEW.valor
        WHEN NEW.tipo = 'saida' THEN -NEW.valor
      END,
      NULL,
      MD5(NEW.id::text || NEW.data::text || NEW.descricao || NEW.valor::text),
      'sistema',
      NEW.deleted_at,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Atualizar extrato existente
    UPDATE extratos_importados SET
      conta_id = COALESCE(NEW.conta_bancaria, 'Banco Geral'),
      data = NEW.data,
      historico = NEW.descricao,
      valor = CASE 
        WHEN NEW.tipo = 'entrada' THEN NEW.valor
        WHEN NEW.tipo = 'saida' THEN -NEW.valor
      END,
      hash_unico = MD5(NEW.id::text || NEW.data::text || NEW.descricao || NEW.valor::text),
      deleted_at = NEW.deleted_at,
      updated_at = NOW()
    WHERE id = NEW.id AND source = 'sistema';
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Soft delete no extrato
    UPDATE extratos_importados SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE id = OLD.id AND source = 'sistema';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Passo 3: Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_banco_to_extratos ON cash_ledger;

CREATE TRIGGER trigger_sync_banco_to_extratos
AFTER INSERT OR UPDATE OR DELETE ON cash_ledger
FOR EACH ROW
EXECUTE FUNCTION sync_banco_to_extratos();

COMMENT ON FUNCTION sync_banco_to_extratos IS 'Sincroniza automaticamente entradas/saídas de BANCO de cash_ledger → extratos_importados';
COMMENT ON TRIGGER trigger_sync_banco_to_extratos ON cash_ledger IS 'Mantém extratos_importados sincronizado com cash_ledger (apenas BANCO)';
