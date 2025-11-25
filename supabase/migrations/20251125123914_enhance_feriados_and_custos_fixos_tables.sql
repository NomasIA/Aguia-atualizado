/*
  # Enhance feriados and custos_fixos tables

  ## Purpose
  This migration ensures the feriados table is complete and enhances the custos_fixos table
  with additional fields for competency-based tracking and payment control.

  ## Table Changes

  ### 1. feriados (already exists - ensure structure)
  Used for business day calculations in Brazilian banking calendar.
  - Existing fields: id, data, nome, tipo, recorrente, observacao
  - No changes needed - table already exists with correct structure

  ### 2. custos_fixos (already exists - add new fields)
  Enhanced for monthly competency tracking and payment control.
  
  **New fields to add**:
  - `competencia` (text) - Format 'YYYY-MM' for monthly tracking
  - `data_vencimento` (date) - Due date for the fixed cost
  - `pago` (boolean, default false) - Payment status flag
  - `data_pagamento` (date, nullable) - Actual payment date
  - `tipo_pagamento` (text) - Payment method
  - `conta_pagamento` (text) - Payment account: 'banco', 'dinheiro', etc.
  - `transacao_id` (uuid, nullable) - FK to transacoes.id for payment tracking

  ## Purpose & Usage
  - `competencia` prevents duplicate monthly entries
  - `data_vencimento` supports payment scheduling
  - `pago` and `data_pagamento` track payment lifecycle
  - `transacao_id` links fixed costs to actual transactions

  ## Security
  - RLS disabled (consistent with existing table)

  ## Notes
  - Uses DO block to safely add columns only if they don't exist
  - Compatible with existing custos_fixos records
*/

-- Enhance custos_fixos table with new fields
DO $$
BEGIN
  -- Add competencia field for monthly tracking (format: 'YYYY-MM')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custos_fixos' AND column_name = 'competencia'
  ) THEN
    ALTER TABLE custos_fixos ADD COLUMN competencia text;
  END IF;

  -- Add data_vencimento field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custos_fixos' AND column_name = 'data_vencimento'
  ) THEN
    ALTER TABLE custos_fixos ADD COLUMN data_vencimento date;
  END IF;

  -- Add pago field (payment status)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custos_fixos' AND column_name = 'pago'
  ) THEN
    ALTER TABLE custos_fixos ADD COLUMN pago boolean DEFAULT false;
  END IF;

  -- Add data_pagamento field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custos_fixos' AND column_name = 'data_pagamento'
  ) THEN
    ALTER TABLE custos_fixos ADD COLUMN data_pagamento date;
  END IF;

  -- Add tipo_pagamento field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custos_fixos' AND column_name = 'tipo_pagamento'
  ) THEN
    ALTER TABLE custos_fixos ADD COLUMN tipo_pagamento text;
  END IF;

  -- Add conta_pagamento field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custos_fixos' AND column_name = 'conta_pagamento'
  ) THEN
    ALTER TABLE custos_fixos ADD COLUMN conta_pagamento text;
  END IF;

  -- Add transacao_id field (FK to transacoes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custos_fixos' AND column_name = 'transacao_id'
  ) THEN
    ALTER TABLE custos_fixos ADD COLUMN transacao_id uuid;
  END IF;
END $$;

-- Add foreign key constraint for transacao_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_custos_fixos_transacao'
  ) THEN
    ALTER TABLE custos_fixos 
      ADD CONSTRAINT fk_custos_fixos_transacao 
      FOREIGN KEY (transacao_id) REFERENCES transacoes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_custos_fixos_competencia 
  ON custos_fixos(competencia);

CREATE INDEX IF NOT EXISTS idx_custos_fixos_data_vencimento 
  ON custos_fixos(data_vencimento);

CREATE INDEX IF NOT EXISTS idx_custos_fixos_pago 
  ON custos_fixos(pago);

-- Add helpful comments
COMMENT ON COLUMN custos_fixos.competencia IS 
  'Monthly tracking format YYYY-MM (e.g., 2025-11). Used to prevent duplicate monthly entries';

COMMENT ON COLUMN custos_fixos.pago IS 
  'Payment status flag. true = paid, false = pending';

COMMENT ON COLUMN custos_fixos.transacao_id IS 
  'Foreign key to transacoes table. Links fixed cost to actual payment transaction';

-- Note: feriados table already exists with correct structure, no changes needed
COMMENT ON TABLE feriados IS 
  'Brazilian holidays calendar for business day calculations. Used by date utility functions';
