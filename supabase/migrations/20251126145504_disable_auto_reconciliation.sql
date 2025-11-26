/*
  # Desabilitar Auto-Conciliação
  
  ## Objetivo
  
  O usuário quer conciliar MANUALMENTE. Atualmente, quando uma entrada/saída de BANCO
  é criada em cash_ledger, ela vai para extratos_importados com o MESMO ID.
  
  Isso pode causar uma "conciliação automática" implícita.
  
  ## Solução
  
  Modificar o trigger para gerar um NOVO UUID para extratos_importados,
  em vez de usar o mesmo ID do cash_ledger. Assim:
  
  - cash_ledger.id = UUID-A
  - extratos_importados.id = UUID-B (diferente!)
  - Usuário precisa vincular manualmente UUID-B com UUID-A via conciliação
  
  ## Mudanças
  
  1. Limpar extratos existentes do sistema
  2. Recriar função de sincronização com gen_random_uuid()
  3. Não copiar deleted_at automaticamente
*/

-- Passo 1: Limpar extratos criados automaticamente
DELETE FROM extratos_importados WHERE source = 'sistema';

-- Passo 2: Recriar função de sincronização SEM manter o mesmo ID
CREATE OR REPLACE FUNCTION sync_banco_to_extratos()
RETURNS TRIGGER AS $$
DECLARE
  v_extrato_id UUID;
BEGIN
  -- Apenas processar se for BANCO
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.forma != 'banco' THEN
    -- Se mudou de banco para caixa, deletar extratos vinculados
    IF TG_OP = 'UPDATE' AND OLD.forma = 'banco' THEN
      DELETE FROM extratos_importados 
      WHERE source = 'sistema' 
      AND historico LIKE '%' || OLD.descricao || '%'
      AND ABS(valor - CASE WHEN OLD.tipo = 'entrada' THEN OLD.valor ELSE -OLD.valor END) < 0.01;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Inserir novo extrato com NOVO UUID (não usar o mesmo ID!)
    INSERT INTO extratos_importados (
      id, -- gen_random_uuid() será usado automaticamente
      conta_id,
      data,
      historico,
      valor,
      saldo,
      hash_unico,
      source,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(), -- NOVO UUID - NÃO usa NEW.id!
      COALESCE(NEW.conta_bancaria, 'Banco Geral'),
      NEW.data,
      NEW.descricao || ' [Origem: ' || NEW.id || ']', -- Adiciona referência mas não vincula
      CASE 
        WHEN NEW.tipo = 'entrada' THEN NEW.valor
        WHEN NEW.tipo = 'saida' THEN -NEW.valor
      END,
      NULL,
      MD5(NEW.id::text || NEW.data::text || NEW.descricao || NEW.valor::text || NOW()::text),
      'sistema',
      NOW(),
      NOW()
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Para UPDATE, procurar extrato relacionado pela descrição e valor
    -- e atualizar (se não estiver conciliado)
    UPDATE extratos_importados SET
      conta_id = COALESCE(NEW.conta_bancaria, 'Banco Geral'),
      data = NEW.data,
      historico = NEW.descricao || ' [Origem: ' || NEW.id || ']',
      valor = CASE 
        WHEN NEW.tipo = 'entrada' THEN NEW.valor
        WHEN NEW.tipo = 'saida' THEN -NEW.valor
      END,
      updated_at = NOW()
    WHERE source = 'sistema'
    AND historico LIKE '%[Origem: ' || NEW.id || ']%'
    AND conciliado_com_transacao_id IS NULL; -- Só atualiza se NÃO conciliado
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Soft delete apenas em extratos NÃO conciliados
    UPDATE extratos_importados SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE source = 'sistema'
    AND historico LIKE '%[Origem: ' || OLD.id || ']%'
    AND conciliado_com_transacao_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_banco_to_extratos IS 'Sincroniza BANCO → extratos_importados SEM auto-conciliar (gera novos UUIDs)';
