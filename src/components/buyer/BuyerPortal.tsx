import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingBasket,
  Package,
  Truck,
  Wallet,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  X,
  Copy,
  Check,
  Banknote,
  QrCode,
  CalendarDays,
  Clock,
  LogOut,
  Layers,
  CircleCheckBig,
  Loader2,
  ClipboardList,
  Bell,
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import type {
  Product,
  ProductCategory,
  CustomPrice,
  Promotion,
  Order,
  Delivery,
  CrateRecord,
  AccountsReceivable,
} from '../../types';
import { formatBRL } from '../../utils/formatters';

const categoryLabels: Record<string, string> = {
  frutas: 'Frutas',
  legumes: 'Legumes',
  verduras: 'Verduras',
  folhagens: 'Folhagens',
  temperos: 'Temperos',
  tuberculos: 'Tubérculos',
  outros: 'Outros',
};

const orderStatusSteps: { key: string; label: string }[] = [
  { key: 'pendente', label: 'Recebido' },
  { key: 'em_separacao', label: 'Em separação' },
  { key: 'pronto', label: 'Pronto' },
  { key: 'em_rota', label: 'Em rota' },
  { key: 'entregue', label: 'Entregue' },
];

interface BuyerPortalProps {
  customerId: string;
  buyerName: string;
  onSignOut: () => void;
  pixKeyOverride?: string;
}

