-- ============================================================
-- HortiGestão — Liberar INSERT de itens de pedido para o comprador
-- Corrige o erro: 'new row violates row-level security policy
-- for table "order_items"' ao finalizar pedido no portal do
-- comprador. Execute no SQL Editor do Supabase.
-- ============================================================

CREATE POLICY order_items_buyer_insert_own ON public.order_items
  FOR INSERT WITH CHECK (
    public.app_role() = 'comprador' AND public.app_is_active()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = public.app_customer_id()
    )
  );
