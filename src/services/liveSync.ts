import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type {
  Order,
  OrderItem,
  Delivery,
  DeliveryItem,
  Product,
  Customer,
  AccountsReceivable,
  CustomPrice,
  Promotion,
  CrateRecord,
  PaymentMethod,
  PaymentTerm,
  OrderStatus,
  ProductCategory,
  ProductUnit,
  ProductSalesType,
  DeliveryStatus,
} from '../types';

/**
 * Sincronização em tempo real com o Supabase.
 * O estado local (localStorage) continua como cache de partida;
 * os dados remotos sobrepõem quando existem.
 */

export interface RemoteNotification {
  id: string;
  audience: 'operador' | 'comprador';
  customer_id?: string | null;
  type: string;
  title: string;
  message: string;
  action_tab?: string | null;
  read: boolean;
  created_at: string;
}

export const liveSync = {
  isAvailable: () => isSupabaseConfigured() && getSupabaseClient() !== null,

  // ----------------------------------------------------------
  // PULL — carrega dados remotos e converte para os tipos do app
  // ----------------------------------------------------------
  pullAll: async (): Promise<{
    orders: Order[];
    deliveries: Delivery[];
    products: Product[];
    customers: Customer[];
    receivables: AccountsReceivable[];
    customPrices: CustomPrice[];
    promotions: Promotion[];
    crates: CrateRecord[];
  } | null> => {
    const client = getSupabaseClient();
    const empty = { orders: [], deliveries: [], products: [], customers: [], receivables: [], customPrices: [], promotions: [], crates: [] };
    // null = leitura indisponível (sem config ou erro de rede): o chamador
    // mantém o estado atual. Objeto vazio = banco realmente sem registros.
    if (!client) return null;

    try {
      const [ordersRes, itemsRes, deliveriesRes, productsRes, customersRes, receivablesRes, customPricesRes, promotionsRes, cratesRes] =
        await Promise.all([
          client.from('orders').select('*').order('created_at', { ascending: false }).limit(300),
          client.from('order_items').select('*').limit(2000),
          client.from('deliveries').select('*').order('created_at', { ascending: false }).limit(300),
          client.from('products').select('*').order('name'),
          client.from('customers').select('*').order('name'),
          client.from('accounts_receivable').select('*').order('due_date', { ascending: false }).limit(300),
          client.from('custom_prices').select('*').limit(2000),
          client.from('promotions').select('*').limit(1000),
          client.from('crates').select('*').order('date', { ascending: false }).limit(500),
        ]);

      // Pedidos + itens
      const itemsByOrder: Record<string, OrderItem[]> = {};
      for (const it of itemsRes.data || []) {
        const mapped: OrderItem = {
          productId: it.product_id,
          productName: it.product_name,
          unit: it.unit as ProductUnit,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unit_price),
          originalPrice: Number(it.original_price),
          isPromo: !!it.is_promo,
          subtotal: Number(it.subtotal),
        };
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
        itemsByOrder[it.order_id].push(mapped);
      }

      const orders: Order[] = (ordersRes.data || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        customerName: o.customer_name,
        date: o.date,
        deliveryDate: o.delivery_date,
        status: o.status as OrderStatus,
        items: itemsByOrder[o.id] || [],
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        total: Number(o.total),
        paymentMethod: o.payment_method as PaymentMethod,
        paymentTerm: o.payment_term as PaymentTerm,
        paymentStatus: o.payment_status,
        notes: o.notes || undefined,
        deliveryId: o.delivery_id || undefined,
        receivableId: o.receivable_id || undefined,
      }));

      // Entregas
      const deliveries: Delivery[] = (deliveriesRes.data || []).map((d: any) => ({
        id: d.id,
        orderId: d.order_id || '',
        orderNumber: d.order_number || '',
        customerId: d.customer_id,
        customerName: d.customer_name,
        address: d.address,
        neighborhood: d.neighborhood,
        city: d.city,
        driverName: d.driver_name,
        vehicle: d.vehicle,
        date: d.date,
        shift: d.shift,
        status: d.status as DeliveryStatus,
        items: (d.items || []).map((it: any) => ({
          productId: it.productId || it.product_id || '',
          productName: it.productName || it.product_name || '',
          expectedQty: it.expectedQty ?? it.expected_qty ?? 0,
          unit: it.unit || 'cx',
        })) as DeliveryItem[],
        grossWeight: d.gross_weight != null ? Number(d.gross_weight) : undefined,
        tareWeight: d.tare_weight != null ? Number(d.tare_weight) : undefined,
        netWeight: d.net_weight != null ? Number(d.net_weight) : undefined,
        cratesDelivered: d.crates_delivered ?? 0,
        cratesReturned: d.crates_returned ?? 0,
        issueReport: d.issue_report || undefined,
        driverNotes: d.driver_notes || undefined,
        notes: d.notes || undefined,
        completedAt: d.completed_at || undefined,
        assignedDriverId: d.assigned_driver_id || undefined,
        routeOrder: d.route_order ?? undefined,
      }));

      // Produtos (inativos ficam fora do catálogo, mas preservam o histórico de pedidos)
      const products: Product[] = (productsRes.data || [])
        .filter((p: any) => p.status !== 'inactive')
        .map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category as ProductCategory,
        unit: p.unit as ProductUnit,
        salesType: p.sales_type as ProductSalesType,
        defaultPrice: Number(p.default_price),
        avgCost: Number(p.avg_cost),
        origin: p.origin || '',
        notes: p.notes || undefined,
        imageUrl: p.image_url || undefined,
        unitsPerBox: p.units_per_box != null && Number(p.units_per_box) > 0 ? Number(p.units_per_box) : undefined,
        status: p.status,
      }));
      // Clientes
      const customers: Customer[] = (customersRes.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        tradeName: c.trade_name || undefined,
        document: c.document || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        address: {
          street: c.street || '',
          number: c.number || '',
          neighborhood: c.neighborhood || '',
          city: c.city || '',
          state: c.state || 'SP',
          zipCode: c.zip_code || '',
          reference: c.reference || undefined,
        },
        status: (c.status || 'active') as 'active' | 'inactive',
        paymentMethod: c.payment_method as PaymentMethod,
        paymentTerm: c.payment_term as PaymentTerm,
        creditLimit: Number(c.credit_limit || 0),
        commercialCondition: c.commercial_condition || '',
        notes: c.notes || undefined,
        createdAt: c.created_at ? String(c.created_at).split('T')[0] : '',
      }));

      // Contas a receber
      const receivables: AccountsReceivable[] = (receivablesRes.data || []).map((r: any) => ({
        id: r.id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        orderId: r.order_id || undefined,
        orderNumber: r.order_number || undefined,
        amount: Number(r.amount),
        paidAmount: r.paid_amount != null ? Number(r.paid_amount) : undefined,
        dueDate: r.due_date,
        status: r.status as AccountsReceivable['status'],
        paymentMethod: r.payment_method as PaymentMethod,
        notes: r.notes || undefined,
      }));

      // Preços especiais (dedupe: mantém o mais recente por cliente+produto,
      // caso existam linhas antigas duplicadas de alterações anteriores)
      const customPrices: CustomPrice[] = Object.values(
        (customPricesRes.data || []).reduce<Record<string, CustomPrice>>((acc, cp: any) => {
          const mapped: CustomPrice = {
            id: cp.id,
            customerId: cp.customer_id,
            productId: cp.product_id,
            price: Number(cp.price),
            updatedAt: cp.updated_at || '',
          };
          const key = `${mapped.customerId}|${mapped.productId}`;
          const current = acc[key];
          if (!current || mapped.updatedAt >= current.updatedAt) acc[key] = mapped;
          return acc;
        }, {})
      );

      // Promoções
      const promotions: Promotion[] = (promotionsRes.data || []).map((p: any) => ({
        id: p.id,
        customerId: p.customer_id,
        productId: p.product_id,
        promotionalPrice: Number(p.promotional_price),
        startDate: p.start_date,
        endDate: p.end_date,
        minQuantity: Number(p.min_quantity || 1),
        notes: p.notes || undefined,
        active: !!p.active,
      }));

      // Vasilhames
      const crates: CrateRecord[] = (cratesRes.data || []).map((cr: any) => ({
        id: cr.id,
        customerId: cr.customer_id,
        customerName: cr.customer_name,
        orderId: cr.order_id || undefined,
        deliveryId: cr.delivery_id || undefined,
        type: cr.type,
        sent: Number(cr.sent),
        returned: Number(cr.returned),
        balance: Number(cr.balance),
        date: cr.date,
        notes: cr.notes || undefined,
      }));

      return { orders, deliveries, products, customers, receivables, customPrices, promotions, crates };
    } catch {
      return null;
    }
  },

  // ----------------------------------------------------------
  // PUSH — grava pedido completo (pedido + itens + entrega + conta)
  // ----------------------------------------------------------
  pushOrder: async (order: Order, delivery: Delivery, receivable: AccountsReceivable): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      await client.from('orders').upsert({
        id: order.id,
        order_number: order.orderNumber,
        customer_id: order.customerId,
        customer_name: order.customerName,
        date: order.date,
        delivery_date: order.deliveryDate,
        status: order.status,
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        payment_method: order.paymentMethod,
        payment_term: order.paymentTerm,
        payment_status: order.paymentStatus,
        notes: order.notes || null,
        delivery_id: order.deliveryId || null,
        receivable_id: order.receivableId || null,
      });

      if (order.items.length > 0) {
        await client.from('order_items').upsert(
          order.items.map((it, idx) => ({
            id: `${order.id}-item-${idx}`,
            order_id: order.id,
            product_id: it.productId,
            product_name: it.productName,
            unit: it.unit,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            original_price: it.originalPrice,
            is_promo: !!it.isPromo,
            subtotal: it.subtotal,
          }))
        );
      }

      await client.from('deliveries').upsert({
        id: delivery.id,
        order_id: delivery.orderId,
        order_number: delivery.orderNumber,
        customer_id: delivery.customerId,
        customer_name: delivery.customerName,
        address: delivery.address,
        neighborhood: delivery.neighborhood,
        city: delivery.city,
        driver_name: delivery.driverName,
        vehicle: delivery.vehicle,
        date: delivery.date,
        shift: delivery.shift,
        status: delivery.status,
        crates_delivered: delivery.cratesDelivered,
        crates_returned: delivery.cratesReturned,
        notes: delivery.notes || null,
        items: delivery.items,
      });

      await client.from('accounts_receivable').upsert({
        id: receivable.id,
        customer_id: receivable.customerId,
        customer_name: receivable.customerName,
        order_id: receivable.orderId || null,
        order_number: receivable.orderNumber || null,
        amount: receivable.amount,
        due_date: receivable.dueDate,
        status: receivable.status,
        payment_method: receivable.paymentMethod,
        notes: receivable.notes || null,
      });

      return true;
    } catch {
      return false;
    }
  },

  // ----------------------------------------------------------
  // PUSH — atualizações pontuais de status
  // ----------------------------------------------------------
  pushOrderStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    await client.from('orders').update({ status }).eq('id', orderId);
  },

  pushDeliveryStatus: async (
    deliveryId: string,
    status: DeliveryStatus,
    extra?: {
      grossWeight?: number;
      tareWeight?: number;
      netWeight?: number;
      cratesReturned?: number;
      issueReport?: string;
      driverNotes?: string;
    }
  ): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    const patch: Record<string, any> = { status };
    if (extra?.grossWeight != null) patch.gross_weight = extra.grossWeight;
    if (extra?.tareWeight != null) patch.tare_weight = extra.tareWeight;
    if (extra?.netWeight != null) patch.net_weight = extra.netWeight;
    if (extra?.cratesReturned != null) patch.crates_returned = extra.cratesReturned;
    if (extra?.issueReport != null) patch.issue_report = extra.issueReport;
    if (extra?.driverNotes != null) patch.driver_notes = extra.driverNotes;
    if (status === 'entregue') patch.completed_at = new Date().toISOString();
    await client.from('deliveries').update(patch).eq('id', deliveryId);
  },

  // ----------------------------------------------------------
  // NOTIFICAÇÕES — avisos multi-aparelho (operador e comprador)
  // ----------------------------------------------------------
  pushNotification: async (n: {
    id: string;
    audience: 'operador' | 'comprador';
    customerId?: string;
    type: string;
    title: string;
    message: string;
    actionTab?: string;
  }): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { error } = await client.from('notifications').insert({
        id: n.id,
        audience: n.audience,
        customer_id: n.customerId || null,
        type: n.type,
        title: n.title,
        message: n.message,
        action_tab: n.actionTab || null,
      });
      return !error;
    } catch {
      return false;
    }
  },

  pullNotifications: async (
    audience: 'operador' | 'comprador',
    customerId?: string
  ): Promise<RemoteNotification[]> => {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      let query = client
        .from('notifications')
        .select('*')
        .eq('audience', audience)
        .order('created_at', { ascending: false })
        .limit(50);
      if (customerId) query = query.eq('customer_id', customerId);
      const { data, error } = await query;
      if (error) return [];
      return (data || []) as RemoteNotification[];
    } catch {
      return [];
    }
  },

  markNotificationRead: async (id: string): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    await client.from('notifications').update({ read: true }).eq('id', id);
  },

  // Lida = some da lista: remove a notificação no Supabase (todos os aparelhos)
  deleteNotification: async (id: string): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('notifications').delete().eq('id', id);
    } catch {
      // silencioso
    }
  },

  // Notificações resolvidas: remove por texto (nº do pedido) só do público do painel,
  // preservando os avisos do comprador (ex.: "seu pedido foi entregue")
  deleteNotificationsLike: async (text: string): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client
        .from('notifications')
        .delete()
        .eq('audience', 'operador')
        .like('message', `*${text}*`);
    } catch {
      // silencioso
    }
  },

  // ----------------------------------------------------------
  // PUSH — cadastros do operador (clientes, produtos, preços, promoções, vasilhames)
  // ----------------------------------------------------------
  pushCustomer: async (c: Customer): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('customers').upsert({
        id: c.id,
        name: c.name,
        trade_name: c.tradeName || null,
        document: c.document || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || '',
        street: c.address?.street || 'A informar',
        number: c.address?.number || 'S/N',
        neighborhood: c.address?.neighborhood || 'A informar',
        city: c.address?.city || 'A informar',
        state: c.address?.state || 'SP',
        zip_code: c.address?.zipCode || '',
        reference: c.address?.reference || null,
        status: c.status || 'active',
        payment_method: c.paymentMethod || 'pix',
        payment_term: c.paymentTerm || 'vista',
        credit_limit: c.creditLimit ?? 0,
        commercial_condition: c.commercialCondition || '',
        notes: c.notes || null,
      });
    } catch {
      // silencioso
    }
  },

  pushProduct: async (p: Product): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const payload: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        sales_type: p.salesType,
        default_price: p.defaultPrice,
        avg_cost: p.avgCost ?? 0,
        origin: p.origin || null,
        notes: p.notes || null,
        image_url: p.imageUrl || null,
        units_per_box: p.unitsPerBox ?? null,
        status: p.status || 'active',
      };
      const { error } = await client.from('products').upsert(payload);
      // Fallback: coluna units_per_box ainda não existe no banco → salva sem ela
      if (error && /units_per_box|could not find/i.test(error.message)) {
        delete payload.units_per_box;
        await client.from('products').upsert(payload);
      }
    } catch {
      // silencioso
    }
  },

  pushCustomPrice: async (cp: CustomPrice): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      // Remove registros antigos do mesmo produto/cliente (cada alteração
      // gerava uma linha nova e a antiga podia "ganhar" na leitura)
      await client
        .from('custom_prices')
        .delete()
        .eq('customer_id', cp.customerId)
        .eq('product_id', cp.productId);
      await client.from('custom_prices').upsert({
        id: cp.id,
        customer_id: cp.customerId,
        product_id: cp.productId,
        price: cp.price,
        updated_at: cp.updatedAt || new Date().toISOString().split('T')[0],
      });
    } catch {
      // silencioso
    }
  },

  deleteCustomPrice: async (id: string): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('custom_prices').delete().eq('id', id);
    } catch {
      // silencioso
    }
  },

  // Exclusão de pedido no Supabase: entrega, recebível, pedido (itens caem por cascade) e notificações
  deleteOrder: async (orderId: string, orderNumber?: string): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('deliveries').delete().eq('order_id', orderId);
      await client.from('accounts_receivable').delete().eq('order_id', orderId);
      await client.from('orders').delete().eq('id', orderId);
      if (orderNumber) {
        await client.from('notifications').delete().like('message', `*${orderNumber}*`);
      }
    } catch {
      // silencioso: o pedido já foi removido localmente
    }
  },

  pushPromotion: async (p: Promotion): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('promotions').upsert({
        id: p.id,
        customer_id: p.customerId,
        product_id: p.productId,
        promotional_price: p.promotionalPrice,
        start_date: p.startDate,
        end_date: p.endDate,
        min_quantity: p.minQuantity ?? 1,
        notes: p.notes || null,
        active: p.active,
      });
    } catch {
      // silencioso
    }
  },

  updatePromotion: async (id: string, active: boolean): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('promotions').update({ active }).eq('id', id);
    } catch {
      // silencioso
    }
  },

  pushCrate: async (cr: CrateRecord): Promise<void> => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('crates').upsert({
        id: cr.id,
        customer_id: cr.customerId,
        customer_name: cr.customerName,
        order_id: cr.orderId || null,
        delivery_id: cr.deliveryId || null,
        type: cr.type,
        sent: cr.sent,
        returned: cr.returned,
        balance: cr.balance,
        date: cr.date,
        notes: cr.notes || null,
      });
    } catch {
      // silencioso
    }
  },
};
