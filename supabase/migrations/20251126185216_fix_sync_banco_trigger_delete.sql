/*
  # Corrigir Trigger de Sincronização: cash_ledger → extratos_importados
  
  ## Problema
  
  Quando uma transação é excluída (soft delete com UPDATE deleted_at) em cash_ledger,
  o trigger não estava marcando o extrato correspondente como deletado.
  
  ## Solução
  
  Recriar a função sync_banco_to_extratos() com lógica corrigida para:
  - Detectar quando deleted_at muda de NULL para NOT NULL (exclusão)
  - Garantir que o extrato seja marcado como deletado também
  
  ## Mudanças
  
  1. Melhorar detecção de soft delete no UPDATE
  2. Garantir propagação do deleted_at
*/

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
    ON CONFLICT (id) DO UPDATE SET
      conta_id = EXCLUDED.conta_id,
      data = EXCLUDED.data,
      historico = EXCLUDED.historico,
      valor = EXCLUDED.valor,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = NOW();
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar se existe o extrato primeiro
    IF EXISTS (SELECT 1 FROM extratos_importados WHERE id = NEW.id AND source = 'sistema') THEN
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
    ELSE
      -- Se não existe, criar (caso tenha sido inserido antes do trigger)
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
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Hard delete no extrato (caso raro, normalmente usamos soft delete)
    DELETE FROM extratos_importados 
    WHERE id = OLD.id AND source = 'sistema';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_banco_to_extratos IS 'Sincroniza automaticamente entradas/saídas de BANCO de cash_ledger → extratos_importados (com soft delete)';
