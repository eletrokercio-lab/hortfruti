-- ============================================================
-- G. Less Hortifruti — Correção "Entregue" não chega ao comprador
--
-- Problema 1: RLS bloqueava o entregador ao atualizar a tabela orders,
--             então o status "entregue" nunca era gravado no banco.
-- Problema 2: Baixa automática do PIX na entrega falhava em silêncio
--             (entregador sem permissão em accounts_receivable/cash_movements).
--
-- Rodar no SQL Editor do Supabase (uma única vez).
-- ============================================================

-- 1) Entregador pode atualizar SOMENTE pedidos vinculados a uma entrega dele
CREATE POLICY orders_driver_complete_own ON public.orders
  FOR UPDATE USING (
    public.app_role() = 'entregador'
    AND public.app_is_active()
    AND EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.order_id = orders.id
        AND (
          d.assigned_driver_id = auth.uid()
          OR d.driver_name = (SELECT driver_name FROM public.app_profiles WHERE id = auth.uid())
        )
    )
  )
  WITH CHECK (true);

-- 2) Baixa do recebível na finalização da entrega (PIX)
--    Segura: SECURITY DEFINER valida no servidor quem pode baixar
--    (entregador da própria entrega, ou master/operador).
CREATE OR REPLACE FUNCTION public.fn_baixar_recebivel_entrega(
  p_order_id text,
  p_amount numeric,
  p_method text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := public.app_role();
  v_rec public.accounts_receivable%ROWTYPE;
  v_allowed boolean := false;
BEGIN
  IF v_role = 'entregador' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.order_id = p_order_id
        AND (
          d.assigned_driver_id = v_uid
          OR d.driver_name = (SELECT driver_name FROM public.app_profiles WHERE id = v_uid)
        )
    ) INTO v_allowed;
  ELSIF v_role IN ('master', 'operador') THEN
    v_allowed := true;
  END IF;

  IF v_allowed IS NOT TRUE THEN
    RAISE EXCEPTION 'Sem permissao para baixar recebivel desta entrega';
  END IF;

  SELECT * INTO v_rec FROM public.accounts_receivable
  WHERE order_id = p_order_id
    AND status IN ('aberto', 'parcial', 'vencido')
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN; -- nao ha recebivel em aberto para este pedido
  END IF;

  UPDATE public.accounts_receivable
  SET status = 'pago',
      paid_amount = v_rec.amount,
      paid_date = CURRENT_DATE,
      payment_method = p_method
  WHERE id = v_rec.id;

  INSERT INTO public.cash_movements (id, date, type, category, description, amount, reference_id)
  VALUES (
    'mov-' || extract(epoch from now())::bigint || '-' || floor(random() * 100000)::text,
    CURRENT_DATE,
    'entrada',
    'recebimento_venda',
    'Recebimento ' || v_rec.customer_name || ' (' || v_rec.order_number || ') - baixa na entrega',
    v_rec.amount,
    v_rec.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_baixar_recebivel_entrega(text, numeric, text) TO authenticated;