export const BuyerPortal: React.FC<BuyerPortalProps> = ({ customerId, buyerName, onSignOut }) => {
  const [tab, setTab] = useState<'catalogo' | 'pedidos' | 'entregas' | 'pendencias'>('catalogo');

  const [products, setProducts] = useState<Product[]>([]);
  const [customPrices, setCustomPrices] = useState<CustomPrice[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [crates, setCrates] = useState<CrateRecord[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [noCustomerLink, setNoCustomerLink] = useState(false);

  // Carrinho
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('todos');

  // Checkout
  const [deliveryDate, setDeliveryDate] = useState('');
  const [shift, setShift] = useState<'manha' | 'tarde'>('manha');
  const [payment, setPayment] = useState<'pix' | 'cash'>('pix');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Notificações do comprador (avisos de entrega sincronizados no Supabase)
  interface BuyerNotification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
  }
  const [notifs, setNotifs] = useState<BuyerNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        const { data, error } = await client
          .from('notifications')
          .select('*')
          .eq('audience', 'comprador')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(30);
        if (!error && !cancelled && data) setNotifs(data as BuyerNotification[]);
      } catch {
        // sem conexão: mantém as últimas carregadas
      }
    };
    sync();
    const poll = setInterval(sync, 45000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [customerId]);

  const unreadNotifs = notifs.filter((n) => !n.read).length;

  const markNotifRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const client = getSupabaseClient();
      if (client) await client.from('notifications').update({ read: true }).eq('id', id);
    } catch {
      // silencioso
    }
  };

  const loadData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const [prodRes, cpRes, promoRes, ordRes, delRes, crateRes, recRes, settingsRes] = await Promise.all([
      client.from('products').select('*').eq('status', 'active').order('name'),
      client.from('custom_prices').select('*').eq('customer_id', customerId),
      client.from('promotions').select('*').in('customer_id', ['all', customerId]),
      client.from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      client.from('deliveries').select('*').eq('customer_id', customerId).order('date', { ascending: false }),
      client.from('crates').select('*').eq('customer_id', customerId).order('date', { ascending: false }),
      client.from('accounts_receivable').select('*').eq('customer_id', customerId).order('due_date', { ascending: false }),
      client.from('app_settings').select('value').eq('key', 'pix_key').maybeSingle(),
    ]);

    if (prodRes.data) setProducts(prodRes.data as any);
    if (cpRes.data) setCustomPrices(cpRes.data as any);
    if (promoRes.data) setPromotions(promoRes.data as any);
    if (ordRes.data) {
      const list = ordRes.data as any[];
      setOrders(list as any);
      // carrega itens dos pedidos
      const ids = list.map((o) => o.id);
      if (ids.length > 0) {
        const { data: items } = await client.from('order_items').select('*').in('order_id', ids);
        const map: Record<string, any[]> = {};
        for (const it of items || []) {
          if (!map[it.order_id]) map[it.order_id] = [];
          map[it.order_id].push(it);
        }
        setOrderItems(map);
      }
    }
    if (delRes.data) setDeliveries(delRes.data as any);
    if (crateRes.data) setCrates(crateRes.data as any);
    if (recRes.data) setReceivables(recRes.data as any);
    if (settingsRes?.data?.value) setPixKey(settingsRes.data.value);

    // Cliente sem vínculo comercial: só catálogo
    const { data: cust } = await client.from('customers').select('id').eq('id', customerId).maybeSingle();
    setNoCustomerLink(!cust);

    setDeliveryDate(today);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Preço do produto para este comprador (promoção > preço especial > base)
  const getPrice = useCallback(
    (product: Product) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const promo = promotions.find(
        (p) =>
          p.active &&
          p.productId === product.id &&
          (p.customerId === 'all' || p.customerId === customerId) &&
          todayStr >= p.startDate &&
          todayStr <= p.endDate
      );
      if (promo) {
        return { price: promo.promotionalPrice, original: product.defaultPrice, isPromo: true };
      }
      const custom = customPrices.find((cp) => cp.customerId === customerId && cp.productId === product.id);
      if (custom) return { price: custom.price, original: product.defaultPrice, isPromo: false };
      return { price: product.defaultPrice, original: product.defaultPrice, isPromo: false };
    },
    [promotions, customPrices, customerId]
  );

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['todos', ...Array.from(set)];
  }, [products]);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === 'todos' || p.category === category) &&
          p.name.toLowerCase().includes(search.toLowerCase())
      ),
    [products, category, search]
  );

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;
        const priceInfo = getPrice(product);
        return {
          product,
          qty,
          price: priceInfo.price,
          isPromo: priceInfo.isPromo,
          subtotal: qty * priceInfo.price,
        };
      })
      .filter(Boolean) as {
      product: Product;
      qty: number;
      price: number;
      isPromo: boolean;
      subtotal: number;
    }[];
  }, [cart, products, getPrice]);

  const cartTotal = cartItems.reduce((acc, c) => acc + c.subtotal, 0);
  const cartCount = cartItems.reduce((acc, c) => acc + c.qty, 0);

  const addToCart = (productId: string, delta: number) => {
    setCart((prev) => {
      const next = { ...prev };
      const q = (next[productId] || 0) + delta;
      if (q <= 0) delete next[productId];
      else next[productId] = q;
      return next;
    });
  };

  const handleCheckout = async () => {
    setCheckoutError('');
    if (cartItems.length === 0) return;
    if (!deliveryDate) {
      setCheckoutError('Escolha a data de entrega.');
      return;
    }
    setPlacing(true);
    const client = getSupabaseClient();
    if (!client) {
      setCheckoutError('Banco de dados indisponível.');
      setPlacing(false);
      return;
    }

    try {
      const seq = Date.now().toString().slice(-6);
      const orderNumber = `PED-W${seq}`;
      const orderId = `ord-w${seq}`;
      const deliveryId = `del-w${seq}`;
      const receivableId = `rec-w${seq}`;

      // Dados do cliente para a entrega
      const { data: cust } = await client
        .from('customers')
        .select('name, street, number, neighborhood, city')
        .eq('id', customerId)
        .maybeSingle();

      const { error: orderError } = await client.from('orders').insert({
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: cust?.name || buyerName,
        delivery_date: deliveryDate,
        status: 'pendente',
        subtotal: cartTotal,
        discount: 0,
        total: cartTotal,
        payment_method: payment,
        payment_term: 'sight',
        payment_status: 'pendente',
        notes: notes || null,
        delivery_id: deliveryId,
        receivable_id: receivableId,
      });
      if (orderError) throw orderError;

      const itemsToInsert = cartItems.map((c) => ({
        order_id: orderId,
        product_id: c.product.id,
        product_name: c.product.name,
        unit: c.product.unit,
        quantity: c.qty,
        unit_price: c.price,
        original_price: c.product.defaultPrice,
        is_promo: c.isPromo,
        subtotal: c.subtotal,
      }));
      const { error: itemsError } = await client.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      const { error: deliveryError } = await client.from('deliveries').insert({
        id: deliveryId,
        order_id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: cust?.name || buyerName,
        address: cust ? `${cust.street}, ${cust.number}` : 'A confirmar',
        neighborhood: cust?.neighborhood || 'A confirmar',
        city: cust?.city || 'A confirmar',
        driver_name: 'A designar',
        vehicle: 'A designar',
        date: deliveryDate,
        shift,
        status: 'a_preparar',
        items: itemsToInsert.map((i) => ({
          productId: i.product_id,
          productName: i.product_name,
          expectedQty: i.quantity,
          unit: i.unit,
        })),
        notes: notes || null,
      });
      if (deliveryError) throw deliveryError;

      const { error: recError } = await client.from('accounts_receivable').insert({
        id: receivableId,
        customer_id: customerId,
        customer_name: cust?.name || buyerName,
        order_id: orderId,
        order_number: orderNumber,
        amount: cartTotal,
        due_date: deliveryDate,
        status: 'aberto',
        payment_method: payment,
        notes: `Referente ao pedido ${orderNumber}`,
      });
      if (recError) throw recError;

      setOrderPlaced(orderNumber);
      setCart({});
      setCartOpen(false);
      setNotes('');
      setTab('pedidos');
      loadData();
    } catch (err: any) {
      setCheckoutError(err.message || 'Falha ao enviar o pedido. Tente novamente.');
    }
    setPlacing(false);
  };

  const copyPix = async () => {
    await navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const crateBalance = crates.reduce((acc, c) => acc + (c.sent - c.returned), 0);
  const openReceivables = receivables.filter((r) => r.status === 'aberto' || r.status === 'parcial' || r.status === 'vencido');

  const today = new Date().toISOString().split('T')[0];
  const activeDeliveries = deliveries.filter((d) => d.status !== 'entregue' && d.status !== 'problema' || d.date >= today);

  const tabButton = (id: typeof tab, label: string, Icon: any) => (
    <button
      onClick={() => setTab(id)}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-semibold transition-colors md:flex-none md:flex-row md:gap-1.5 md:px-4 ${
        tab === id ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-lg text-white">🥬</div>
            <div>
              <p className="text-sm font-black leading-tight text-gray-900">HortiGestão</p>
              <p className="text-[11px] leading-tight text-gray-500">Olá, {buyerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadNotifs}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-2.5 text-sm font-bold text-gray-900">
                    Notificações
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-gray-500">
                        Nenhuma notificação por aqui ainda.
                      </p>
                    ) : (
                      notifs.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { if (!n.read) markNotifRead(n.id); }}
                          className={`block w-full border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                            n.read ? 'opacity-60' : 'bg-emerald-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-gray-900">{n.title}</p>
                            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-600">{n.message}</p>
                          <p className="mt-1 text-[10px] text-gray-400">
                            {new Date(n.created_at).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2">
          {tabButton('catalogo', 'Catálogo', ShoppingBasket)}
          {tabButton('pedidos', 'Meus Pedidos', ClipboardList)}
          {tabButton('entregas', 'Entregas', Truck)}
          {tabButton('pendencias', 'Pendências', Wallet)}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-28">
        {noCustomerLink && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">Cadastro comercial em análise</p>
            <p className="text-xs text-amber-700">
              Você já pode navegar pelo catálogo. Para finalizar compras, aguarde a vinculação do seu cadastro pela distribuidora (normalmente em poucas horas).
            </p>
          </div>
        )}

        {/* ===== CATÁLOGO ===== */}
        {tab === 'catalogo' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto... (ex.: tomate, alface)"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      category === c ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {c === 'todos' ? 'Todos' : categoryLabels[c] || c}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {visibleProducts.map((p) => {
                  const priceInfo = getPrice(p);
                  const qty = cart[p.id] || 0;
                  return (
                    <div key={p.id} className={`rounded-xl border bg-white p-3 shadow-xs transition-all ${qty > 0 ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                          {categoryLabels[p.category] || p.category}
                        </span>
                        {priceInfo.isPromo && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">PROMO</span>
                        )}
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold leading-tight text-gray-900">{p.name}</h3>
                      <p className="text-[11px] text-gray-400">{p.origin}</p>
                      <div className="mt-2">
                        {priceInfo.isPromo && (
                          <span className="mr-1.5 text-[11px] text-gray-400 line-through">{formatBRL(priceInfo.original)}</span>
                        )}
                        <span className="text-base font-black text-emerald-700">{formatBRL(priceInfo.price)}</span>
                        <span className="text-[11px] text-gray-500"> /{p.unit}</span>
                      </div>

                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(p.id, 1)}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98]"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </button>
                      ) : (
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-1.5 py-1">
                          <button onClick={() => addToCart(p.id, -1)} className="rounded p-1 text-emerald-700 hover:bg-emerald-100">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-black text-emerald-800">
                            {qty} {p.unit}
                          </span>
                          <button onClick={() => addToCart(p.id, 1)} className="rounded p-1 text-emerald-700 hover:bg-emerald-100">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {visibleProducts.length === 0 && (
                  <p className="col-span-full py-10 text-center text-sm text-gray-500">Nenhum produto encontrado.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== MEUS PEDIDOS ===== */}
        {tab === 'pedidos' && (
          <div className="space-y-3">
            {orderPlaced && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CircleCheckBig className="h-4 w-4" /> Pedido {orderPlaced} enviado com sucesso!
                </p>
                <p className="text-xs text-emerald-700">A distribuidora foi notificada e iniciará a separação.</p>
              </div>
            )}
            {orders.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-500">Você ainda não fez pedidos. Comece pelo Catálogo!</p>
            )}
            {orders.map((o) => {
              const stepIndex = orderStatusSteps.findIndex((s) => s.key === o.status);
              const items = orderItems[o.id] || [];
              return (
                <div key={o.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-gray-900">{o.orderNumber}</p>
                      <p className="text-xs text-gray-500">
                        Pedido em {new Date(o.date + 'T12:00:00').toLocaleDateString('pt-BR')} · Entrega:{' '}
                        {new Date(o.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-emerald-700">{formatBRL(o.total)}</p>
                      <p className="text-[11px] font-semibold text-gray-500">
                        {o.paymentMethod === 'pix' ? 'PIX' : 'À vista a combinar'}
                      </p>
                    </div>
                  </div>

                  {/* Linha do tempo do status */}
                  <div className="mt-3 flex items-center">
                    {orderStatusSteps.map((s, i) => (
                      <React.Fragment key={s.key}>
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                              i <= stepIndex && o.status !== 'cancelado' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {i <= stepIndex && o.status !== 'cancelado' ? <Check className="h-3 w-3" /> : i + 1}
                          </div>
                          <span className={`mt-0.5 hidden text-[9px] font-semibold sm:block ${i <= stepIndex ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < orderStatusSteps.length - 1 && (
                          <div className={`mx-1 h-0.5 flex-1 ${i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {items.length > 0 && (
                    <div className="mt-3 rounded-lg bg-gray-50 p-2.5">
                      {items.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-0.5 text-xs text-gray-600">
                          <span>
                            {it.quantity} {it.unit} · {it.productName}
                          </span>
                          <span className="font-semibold">{formatBRL(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== ENTREGAS ===== */}
        {tab === 'entregas' && (
          <div className="space-y-3">
            {activeDeliveries.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-500">Nenhuma entrega programada.</p>
            )}
            {activeDeliveries.map((d) => (
              <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-gray-900">{d.orderNumber}</p>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {d.status === 'a_preparar' ? 'Em preparação' : d.status === 'separado' ? 'Separado' : d.status === 'em_rota' ? 'Em rota' : d.status}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                    {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    {d.shift === 'manha' ? 'Manhã' : 'Tarde'}
                  </span>
                  <span>
                    {d.address} — {d.neighborhood}, {d.city}
                  </span>
                </div>
                {d.items && d.items.length > 0 && (
                  <div className="mt-2 rounded-lg bg-gray-50 p-2.5">
                    {(d.items as any[]).map((it, idx) => (
                      <p key={idx} className="text-xs text-gray-600">
                        • {it.expectedQty} {it.unit} · {it.productName}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===== PENDÊNCIAS ===== */}
        {tab === 'pendencias' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                  <Layers className="h-4 w-4" /> Vasilhames com você
                </p>
                <p className="mt-1 text-2xl font-black text-blue-900">{crateBalance}</p>
                <p className="text-[11px] text-blue-600">caixas/engradados a devolver</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <Wallet className="h-4 w-4" /> Em aberto
                </p>
                <p className="mt-1 text-2xl font-black text-amber-900">{formatBRL(openReceivables.reduce((a, r) => a + r.amount - (r.paidAmount || 0), 0))}</p>
                <p className="text-[11px] text-amber-600">{openReceivables.length} título(s)</p>
              </div>
            </div>

            {openReceivables.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                <h3 className="mb-2 text-sm font-bold text-gray-900">Títulos a pagar</h3>
                <div className="divide-y divide-gray-100">
                  {openReceivables.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{r.orderNumber || r.id}</p>
                        <p className="text-[11px] text-gray-500">Vence em {new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <p className="text-sm font-black text-gray-900">{formatBRL(r.amount - (r.paidAmount || 0))}</p>
                    </div>
                  ))}
                </div>
                {pixKey && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-bold text-emerald-800">Pague via PIX e envie o comprovante no WhatsApp:</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-xs font-semibold text-gray-800">{pixKey}</code>
                      <button onClick={copyPix} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barra do carrinho */}
      {cartCount > 0 && tab === 'catalogo' && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-3xl items-center justify-between rounded-2xl bg-emerald-600 px-5 py-3.5 text-white shadow-2xl transition-transform active:scale-[0.99] md:inset-x-auto md:right-8 md:w-96"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingCart className="h-5 w-5" />
            {cartCount} item(ns)
          </span>
          <span className="text-base font-black">{formatBRL(cartTotal)}</span>
        </button>
      )}

      {/* Modal do carrinho / checkout */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-gray-900">
                <ShoppingCart className="h-5 w-5 text-emerald-600" /> Seu pedido
              </h2>
              <button onClick={() => setCartOpen(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {cartItems.map((c) => (
                <div key={c.product.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{c.product.name}</p>
                    <p className="text-xs text-gray-500">
                      {c.qty} {c.product.unit} × {formatBRL(c.price)}
                      {c.isPromo && <span className="ml-1 rounded bg-rose-100 px-1 text-[9px] font-black text-rose-600">PROMO</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => addToCart(c.product.id, -1)} className="rounded bg-gray-100 p-1 text-gray-600 hover:bg-gray-200">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => addToCart(c.product.id, 1)} className="rounded bg-gray-100 p-1 text-gray-600 hover:bg-gray-200">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-20 text-right text-sm font-black text-gray-900">{formatBRL(c.subtotal)}</span>
                    <button onClick={() => addToCart(c.product.id, -c.qty)} className="text-gray-300 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 p-3">
              <span className="text-sm font-bold text-emerald-800">Total</span>
              <span className="text-xl font-black text-emerald-800">{formatBRL(cartTotal)}</span>
            </div>

            {/* Entrega */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Data da entrega</label>
                <input
                  type="date"
                  value={deliveryDate}
                  min={today}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Turno</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>
            </div>

            {/* Pagamento */}
            <div className="mt-4">
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Forma de pagamento</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPayment('pix')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold transition-all ${
                    payment === 'pix' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <QrCode className="h-4 w-4" /> PIX
                </button>
                <button
                  onClick={() => setPayment('cash')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-bold transition-all ${
                    payment === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Banknote className="h-4 w-4" /> À vista a combinar
                </button>
              </div>

              {payment === 'pix' && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  {pixKey ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-xs font-semibold text-gray-800">{pixKey}</code>
                      <button onClick={copyPix} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copiado!' : 'Copiar chave'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700">
                      Pague via PIX após a confirmação. A chave será informada pela distribuidora.
                    </p>
                  )}
                </div>
              )}
              {payment === 'cash' && (
                <p className="mt-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  O valor será combinado na entrega. Tenha o valor em mãos ou combine com o vendedor.
                </p>
              )}
            </div>

            <div className="mt-3">
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Observações (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ex.: entregar antes das 10h, tomate mais verde..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {checkoutError && (
              <p className="mt-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">{checkoutError}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={placing || noCustomerLink}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-lg hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
            >
              {placing ? 'Enviando pedido...' : `Enviar pedido · ${formatBRL(cartTotal)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
