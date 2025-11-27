/*
  # Optimize RLS Policies for Auth Functions

  ## Performance Improvements
  
  Optimizes RLS policies to avoid re-evaluating auth functions for each row.
  Wraps the entire auth check in a subquery for better query performance at scale.
  
  Tables affected:
  - receitas_parcelas
  - mensalista_pagamentos
  - locacoes_contratos
  - folha_pagamentos
  
  See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
*/

-- receitas_parcelas
DROP POLICY IF EXISTS admins_access_receitas_parcelas ON public.receitas_parcelas;

CREATE POLICY "admins_access_receitas_parcelas"
  ON public.receitas_parcelas
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  )
  WITH CHECK (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  );

-- mensalista_pagamentos
DROP POLICY IF EXISTS admins_access_mensalista_pagamentos ON public.mensalista_pagamentos;

CREATE POLICY "admins_access_mensalista_pagamentos"
  ON public.mensalista_pagamentos
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  )
  WITH CHECK (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  );

-- locacoes_contratos
DROP POLICY IF EXISTS admins_access_locacoes_contratos ON public.locacoes_contratos;

CREATE POLICY "admins_access_locacoes_contratos"
  ON public.locacoes_contratos
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  )
  WITH CHECK (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  );

-- folha_pagamentos
DROP POLICY IF EXISTS admins_access_folha_pagamentos ON public.folha_pagamentos;

CREATE POLICY "admins_access_folha_pagamentos"
  ON public.folha_pagamentos
  FOR ALL
  TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  )
  WITH CHECK (
    (SELECT auth.jwt() ->> 'email') IN (SELECT email FROM public.app_admins)
  );
