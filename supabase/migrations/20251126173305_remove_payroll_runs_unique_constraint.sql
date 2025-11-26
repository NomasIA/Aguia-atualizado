/*
  # Remover restrição de pagamento único

  Esta migration remove a constraint única que impedia múltiplos pagamentos
  do mesmo tipo na mesma competência. Agora é possível processar o mesmo
  tipo de pagamento várias vezes no mesmo mês com datas diferentes.

  ## Alterações
  - Remove a constraint UNIQUE (competencia, tipo, deleted_at) da tabela payroll_runs
  - Permite múltiplos pagamentos duplicados conforme solicitado pelo usuário
*/

-- Remover a constraint única que bloqueia pagamentos duplicados
ALTER TABLE payroll_runs 
DROP CONSTRAINT IF EXISTS payroll_runs_competencia_tipo_deleted_at_key;
