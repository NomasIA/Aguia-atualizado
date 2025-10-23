/*
  # Add Soft Delete Support

  1. Changes
    - Add `deleted_at` column to `cash_ledger` table for soft delete of transactions (Entradas & Saídas)
    - Add `deleted_at` column to `bank_transactions` table for soft delete of bank statement items (Conciliação)
    
  2. Security
    - No RLS changes needed - existing policies will continue to work
    
  3. Notes
    - Uses `IF NOT EXISTS` to prevent errors if columns already exist
    - All columns are nullable timestamptz for tracking deletion time
    - Queries should filter `WHERE deleted_at IS NULL` to exclude deleted records
*/

-- Add deleted_at to cash_ledger (Entradas & Saídas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cash_ledger' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE cash_ledger ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Add deleted_at to bank_transactions (Conciliação - extrato bancário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bank_transactions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE bank_transactions ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create indexes for better query performance on deleted records
CREATE INDEX IF NOT EXISTS idx_cash_ledger_deleted_at ON cash_ledger(deleted_at);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_deleted_at ON bank_transactions(deleted_at);