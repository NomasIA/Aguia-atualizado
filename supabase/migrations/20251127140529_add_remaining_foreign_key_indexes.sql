/*
  # Add Remaining Foreign Key Indexes

  ## Performance Improvements
  
  Adds indexes on foreign key columns that were missed in the previous migration:
  - cash_ledger (bank_transaction_id)
  - contratos_locacao (maquina_id)
  - locacoes_contratos (maquina_id, obra_id)
  - receitas (contrato_id)
  - receitas_parcelas (contrato_id)
*/

-- cash_ledger
CREATE INDEX IF NOT EXISTS idx_cash_ledger_bank_transaction_id 
  ON public.cash_ledger(bank_transaction_id) 
  WHERE bank_transaction_id IS NOT NULL;

-- contratos_locacao
CREATE INDEX IF NOT EXISTS idx_contratos_locacao_maquina_id 
  ON public.contratos_locacao(maquina_id);

-- locacoes_contratos
CREATE INDEX IF NOT EXISTS idx_locacoes_contratos_maquina_id 
  ON public.locacoes_contratos(maquina_id);

CREATE INDEX IF NOT EXISTS idx_locacoes_contratos_obra_id 
  ON public.locacoes_contratos(obra_id);

-- receitas
CREATE INDEX IF NOT EXISTS idx_receitas_contrato_id 
  ON public.receitas(contrato_id) 
  WHERE contrato_id IS NOT NULL;

-- receitas_parcelas
CREATE INDEX IF NOT EXISTS idx_receitas_parcelas_contrato_id 
  ON public.receitas_parcelas(contrato_id) 
  WHERE contrato_id IS NOT NULL;
