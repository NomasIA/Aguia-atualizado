/*
  # Add Anonymous Access to cash_ledger

  1. Changes
    - Add policy to allow anonymous (anon) users to read from cash_ledger
    - This enables the dashboard to load without requiring authentication

  2. Security
    - Only SELECT access is granted to anonymous users
    - All other operations still require authentication
*/

-- Drop policy if exists
DROP POLICY IF EXISTS "allow_anon_read_cash_ledger" ON cash_ledger;

-- Add policy for anonymous users to read cash_ledger
CREATE POLICY "allow_anon_read_cash_ledger"
  ON cash_ledger
  FOR SELECT
  TO anon
  USING (true);
