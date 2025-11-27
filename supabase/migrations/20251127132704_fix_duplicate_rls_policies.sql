/*
  # Fix Duplicate RLS Policies

  ## Security Improvement
  
  Consolidates duplicate permissive policies on tables:
  - bank_accounts: Merge read and write policies into one
  - cash_books: Merge read and write policies into one
  
  This resolves the "Multiple Permissive Policies" warning while maintaining
  the same access level for authenticated users.
*/

-- bank_accounts: merge read and write into one policy
DROP POLICY IF EXISTS allow_authenticated_read_bank_accounts ON public.bank_accounts;
DROP POLICY IF EXISTS allow_authenticated_write_bank_accounts ON public.bank_accounts;

CREATE POLICY "allow_authenticated_bank_accounts"
  ON public.bank_accounts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- cash_books: merge read and write into one policy
DROP POLICY IF EXISTS allow_authenticated_read_cash_books ON public.cash_books;
DROP POLICY IF EXISTS allow_authenticated_write_cash_books ON public.cash_books;

CREATE POLICY "allow_authenticated_cash_books"
  ON public.cash_books
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
