/*
  # Remover índice único que impede pagamentos duplicados

  O índice idx_payroll_runs_unique estava impedindo múltiplos pagamentos
  do mesmo tipo na mesma competência. Esta migration remove completamente
  esse índice para permitir pagamentos ilimitados.

  ## Alterações
  - Remove o índice UNIQUE idx_payroll_runs_unique
  - Permite múltiplos pagamentos do mesmo tipo na mesma competência
*/

-- Remover o índice único que bloqueia pagamentos duplicados
DROP INDEX IF EXISTS idx_payroll_runs_unique;
