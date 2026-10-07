-- ============================================================
-- HortiGestão — CORREÇÃO: auto-vínculo do comprador no cadastro
-- Execute este script NO INTEIRO no SQL Editor do Supabase.
--
-- O que faz:
--  1. Atualiza o trigger de novo usuário: todo comprador que se
--     cadastra ganha automaticamente um cadastro de cliente
--     vinculado (fim do "Cadastro comercial em análise").
--  2. Corrige contas de comprador JÁ EXISTENTES sem vínculo
--     (cria o cliente e vincula na hora).
-- ============================================================

-- 1. Trigger atualizado
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

-- 2. Corrige compradores já cadastrados sem vínculo de cliente
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
    v_cid := 'cust-' || UPPER(SUBSTRING(REPLACE(r.id, '-', ''), 1, 8));
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
