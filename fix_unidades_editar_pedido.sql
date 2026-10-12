-- 1) Coluna de unidades por caixa (permite venda por cx OU unidade em todos os produtos)
alter table products add column if not exists units_per_box numeric;

-- 2) Edicao de pedido pelo comprador (somente enquanto status = 'pendente')
create or replace function fn_comprador_editar_pedido(
  p_order_id text,
  p_delivery_date date,
  p_shift text,
  p_notes text,
  p_items jsonb,
  p_total numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
  v_order_customer text;
  v_status text;
  v_order_number text;
  v_customer_name text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Nao autenticado');
  end if;

  select customer_id into v_customer_id from app_profiles where id = auth.uid();
  if v_customer_id is null then
    return jsonb_build_object('ok', false, 'error', 'Sem cliente vinculado');
  end if;

  select customer_id, status, order_number into v_order_customer, v_status, v_order_number
  from orders where id = p_order_id;
  if v_order_customer is null then
    return jsonb_build_object('ok', false, 'error', 'Pedido nao encontrado');
  end if;
  if v_order_customer <> v_customer_id then
    return jsonb_build_object('ok', false, 'error', 'Sem permissao para este pedido');
  end if;
  if v_status <> 'pendente' then
    return jsonb_build_object('ok', false, 'error', 'Pedido ja esta em preparo. Fale com o vendedor.');
  end if;

  select name into v_customer_name from customers where id = v_customer_id;

  -- Reescreve os itens
  delete from order_items where order_id = p_order_id;
  insert into order_items (id, order_id, product_id, product_name, unit, quantity, unit_price, original_price, is_promo, subtotal)
  select
    'oi-' || md5(p_order_id || x.product_id || x.unit || random()::text),
    p_order_id, x.product_id, x.product_name, x.unit, x.quantity,
    x.unit_price, coalesce(x.original_price, x.unit_price), coalesce(x.is_promo, false),
    x.quantity * x.unit_price
  from jsonb_to_recordset(p_items) as x(
    product_id text, product_name text, unit text, quantity numeric,
    unit_price numeric, original_price numeric, is_promo boolean
  );

  -- Atualiza o pedido
  update orders
  set delivery_date = p_delivery_date, notes = p_notes, subtotal = p_total, total = p_total
  where id = p_order_id;

  -- Atualiza a entrega (itens para separacao + endereco atual do cliente)
  update deliveries d
  set date = p_delivery_date,
      shift = coalesce(p_shift, d.shift),
      notes = p_notes,
      address = c.street || ', ' || c.number,
      neighborhood = c.neighborhood,
      city = c.city,
      items = t.it
  from (
    select coalesce(jsonb_agg(jsonb_build_object(
      'productId', x.product_id, 'productName', x.product_name,
      'expectedQty', x.quantity, 'unit', x.unit
    )), '[]'::jsonb) as it
    from jsonb_to_recordset(p_items) as x(product_id text, product_name text, unit text, quantity numeric)
  ) t,
  customers c
  where d.order_id = p_order_id and c.id = v_customer_id;

  -- Recebivel em aberto acompanha o novo total
  update accounts_receivable
  set amount = p_total, due_date = p_delivery_date
  where order_id = p_order_id and status = 'aberto';

  -- Notifica o painel
  insert into notifications (id, audience, type, title, message, action_tab)
  values (
    md5(random()::text || clock_timestamp()::text)::uuid,
    'operador', 'order', 'Pedido Atualizado pelo Cliente',
    (v_customer_name || ' atualizou o pedido ' || v_order_number ||
     ' (novo total R$ ' || replace(to_char(p_total, 'FM9999990.00'), '.', ',') || ', entrega ' ||
     to_char(p_delivery_date, 'DD/MM/YYYY') || ').'),
    'orders'
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function fn_comprador_editar_pedido(text, date, text, text, jsonb, numeric) to authenticated;
