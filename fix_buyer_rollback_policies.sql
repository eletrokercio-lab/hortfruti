-- ============================================================
-- HortiGestão — Permitir que o comprador REVERTA o próprio
-- pedido pendente (usado no rollback do checkout se algo falhar).
-- Execute no SQL Editor do Supabase.
-- ============================================================

-- Pedido: só o próprio, e só enquanto estiver pendente (ainda não entrou em separação)
CREATE POLICY orders_buyer_delete_own ON public.orders
  FOR DELETE USING (
    public.app_role() = 'comprador' AND status = 'pendente'
    AND customer_id = public.app_customer_id()
  );

-- Itens: só os do próprio pedido pendente
CREATE POLICY order_items_buyer_delete_own ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.status = 'pendente'
        AND o.customer_id = public.app_customer_id()
    )
  );

-- Entrega e conta a receber ligadas ao pedido pendente
CREATE POLICY deliveries_buyer_delete_own ON public.deliveries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.status = 'pendente'
        AND o.customer_id = public.app_customer_id()
    )
  );

CREATE POLICY receivables_buyer_delete_own ON public.accounts_receivable
  FOR DELETE USING (
    public.app_role() = 'comprador' AND status IN ('aberto', 'pendente')
    AND customer_id = public.app_customer_id()
  );
