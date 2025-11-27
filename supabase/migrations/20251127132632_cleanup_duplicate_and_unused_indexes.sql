/*
  # Cleanup Duplicate and Unused Indexes

  ## Performance Optimization
  
  ### 1. Remove Duplicate Indexes
  Removes duplicate indexes that cover the same columns:
  - cash_ledger: Keep idx_ledger_conciliado, drop idx_cash_ledger_conciliado
  - cash_ledger: Keep idx_ledger_deleted, drop idx_cash_ledger_deleted_at

  ### 2. Remove Unused Indexes
  Removes indexes that have not been used to reduce storage and write overhead.
  This improves INSERT/UPDATE performance and reduces disk space usage.
*/

-- Remove duplicate indexes
DROP INDEX IF EXISTS public.idx_cash_ledger_conciliado;
DROP INDEX IF EXISTS public.idx_cash_ledger_deleted_at;

-- Remove unused indexes
DROP INDEX IF EXISTS public.idx_locacoes_deleted;
DROP INDEX IF EXISTS public.idx_diarista_lancamentos_deleted;
DROP INDEX IF EXISTS public.idx_custos_fixos_deleted;
DROP INDEX IF EXISTS public.idx_bank_transactions_deleted_at;
DROP INDEX IF EXISTS public.idx_custos_fixos_competencia;
DROP INDEX IF EXISTS public.idx_custos_fixos_data_vencimento;
DROP INDEX IF EXISTS public.idx_custos_fixos_pago;
DROP INDEX IF EXISTS public.idx_diaristas_valor_diaria_semana;
DROP INDEX IF EXISTS public.idx_mensalistas_vale_refeicao;
DROP INDEX IF EXISTS public.idx_receitas_parcelas_receita;
DROP INDEX IF EXISTS public.idx_receitas_parcelas_deleted;
DROP INDEX IF EXISTS public.idx_mensalista_pagamentos_funcionario;
DROP INDEX IF EXISTS public.idx_mensalista_pagamentos_mes;
DROP INDEX IF EXISTS public.idx_extratos_data_valor;
DROP INDEX IF EXISTS public.idx_cash_ledger_bank_transaction;
DROP INDEX IF EXISTS public.idx_ledger_tipo;
DROP INDEX IF EXISTS public.idx_ledger_origem;
DROP INDEX IF EXISTS public.idx_ledger_deleted;
DROP INDEX IF EXISTS public.idx_payroll_runs_competencia;
DROP INDEX IF EXISTS public.idx_payroll_runs_tipo;
DROP INDEX IF EXISTS public.idx_payroll_runs_status;
DROP INDEX IF EXISTS public.idx_contratos_maquina;
DROP INDEX IF EXISTS public.idx_contratos_status;
DROP INDEX IF EXISTS public.idx_pagamentos_semana;
DROP INDEX IF EXISTS public.idx_cash_ledger_tipo;
DROP INDEX IF EXISTS public.idx_cash_ledger_origem;
DROP INDEX IF EXISTS public.idx_cash_ledger_categoria;
DROP INDEX IF EXISTS public.idx_locacoes_contratos_maquina;
DROP INDEX IF EXISTS public.idx_locacoes_contratos_obra;
DROP INDEX IF EXISTS public.idx_locacoes_contratos_status;
DROP INDEX IF EXISTS public.idx_locacoes_contratos_deleted;
DROP INDEX IF EXISTS public.idx_folha_pagamentos_funcionario;
DROP INDEX IF EXISTS public.idx_folha_pagamentos_competencia;
DROP INDEX IF EXISTS public.idx_folha_pagamentos_tipo;
DROP INDEX IF EXISTS public.idx_folha_pagamentos_deleted;
DROP INDEX IF EXISTS public.idx_mensalista_pagamentos_mensalista;
DROP INDEX IF EXISTS public.idx_mensalista_pagamentos_competencia;
DROP INDEX IF EXISTS public.idx_mensalista_pagamentos_tipo;
DROP INDEX IF EXISTS public.idx_mensalista_pagamentos_deleted;
DROP INDEX IF EXISTS public.idx_receitas_contrato;
DROP INDEX IF EXISTS public.idx_receitas_parcelas_contrato;
DROP INDEX IF EXISTS public.idx_parcelas_pagamento;
DROP INDEX IF EXISTS public.idx_parcelas_decimo;
DROP INDEX IF EXISTS public.idx_ledger_conta;
DROP INDEX IF EXISTS public.idx_audit_ref;
DROP INDEX IF EXISTS public.idx_audit_data;
