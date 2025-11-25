/*
  # Create transacoes and extratos_importados tables

  ## Purpose
  This migration creates core tables for general financial transactions and imported bank statements,
  supporting KPI reporting, reconciliation, and general financial tracking.

  ## New Tables

  ### 1. transacoes
  Central table for all manual financial transactions (entries and exits).
  - `id` (uuid, primary key)
  - `data` (date) - Transaction date
  - `descricao` (text) - Transaction description
  - `valor` (numeric(14,2)) - Transaction amount
  - `tipo` (text) - Transaction type: 'entrada' (income) or 'saida' (expense)
  - `forma_pagamento` (text) - Payment method
  - `categoria` (text) - Transaction category
  - `conta` (text) - Account type: 'banco', 'dinheiro', etc.
  - `deleted_at` (timestamptz, nullable) - Soft delete timestamp
  
  **Important**: All queries for KPIs, reports, reconciliation must filter WHERE deleted_at IS NULL

  ### 2. extratos_importados
  Table for imported bank statements, supporting automatic reconciliation.
  - `id` (uuid, primary key)
  - `conta_id` (text) - Bank account identifier
  - `data` (date) - Statement transaction date
  - `historico` (text) - Transaction description/history
  - `valor` (numeric(14,2)) - Transaction amount
  - `saldo` (numeric(14,2), nullable) - Account balance after transaction
  - `hash_unico` (text, unique, not null) - Unique hash for deduplication
  - `source` (text) - Import source: 'manual_upload', 'api', etc.
  - `conciliado_com_transacao_id` (uuid, nullable) - FK to transacoes.id when reconciled
  - `deleted_at` (timestamptz, nullable) - Soft delete timestamp

  ## Indexes
  - Unique index on `hash_unico` for preventing duplicate imports
  - Index on (data, valor) for faster reconciliation queries

  ## Security
  - RLS disabled (consistent with existing project tables)

  ## Notes
  - Both tables use soft delete pattern (deleted_at field)
  - Reconciliation and reports must always filter deleted_at IS NULL
  - hash_unico prevents duplicate statement imports
*/

-- Create transacoes table
CREATE TABLE IF NOT EXISTS transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  forma_pagamento text,
  categoria text,
  conta text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create extratos_importados table
CREATE TABLE IF NOT EXISTS extratos_importados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id text NOT NULL,
  data date NOT NULL,
  historico text NOT NULL,
  valor numeric(14,2) NOT NULL,
  saldo numeric(14,2),
  hash_unico text NOT NULL,
  source text NOT NULL DEFAULT 'manual_upload',
  conciliado_com_transacao_id uuid,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT fk_extrato_transacao FOREIGN KEY (conciliado_com_transacao_id) 
    REFERENCES transacoes(id) ON DELETE SET NULL
);

-- Create unique index on hash_unico for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_extratos_hash_unico 
  ON extratos_importados(hash_unico);

-- Create index on (data, valor) for reconciliation performance
CREATE INDEX IF NOT EXISTS idx_extratos_data_valor 
  ON extratos_importados(data, valor);

-- Create index on deleted_at for soft delete queries
CREATE INDEX IF NOT EXISTS idx_transacoes_deleted_at 
  ON transacoes(deleted_at);

CREATE INDEX IF NOT EXISTS idx_extratos_deleted_at 
  ON extratos_importados(deleted_at);

-- Disable RLS (consistent with project pattern)
ALTER TABLE transacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE extratos_importados DISABLE ROW LEVEL SECURITY;

-- Add comment explaining soft delete behavior
COMMENT ON COLUMN transacoes.deleted_at IS 
  'Soft delete timestamp. All queries for KPIs, reports, and reconciliation must filter WHERE deleted_at IS NULL';

COMMENT ON COLUMN extratos_importados.deleted_at IS 
  'Soft delete timestamp. All queries must filter WHERE deleted_at IS NULL';

COMMENT ON COLUMN extratos_importados.hash_unico IS 
  'Unique hash for deduplication. Used to prevent importing duplicate statement lines';

COMMENT ON COLUMN extratos_importados.source IS 
  'Import source: manual_upload (user uploaded file), api (automatic integration), etc.';
