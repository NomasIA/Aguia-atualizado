/*
  # Atualização automática de saldos (incluindo negativos)

  Esta migration cria um trigger que atualiza automaticamente os saldos
  de banco e caixa sempre que houver mudanças no cash_ledger.
  
  ## Funcionalidades
  - Atualiza saldo_atual em bank_accounts e cash_books automaticamente
  - Permite saldos negativos (não há restrições)
  - Funciona com INSERT, UPDATE e DELETE (soft delete)
  - Recalcula baseado em todas as transações ativas (deleted_at IS NULL)
  
  ## Comportamento
  - Banco: Soma todas as transações onde forma = 'banco'
  - Caixa: Soma todas as transações onde forma = 'dinheiro'
  - Entradas somam positivo, saídas somam negativo
*/

-- Função que atualiza os saldos automaticamente
CREATE OR REPLACE FUNCTION auto_update_saldos_on_ledger_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar saldo do banco
  UPDATE bank_accounts
  SET saldo_atual = (
    SELECT COALESCE(
      SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 
      0
    )
    FROM cash_ledger
    WHERE forma = 'banco' 
      AND deleted_at IS NULL
  )
  WHERE nome = 'Itaú – Conta Principal';

  -- Atualizar saldo do caixa
  UPDATE cash_books
  SET saldo_atual = (
    SELECT COALESCE(
      SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 
      0
    )
    FROM cash_ledger
    WHERE forma = 'dinheiro' 
      AND deleted_at IS NULL
  )
  WHERE nome = 'Caixa Dinheiro (Físico)';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_auto_update_saldos ON cash_ledger;

-- Criar trigger que dispara em INSERT, UPDATE e DELETE
CREATE TRIGGER trigger_auto_update_saldos
AFTER INSERT OR UPDATE OR DELETE ON cash_ledger
FOR EACH STATEMENT
EXECUTE FUNCTION auto_update_saldos_on_ledger_change();

COMMENT ON FUNCTION auto_update_saldos_on_ledger_change IS 'Atualiza automaticamente os saldos de banco e caixa (incluindo negativos) quando cash_ledger muda';
COMMENT ON TRIGGER trigger_auto_update_saldos ON cash_ledger IS 'Mantém saldos sincronizados com o ledger automaticamente';
