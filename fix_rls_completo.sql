-- ============================================================
-- HortiGestão — CORREÇÃO DEFINITIVA DE SEGURANÇA (RLS)
-- Execute o script INTEIRO no SQL Editor do Supabase.
--
-- O que faz:
--  1. Remove TODAS as políticas antigas das tabelas do app
--     (inclusive resquícios permissivos de versões anteriores
--     que deixavam entregador ler pedidos e comprador apagar
--     pedidos em separação).
--  2. Recria o conjunto correto e completo de políticas.
--  3. Reaplica o trigger de auto-vínculo do comprador.
--  4. Corrige compradores já cadastrados sem vínculo.
-- É seguro rodar mais de uma vez.
-- ============================================================

-- ---------- 1. LIMPEZA: derruba TODAS as políticas das tabelas do app ----------
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policy_name
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'app_profiles','customers','products','orders','order_items','deliveries',
        'crates','accounts_receivable','custom_prices','promotions',
        'harvest_plans','suppliers','purchases','accounts_payable','expenses',
        'cash_movements','monthly_closures','ai_audit_logs','app_settings','notifications'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policy_name, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ---------- 2. FUNÇÕES AUXILIARES ----------
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

-- ---------- 3. TRIGGER DE NOVO USUÁRIO (auto-vínculo do comprador) ----------
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

-- ---------- 4. POLÍTICAS CORRETAS ----------

-- 4.1 Perfis: cada um vê o próprio; staff lê todos (delegar entregas); master gerencia
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.app_profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_staff_read ON public.app_profiles
  FOR SELECT USING (public.app_is_staff());
CREATE POLICY profiles_master_manage ON public.app_profiles
  FOR ALL USING (public.app_is_master()) WITH CHECK (public.app_is_master());

-- 4.2 Clientes: staff gerencia; comprador vê e atualiza o próprio
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_staff_all ON public.customers
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY customers_buyer_own ON public.customers
  FOR SELECT USING (id = public.app_customer_id());
CREATE POLICY customers_buyer_update_own ON public.customers
  FOR UPDATE USING (id = public.app_customer_id())
  WITH CHECK (id = public.app_customer_id());

-- 4.3 Produtos: catálogo legível a qualquer autenticado; escrita só staff
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_select_auth ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY products_write_staff ON public.products
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

-- 4.4 Pedidos: staff total; comprador lê/cria os próprios e só desfaz PENDENTE
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_staff_all ON public.orders
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY orders_buyer_own ON public.orders
  FOR SELECT USING (customer_id = public.app_customer_id());
CREATE POLICY orders_buyer_insert_own ON public.orders
  FOR INSERT WITH CHECK (
    public.app_role() = 'comprador' AND public.app_is_active()
    AND customer_id = public.app_customer_id()
  );
CREATE POLICY orders_buyer_delete_own ON public.orders
  FOR DELETE USING (
    public.app_role() = 'comprador' AND status = 'pendente'
    AND customer_id = public.app_customer_id()
  );

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY order_items_buyer_insert_own ON public.order_items
  FOR INSERT WITH CHECK (
    public.app_role() = 'comprador' AND public.app_is_active()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = public.app_customer_id()
    )
  );
CREATE POLICY order_items_buyer_delete_own ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.status = 'pendente'
        AND o.customer_id = public.app_customer_id()
    )
  );

-- 4.5 Entregas: staff total; comprador vê/cria as suas; entregador só as dele
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY deliveries_buyer_delete_own ON public.deliveries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.status = 'pendente'
        AND o.customer_id = public.app_customer_id()
    )
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

-- 4.6 Vasilhames: staff gerencia; comprador lê os seus
ALTER TABLE public.crates ENABLE ROW LEVEL SECURITY;
CREATE POLICY crates_staff_all ON public.crates
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY crates_buyer_own ON public.crates
  FOR SELECT USING (customer_id = public.app_customer_id());

-- 4.7 Financeiro: staff total; comprador lê/cria os seus (só desfaz em aberto)
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY receivables_staff_all ON public.accounts_receivable
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());
CREATE POLICY receivables_buyer_own ON public.accounts_receivable
  FOR SELECT USING (customer_id = public.app_customer_id());
CREATE POLICY receivables_buyer_insert_own ON public.accounts_receivable
  FOR INSERT WITH CHECK (
    public.app_role() = 'comprador' AND public.app_is_active()
    AND customer_id = public.app_customer_id()
  );
CREATE POLICY receivables_buyer_delete_own ON public.accounts_receivable
  FOR DELETE USING (
    public.app_role() = 'comprador' AND status IN ('aberto', 'pendente')
    AND customer_id = public.app_customer_id()
  );

-- 4.8 Preços especiais e promoções: leitura para autenticados; escrita staff
ALTER TABLE public.custom_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY custom_prices_select_auth ON public.custom_prices
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY custom_prices_write_staff ON public.custom_prices
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY promotions_select_auth ON public.promotions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY promotions_write_staff ON public.promotions
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

-- 4.9 Operação interna: só staff
ALTER TABLE public.harvest_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY harvest_staff ON public.harvest_plans
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppliers_staff ON public.suppliers
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY purchases_staff ON public.purchases
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY payables_staff ON public.accounts_payable
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_staff ON public.expenses
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_staff ON public.cash_movements
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.monthly_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY closures_staff ON public.monthly_closures
  FOR ALL USING (public.app_is_staff()) WITH CHECK (public.app_is_staff());

ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_logs_insert_auth ON public.ai_audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY ai_logs_select_master ON public.ai_audit_logs
  FOR SELECT USING (public.app_is_master());

-- 4.10 Configurações (chave PIX): leitura autenticada; escrita master
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read_auth ON public.app_settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY settings_write_master ON public.app_settings
  FOR ALL USING (public.app_is_master()) WITH CHECK (public.app_is_master());

-- 4.11 Notificações: operador vê as dele; comprador vê as suas; staff lê tudo; staff apaga
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (
    (audience = 'operador' AND public.app_is_staff())
    OR (audience = 'comprador' AND public.app_customer_id() IS NOT NULL AND customer_id = public.app_customer_id())
    OR (audience = 'comprador' AND public.app_is_staff())
  );
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (
    public.app_is_staff()
    OR (audience = 'comprador' AND public.app_customer_id() IS NOT NULL AND customer_id = public.app_customer_id())
  )
  WITH CHECK (TRUE);
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE USING (public.app_is_staff());

-- ---------- 5. BACKFILL: compradores cadastrados sem vínculo de cliente ----------
DO $$
DECLARE
  r RECORD;
  v_cid TEXT;
BEGIN
  FOR r IN
    SELECT id, email, full_name
    FROM public.app_profiles
    WHERE role = 'comprador' AND customer_id IS NULL
  LOOP
    v_cid := 'cust-' || UPPER(SUBSTRING(REPLACE(r.id::text, '-', ''), 1, 8));
    INSERT INTO public.customers (id, name, document, phone, street, number, neighborhood, city, status, payment_method, payment_term, commercial_condition, notes)
    VALUES (
      v_cid,
      COALESCE(NULLIF(r.full_name, ''), r.email),
      '',
      '',
      'A informar',
      'S/N',
      'A informar',
      'A informar',
      'active',
      'pix',
      'vista',
      'Auto-cadastro pelo app',
      'Vínculo criado automaticamente pela correção.'
    )
    ON CONFLICT (id) DO NOTHING;
    UPDATE public.app_profiles SET customer_id = v_cid WHERE id = r.id;
  END LOOP;
END $$;
