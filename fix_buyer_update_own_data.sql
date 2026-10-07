-- ============================================================
-- HortiGestão — Permitir que o comprador salve os PRÓPRIOS
-- dados de entrega (telefone, endereço) no cadastro dele.
-- Execute no SQL Editor do Supabase.
-- ============================================================

DROP POLICY IF EXISTS customers_buyer_update_own ON public.customers;
CREATE POLICY customers_buyer_update_own ON public.customers
  FOR UPDATE USING (id = public.app_customer_id())
  WITH CHECK (id = public.app_customer_id());
