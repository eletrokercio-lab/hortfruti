-- ============================================================
-- HortiGestão v4 — Autenticação, Perfis e Segurança (RLS)
-- Execute este script COMPLETO no SQL Editor do Supabase.
-- Ele pode ser executado mais de uma vez (é idempotente).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabela de perfis da aplicação
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'comprador'
    CHECK (role IN ('master','operador','entregador','comprador')),
  customer_id TEXT REFERENCES public.customers(id),
  driver_name TEXT,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('ativo','pendente','bloqueado')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2. Trigger: todo novo usuário criado no Auth ganha um perfil
--    (padrão: comprador pendente, aguardando liberação)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_customer_id TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'comprador');

  INSERT INTO public.app_profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    v_role,
    'ativo'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Comprador: cria o cadastro de cliente e vincula automaticamente
  -- (libera catálogo e pedidos com preços base; preços especiais ficam a cargo do operador)
  IF v_role = 'comprador' THEN
    v_customer_id := COALESCE(NEW.raw_user_meta_data->>'customer_id', '');
    IF v_customer_id = '' THEN
      v_customer_id := 'cust-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8));
      INSERT INTO public.customers (id, name, trade_name, document, phone, whatsapp, street, number, neighborhood, city, status, payment_method, payment_term, commercial_condition, notes)
      VALUES (
        v_customer_id,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'company', ''), NEW.email),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), ''),
        '',
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'A informar',
        'S/N',
        'A informar',
        'A informar',
        'active',
        'pix',
        'vista',
        'Auto-cadastro pelo app',
        'Cadastro criado automaticamente no auto-cadastro do comprador.'
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
    UPDATE public.app_profiles SET customer_id = v_customer_id WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 3. Funções auxiliares (usadas nas políticas de RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.app_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.app_customer_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id FROM public.app_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.app_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_role() IN ('master','operador'), false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.app_role() = 'master', false);
$$;

CREATE OR REPLACE FUNCTION public.app_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT status = 'ativo' FROM public.app_profiles WHERE id = auth.uid()), false);
$$;

-- ------------------------------------------------------------
-- 4. Políticas da tabela app_profiles
-- ------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.app_profiles;
CREATE POLICY profiles_select_own ON public.app_profiles
  FOR SELECT USING (id = auth.uid() OR public.app_is_master());

DROP POLICY IF EXISTS profiles_master_manage ON public.app_profiles;
CREATE POLICY profiles_master_manage ON public.app_profiles
  FOR UPDATE USING (public.app_is_master());

-- ------------------------------------------------------------
-- 5. Novas colunas operacionais
-- ------------------------------------------------------------
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES public.app_profiles(id);
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS route_order INTEGER;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS created_by_profile UUID REFERENCES public.app_profiles(id);
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------
-- 6. Substituir políticas abertas por políticas por perfil
--    (as antigas "USING (true)" são removidas)
-- ------------------------------------------------------------

-- 6.1 Catálogo público (leitura livre para catálogo/cadastro)
DROP POLICY IF EXISTS "Permitir leitura total para produtos" ON public.products;
CREATE POLICY products_select_all ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS products_write_staff ON public.products;
CREATE POLICY products_write_staff ON public.products
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para promocoes" ON public.promotions;
CREATE POLICY promotions_select_auth ON public.promotions FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS promotions_write_staff ON public.promotions;
CREATE POLICY promotions_write_staff ON public.promotions
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para precos customizados" ON public.custom_prices;
CREATE POLICY custom_prices_select_auth ON public.custom_prices FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS custom_prices_write_staff ON public.custom_prices;
CREATE POLICY custom_prices_write_staff ON public.custom_prices
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

-- 6.2 Clientes
DROP POLICY IF EXISTS "Permitir leitura total para usuários autorizados" ON public.customers;
CREATE POLICY customers_staff_all ON public.customers
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY customers_buyer_own ON public.customers
  FOR SELECT USING (id = public.app_customer_id());

-- 6.3 Pedidos e itens
DROP POLICY IF EXISTS "Permitir leitura total para pedidos" ON public.orders;
CREATE POLICY orders_staff_all ON public.orders
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY orders_buyer_own ON public.orders
  FOR SELECT USING (customer_id = public.app_customer_id());
CREATE POLICY orders_buyer_insert_own ON public.orders
  FOR INSERT WITH CHECK (
    public.app_role() = 'comprador' AND public.app_is_active()
    AND customer_id = public.app_customer_id()
  );

