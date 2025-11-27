/*
  # Enable Row Level Security on All Tables

  ## Security Critical Fix
  
  Enables RLS on all public tables that currently have RLS disabled.
  All these tables already have RLS policies defined, but RLS was not enabled.
  
  This is a critical security fix to ensure data access is properly controlled.
  
  Tables affected: 41 tables
*/

ALTER TABLE public.accounting_export_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caucao_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_locacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custos_fixos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decimo_terceiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decimo_terceiro_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarista_dias_semana ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarista_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarista_pagamentos_semanais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diarista_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diaristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extratos_importados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios_mensalistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locacoes_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalista_faltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalista_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensalista_pagamentos_competencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vt_ajustes ENABLE ROW LEVEL SECURITY;
