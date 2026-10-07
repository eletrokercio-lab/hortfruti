-- ==============================================================================
-- HORTIGESTÃO (v3.0) — SCRIPT DE CRIAÇÃO DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Execute este script no "SQL Editor" do seu projeto no Supabase (supabase.com)
-- ==============================================================================

-- 1. Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    trade_name TEXT,
    document TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'SP',
    zip_code TEXT,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    payment_method TEXT NOT NULL DEFAULT 'boleto',
    payment_term TEXT NOT NULL DEFAULT '7d',
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    commercial_condition TEXT DEFAULT 'Tabela Atacado',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('frutas', 'legumes', 'verduras', 'folhagens', 'temperos', 'tuberculos', 'outros')),
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'cx', 'un', 'saco', 'bandeja', 'duzia')),
    sales_type TEXT NOT NULL DEFAULT 'caixa' CHECK (sales_type IN ('peso', 'unidade', 'caixa')),
    default_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    avg_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    default_supplier_id TEXT,
    origin TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Preços Individuais por Cliente
CREATE TABLE IF NOT EXISTS public.custom_prices (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    updated_at DATE DEFAULT CURRENT_DATE,
    CONSTRAINT unique_customer_product_price UNIQUE (customer_id, product_id)
);

-- 5. Tabela de Promoções
CREATE TABLE IF NOT EXISTS public.promotions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id TEXT NOT NULL, -- 'all' ou ID do cliente específico
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    promotional_price NUMERIC(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    min_quantity NUMERIC(10, 2) DEFAULT 1,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL REFERENCES public.customers(id),
    customer_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_separacao', 'pronto', 'em_rota', 'entregue', 'cancelado')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL,
    payment_term TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'pago', 'parcial')),
    notes TEXT,
    delivery_id TEXT,
    receivable_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Itens do Pedido
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2) NOT NULL,
    is_promo BOOLEAN DEFAULT FALSE,
    subtotal NUMERIC(12, 2) NOT NULL
);

-- 8. Tabela de Entregas & Rotas
CREATE TABLE IF NOT EXISTS public.deliveries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    order_number TEXT,
    customer_id TEXT NOT NULL REFERENCES public.customers(id),
    customer_name TEXT NOT NULL,
    address TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    vehicle TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL DEFAULT 'manha' CHECK (shift IN ('manha', 'tarde')),
    status TEXT NOT NULL DEFAULT 'a_preparar' CHECK (status IN ('a_preparar', 'separado', 'em_rota', 'entregue', 'problema')),
    gross_weight NUMERIC(10, 2),
    tare_weight NUMERIC(10, 2),
    net_weight NUMERIC(10, 2),
    crates_delivered INTEGER NOT NULL DEFAULT 0,
    crates_returned INTEGER NOT NULL DEFAULT 0,
    issue_report TEXT,
    driver_notes TEXT,
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabela de Vasilhames (Caixas Retornáveis)
CREATE TABLE IF NOT EXISTS public.crates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id TEXT NOT NULL REFERENCES public.customers(id),
    customer_name TEXT NOT NULL,
    order_id TEXT,
    delivery_id TEXT,
    type TEXT NOT NULL DEFAULT 'caixa_plastica_k',
    sent INTEGER NOT NULL DEFAULT 0,
    returned INTEGER NOT NULL DEFAULT 0,
    balance INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Tabela de Planejamento de Colheita
CREATE TABLE IF NOT EXISTS public.harvest_plans (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    product_id TEXT NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    needed_qty NUMERIC(10, 2) NOT NULL,
    harvest_qty NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    responsible TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_preparacao', 'colhendo', 'concluido')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    document TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    supplied_products TEXT[],
    payment_condition TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Tabela de Compras
CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    purchase_number TEXT NOT NULL UNIQUE,
    supplier_id TEXT NOT NULL REFERENCES public.suppliers(id),
    supplier_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'recebido' CHECK (status IN ('pendente', 'recebido', 'cancelado')),
    payable_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Tabela de Contas a Receber
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    customer_id TEXT NOT NULL REFERENCES public.customers(id),
    customer_name TEXT NOT NULL,
    order_id TEXT,
    order_number TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido', 'parcial')),
    payment_method TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Tabela de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    supplier_or_payee TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    purchase_id TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'vencido')),
    payment_method TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Tabela de Despesas Operacionais
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL,
    receipt_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Tabela de Fluxo de Caixa (Movimentações)
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Tabela de Fechamentos Mensais (Contador)
CREATE TABLE IF NOT EXISTS public.monthly_closures (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    month TEXT NOT NULL UNIQUE, -- YYYY-MM
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by TEXT,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    gross_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_received NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_purchases NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    open_receivables NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    open_payables NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_result NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Tabela de Auditoria da IA (PRD §41)
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_role TEXT NOT NULL,
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    suggested_action JSONB,
    status TEXT NOT NULL DEFAULT 'auto_answered'
);

-- 19. Habilitar Row Level Security (RLS) nas tabelas
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- 20. Políticas de Acesso Público com Anon Key (ou autenticado)
CREATE POLICY "Permitir leitura total para usuários autorizados" ON public.customers FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para produtos" ON public.products FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para precos customizados" ON public.custom_prices FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para promocoes" ON public.promotions FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para pedidos" ON public.orders FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para itens de pedidos" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para entregas" ON public.deliveries FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para vasilhames" ON public.crates FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para colheitas" ON public.harvest_plans FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para fornecedores" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para compras" ON public.purchases FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para contas a receber" ON public.accounts_receivable FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para contas a pagar" ON public.accounts_payable FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para despesas" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para fluxo de caixa" ON public.cash_movements FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para fechamentos" ON public.monthly_closures FOR ALL USING (true);
CREATE POLICY "Permitir leitura total para auditoria IA" ON public.ai_audit_logs FOR ALL USING (true);