DROP POLICY IF EXISTS "Permitir leitura total para itens de pedidos" ON public.order_items;
CREATE POLICY order_items_staff_all ON public.order_items
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY order_items_buyer_own ON public.order_items
  FOR SELECT USING (
    public.app_role() = 'comprador'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = public.app_customer_id()
    )
  );

-- 6.4 Entregas
DROP POLICY IF EXISTS "Permitir leitura total para entregas" ON public.deliveries;
CREATE POLICY deliveries_staff_all ON public.deliveries
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY deliveries_buyer_own ON public.deliveries
  FOR SELECT USING (customer_id = public.app_customer_id());
CREATE POLICY deliveries_buyer_reschedule ON public.deliveries
  FOR UPDATE USING (customer_id = public.app_customer_id() AND public.app_is_active())
  WITH CHECK (customer_id = public.app_customer_id());
CREATE POLICY deliveries_buyer_insert_own ON public.deliveries
  FOR INSERT WITH CHECK (
    public.app_role() = 'comprador' AND public.app_is_active()
    AND customer_id = public.app_customer_id()
  );
CREATE POLICY deliveries_driver_own ON public.deliveries
  FOR SELECT USING (
    public.app_role() = 'entregador'
    AND (assigned_driver_id = auth.uid() OR driver_name = (SELECT driver_name FROM public.app_profiles WHERE id = auth.uid()))
  );
CREATE POLICY deliveries_driver_update_own ON public.deliveries
  FOR UPDATE USING (
    public.app_role() = 'entregador' AND public.app_is_active()
    AND (assigned_driver_id = auth.uid() OR driver_name = (SELECT driver_name FROM public.app_profiles WHERE id = auth.uid()))
  ) WITH CHECK (
    assigned_driver_id = auth.uid() OR driver_name = (SELECT driver_name FROM public.app_profiles WHERE id = auth.uid())
  );

-- 6.5 Vasilhames
DROP POLICY IF EXISTS "Permitir leitura total para vasilhames" ON public.crates;
CREATE POLICY crates_staff_all ON public.crates
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY crates_buyer_own ON public.crates
  FOR SELECT USING (customer_id = public.app_customer_id());

-- 6.6 Financeiro do comprador
DROP POLICY IF EXISTS "Permitir leitura total para contas a receber" ON public.accounts_receivable;
CREATE POLICY receivables_staff_all ON public.accounts_receivable
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY receivables_buyer_own ON public.accounts_receivable
  FOR SELECT USING (customer_id = public.app_customer_id());
CREATE POLICY receivables_buyer_insert_own ON public.accounts_receivable
  FOR INSERT WITH CHECK (
    public.app_role() = 'comprador' AND public.app_is_active()
    AND customer_id = public.app_customer_id()
  );

-- 6.7 Operação interna (colheita, compras, financeiro completo)
DROP POLICY IF EXISTS "Permitir leitura total para colheitas" ON public.harvest_plans;
CREATE POLICY harvest_staff ON public.harvest_plans
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para fornecedores" ON public.suppliers;
CREATE POLICY suppliers_staff ON public.suppliers
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para compras" ON public.purchases;
CREATE POLICY purchases_staff ON public.purchases
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para contas a pagar" ON public.accounts_payable;
CREATE POLICY payables_staff ON public.accounts_payable
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para despesas" ON public.expenses;
CREATE POLICY expenses_staff ON public.expenses
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para fluxo de caixa" ON public.cash_movements;
CREATE POLICY cash_staff ON public.cash_movements
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para fechamentos" ON public.monthly_closures;
CREATE POLICY closures_staff ON public.monthly_closures
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

DROP POLICY IF EXISTS "Permitir leitura total para auditoria IA" ON public.ai_audit_logs;
CREATE POLICY ai_logs_insert_auth ON public.ai_audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY ai_logs_select_master ON public.ai_audit_logs FOR SELECT USING (public.app_is_master());

-- 6.8 Configurações gerais (chave PIX etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read_auth ON public.app_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY settings_write_master ON public.app_settings
  FOR ALL USING (public.app_is_master()) WITH CHECK (public.app_is_master());

-- ------------------------------------------------------------
-- 7. Índices úteis
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_driver ON public.deliveries(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON public.deliveries(customer_id);

-- ============================================================
-- FIM — Depois de executar, crie a conta MASTER em:
-- My app -> Secrets  (SUPABASE_SERVICE_ROLE_KEY)
-- e use a tela Painel Master -> Usuários do sistema,
-- ou a rota POST /api/admin/users do servidor.
-- ============================================================
