/*
  # Add Missing Foreign Key Indexes

  ## Performance Improvements
  
  Adds indexes on all foreign key columns to improve JOIN performance and prevent table scans.
  
  Tables affected:
  - bank_transactions (bank_account_id, ledger_id)
  - cash_batch_items (batch_id)
  - cash_batches (bank_account_id, cash_book_id)
  - cash_closings (cash_book_id)
  - cash_ledger (bank_account_id, cash_book_id, diarista_id, funcionario_id, maquina_id, obra_id, receita_id)
  - caucao_movimentos (bank_account_id, cash_book_id, locacao_id)
  - custos_fixos (transacao_id)
  - decimo_terceiro_parcelas (ledger_id)
  - diarista_lancamentos (cash_book_id, diarista_id)
  - diarista_ponto (diarista_id, obra_id)
  - extratos_importados (conciliado_com_transacao_id)
  - folha_pagamentos (bank_account_id, cash_book_id, cash_ledger_id)
  - funcionarios_mensalistas (obra_id)
  - locacoes (maquina_id, obra_id)
  - locacoes_contratos (cash_ledger_id)
  - mensalista_faltas (funcionario_id)
  - mensalista_pagamentos_competencia (ledger_id)
  - payroll_runs (ledger_id)
  - receitas (bank_account_id, cash_book_id, obra_id)
  - vt_ajustes (funcionario_id)
*/

-- bank_transactions
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account_id ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_ledger_id ON public.bank_transactions(ledger_id);

-- cash_batch_items
CREATE INDEX IF NOT EXISTS idx_cash_batch_items_batch_id ON public.cash_batch_items(batch_id);

-- cash_batches
CREATE INDEX IF NOT EXISTS idx_cash_batches_bank_account_id ON public.cash_batches(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_batches_cash_book_id ON public.cash_batches(cash_book_id);

-- cash_closings
CREATE INDEX IF NOT EXISTS idx_cash_closings_cash_book_id ON public.cash_closings(cash_book_id);

-- cash_ledger
CREATE INDEX IF NOT EXISTS idx_cash_ledger_bank_account_id ON public.cash_ledger(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_cash_book_id ON public.cash_ledger(cash_book_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_diarista_id ON public.cash_ledger(diarista_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_funcionario_id ON public.cash_ledger(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_maquina_id ON public.cash_ledger(maquina_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_obra_id ON public.cash_ledger(obra_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_receita_id ON public.cash_ledger(receita_id);

-- caucao_movimentos
CREATE INDEX IF NOT EXISTS idx_caucao_movimentos_bank_account_id ON public.caucao_movimentos(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_caucao_movimentos_cash_book_id ON public.caucao_movimentos(cash_book_id);
CREATE INDEX IF NOT EXISTS idx_caucao_movimentos_locacao_id ON public.caucao_movimentos(locacao_id);

-- custos_fixos
CREATE INDEX IF NOT EXISTS idx_custos_fixos_transacao_id ON public.custos_fixos(transacao_id) WHERE transacao_id IS NOT NULL;

-- decimo_terceiro_parcelas
CREATE INDEX IF NOT EXISTS idx_decimo_terceiro_parcelas_ledger_id ON public.decimo_terceiro_parcelas(ledger_id);

-- diarista_lancamentos
CREATE INDEX IF NOT EXISTS idx_diarista_lancamentos_cash_book_id ON public.diarista_lancamentos(cash_book_id);
CREATE INDEX IF NOT EXISTS idx_diarista_lancamentos_diarista_id ON public.diarista_lancamentos(diarista_id);

-- diarista_ponto
CREATE INDEX IF NOT EXISTS idx_diarista_ponto_diarista_id ON public.diarista_ponto(diarista_id);
CREATE INDEX IF NOT EXISTS idx_diarista_ponto_obra_id ON public.diarista_ponto(obra_id);

-- extratos_importados
CREATE INDEX IF NOT EXISTS idx_extratos_transacao_id ON public.extratos_importados(conciliado_com_transacao_id) WHERE conciliado_com_transacao_id IS NOT NULL;

-- folha_pagamentos
CREATE INDEX IF NOT EXISTS idx_folha_pagamentos_bank_account_id ON public.folha_pagamentos(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_folha_pagamentos_cash_book_id ON public.folha_pagamentos(cash_book_id);
CREATE INDEX IF NOT EXISTS idx_folha_pagamentos_cash_ledger_id ON public.folha_pagamentos(cash_ledger_id);

-- funcionarios_mensalistas
CREATE INDEX IF NOT EXISTS idx_funcionarios_mensalistas_obra_id ON public.funcionarios_mensalistas(obra_id);

-- locacoes
CREATE INDEX IF NOT EXISTS idx_locacoes_maquina_id ON public.locacoes(maquina_id);
CREATE INDEX IF NOT EXISTS idx_locacoes_obra_id ON public.locacoes(obra_id);

-- locacoes_contratos
CREATE INDEX IF NOT EXISTS idx_locacoes_contratos_cash_ledger_id ON public.locacoes_contratos(cash_ledger_id);

-- mensalista_faltas
CREATE INDEX IF NOT EXISTS idx_mensalista_faltas_funcionario_id ON public.mensalista_faltas(funcionario_id);

-- mensalista_pagamentos_competencia
CREATE INDEX IF NOT EXISTS idx_mensalista_pagamentos_competencia_ledger_id ON public.mensalista_pagamentos_competencia(ledger_id);

-- payroll_runs
CREATE INDEX IF NOT EXISTS idx_payroll_runs_ledger_id ON public.payroll_runs(ledger_id);

-- receitas
CREATE INDEX IF NOT EXISTS idx_receitas_bank_account_id ON public.receitas(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_receitas_cash_book_id ON public.receitas(cash_book_id);
CREATE INDEX IF NOT EXISTS idx_receitas_obra_id ON public.receitas(obra_id);

-- vt_ajustes
CREATE INDEX IF NOT EXISTS idx_vt_ajustes_funcionario_id ON public.vt_ajustes(funcionario_id);
