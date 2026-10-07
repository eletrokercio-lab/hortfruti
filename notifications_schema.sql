-- ============================================================
-- HortiGestão — Tabela de NOTIFICAÇÕES (comprador + operador)
-- Execute este script no SQL Editor do Supabase.
-- Eventos: entrega iniciada (em rota), entrega finalizada,
--          problema na entrega, novo pedido.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  audience TEXT NOT NULL CHECK (audience IN ('operador', 'comprador')),
  customer_id TEXT,
  type TEXT NOT NULL DEFAULT 'delivery',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  action_tab TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_audience_idx ON public.notifications (audience, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_customer_idx ON public.notifications (customer_id);

-- Habilita RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Leitura:
--  - 'operador': staff vê todas
--  - 'comprador': o comprador dono do customer_id vê as suas
--                 (staff também vê, para o modo suporte)
DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (
    (audience = 'operador' AND public.app_is_staff())
    OR (
      audience = 'comprador'
      AND public.app_customer_id() IS NOT NULL
      AND customer_id = public.app_customer_id()
    )
    OR (audience = 'comprador' AND public.app_is_staff())
  );

-- Escrita: qualquer usuário autenticado pode criar notificações
-- (o entregador dispara os avisos ao iniciar/finalizar entrega)
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Marcar como lida: dono da notificação ou staff
DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (
    public.app_is_staff()
    OR (
      audience = 'comprador'
      AND public.app_customer_id() IS NOT NULL
      AND customer_id = public.app_customer_id()
    )
  )
  WITH CHECK (TRUE);
