import React, { createContext, useContext, useState, useEffect } from 'react';
import { playNotificationSound, isSelfNotification, markNotificationSeen } from '../utils/notify';
import { formatBRL } from '../utils/formatters';
import {
  UserRole,
  Customer,
  Product,
  CustomPrice,
  Promotion,
  Order,
  Delivery,
  CrateRecord,
  HarvestPlan,
  PurchaseRecord,
  Supplier,
  AccountsReceivable,
  AccountsPayable,
  Expense,
  CashMovement,
  MonthlyClosure,
  AIAuditLog,
  NotificationItem,
  OrderItem,
  PaymentMethod,
  PaymentTerm,
  DeliveryStatus,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_CUSTOM_PRICES,
  INITIAL_PROMOTIONS,
  INITIAL_SUPPLIERS,
  INITIAL_ORDERS,
  INITIAL_DELIVERIES,
  INITIAL_CRATES,
  INITIAL_HARVEST_PLANS,
  INITIAL_PURCHASES,
  INITIAL_RECEIVABLES,
  INITIAL_PAYABLES,
  INITIAL_EXPENSES,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_MONTHLY_CLOSURES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AI_LOGS,
} from '../data/initialData';

interface ProductNeed {
  productId: string;
  productName: string;
  unit: string;
  neededQty: number;
  availableQty: number;
  deficit: number;
  status: 'comprar' | 'colher' | 'suficiente';
  category: string;
}

interface AppContextType {
  // Navigation & Role
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  assistantInitialPrompt: string;
  setAssistantInitialPrompt: (prompt: string) => void;

  // Data collections
  products: Product[];
  customers: Customer[];
  customPrices: CustomPrice[];
  promotions: Promotion[];
  orders: Order[];
  deliveries: Delivery[];
  crates: CrateRecord[];
  harvestPlans: HarvestPlan[];
  purchases: PurchaseRecord[];
  suppliers: Supplier[];
  receivables: AccountsReceivable[];
  payables: AccountsPayable[];
  expenses: Expense[];
  cashMovements: CashMovement[];
  monthlyClosures: MonthlyClosure[];
  notifications: NotificationItem[];
  aiLogs: AIAuditLog[];

  // Helpers & Calculators
  getProductPriceForCustomer: (productId: string, customerId: string) => {
    price: number;
    originalPrice: number;
    isPromo: boolean;
    promoNotes?: string;
  };
  calculateProductNeeds: () => ProductNeed[];
  getCustomerCrateBalance: (customerId: string) => number;

  // Actions
  createOrder: (orderData: {
    customerId: string;
    deliveryDate: string;
    items: { productId: string; quantity: number }[];
    notes?: string;
    paymentMethod?: PaymentMethod;
    paymentTerm?: PaymentTerm;
  }) => Order;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  updateDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => void;
  setDeliveryAssignment: (deliveryId: string, driverProfileId: string, driverName: string) => void;
  confirmDelivery: (
    deliveryId: string,
    data: {
      deliveredItems: { productId: string; deliveredQty: number }[];
      grossWeight?: number;
      tareWeight?: number;
      cratesDelivered: number;
      cratesReturned: number;
      driverNotes?: string;
      issueReport?: string;
    }
  ) => void;

  createCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (customer: Customer) => void;

  setCustomerCustomPrice: (customerId: string, productId: string, price: number) => void;
  deleteCustomerCustomPrice: (id: string) => void;

  createPromotion: (promo: Omit<Promotion, 'id'>) => Promotion;
  togglePromotionActive: (promoId: string) => void;

  createProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (product: Product) => void;

  createPurchase: (
    supplierId: string,
    dueDate: string,
    items: { productId: string; quantity: number; unitCost: number }[]
  ) => PurchaseRecord;

  createHarvestPlan: (
    productId: string,
    neededQty: number,
    harvestQty: number,
    date: string,
    responsible: string,
    notes?: string,
    supplier?: { id: string; name: string }
  ) => HarvestPlan;
  updateHarvestStatus: (id: string, status: HarvestPlan['status']) => void;
  deleteHarvestPlan: (id: string) => void;

  createSupplier: (data: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (supplier: Supplier) => void;

  createExpense: (expense: Omit<Expense, 'id'>) => Expense;
  receivePayment: (receivableId: string, amount: number, paymentMethod: PaymentMethod) => void;
  payBill: (payableId: string, paymentMethod: PaymentMethod) => void;

  closeMonthPeriod: (month: string, notes?: string) => void;
  reopenMonthPeriod: (month: string) => void;

  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  logAIAudit: (entry: Omit<AIAuditLog, 'id' | 'timestamp'>) => AIAuditLog;
  executeAISuggestion: (action: any) => void;

  resetToInitialData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Reset único do cache local: quando a versão muda, limpa dados antigos
  // (ex.: dados de teste/demonstração) e recomeça limpo em todos os aparelhos.
  const DATA_VERSION = '2';
  if (typeof window !== 'undefined' && localStorage.getItem('hg_data_version') !== DATA_VERSION) {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('hg_') && key !== 'hg_data_version') localStorage.removeItem(key);
    }
    localStorage.setItem('hg_data_version', DATA_VERSION);
  }

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string>('');

  // Synchronize role view changes (e.g. driver opens driver-app view automatically)
  useEffect(() => {
    if (userRole === 'driver' && currentTab !== 'driver-app') {
      setCurrentTab('driver-app');
    }
  }, [userRole]);

  // State with LocalStorage fallbacks
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('hg_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('hg_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [customPrices, setCustomPrices] = useState<CustomPrice[]>(() => {
    const saved = localStorage.getItem('hg_custom_prices');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOM_PRICES;
  });

  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    const saved = localStorage.getItem('hg_promotions');
    return saved ? JSON.parse(saved) : INITIAL_PROMOTIONS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('hg_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    const saved = localStorage.getItem('hg_deliveries');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });

  const [crates, setCrates] = useState<CrateRecord[]>(() => {
    const saved = localStorage.getItem('hg_crates');
    return saved ? JSON.parse(saved) : INITIAL_CRATES;
  });

  const [harvestPlans, setHarvestPlans] = useState<HarvestPlan[]>(() => {
    const saved = localStorage.getItem('hg_harvest_plans');
    return saved ? JSON.parse(saved) : INITIAL_HARVEST_PLANS;
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    const saved = localStorage.getItem('hg_purchases');
    return saved ? JSON.parse(saved) : INITIAL_PURCHASES;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('hg_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [receivables, setReceivables] = useState<AccountsReceivable[]>(() => {
    const saved = localStorage.getItem('hg_receivables');
    return saved ? JSON.parse(saved) : INITIAL_RECEIVABLES;
  });

  const [payables, setPayables] = useState<AccountsPayable[]>(() => {
    const saved = localStorage.getItem('hg_payables');
    return saved ? JSON.parse(saved) : INITIAL_PAYABLES;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('hg_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => {
    const saved = localStorage.getItem('hg_cash_movements');
    return saved ? JSON.parse(saved) : INITIAL_CASH_MOVEMENTS;
  });

  const [monthlyClosures, setMonthlyClosures] = useState<MonthlyClosure[]>(() => {
    const saved = localStorage.getItem('hg_monthly_closures');
    return saved ? JSON.parse(saved) : INITIAL_MONTHLY_CLOSURES;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('hg_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [aiLogs, setAiLogs] = useState<AIAuditLog[]>(() => {
    const saved = localStorage.getItem('hg_ai_logs');
    return saved ? JSON.parse(saved) : INITIAL_AI_LOGS;
  });

  // Sincronização com o Supabase: o banco é a fonte da verdade. Na carga
  // inicial, SUBSTITUI sempre (mesmo com banco vazio) para nunca misturar
  // dados de teste locais com os dados reais da operação.
  useEffect(() => {
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      const remote = await liveSync.pullAll();
      if (!remote) return; // sem conexão/config: mantém o estado local
      setProducts(remote.products);
      setCustomers(remote.customers);
      setOrders(remote.orders);
      setDeliveries(remote.deliveries);
      setReceivables(remote.receivables);
      setCustomPrices(remote.customPrices);
      setPromotions(remote.promotions);
      setCrates(remote.crates);
    })();
  }, []);

  // Atualização periódica de pedidos/entregas/recebíveis: o painel acompanha
  // em tempo quase real o que o entregador faz em outro aparelho
  useEffect(() => {
    let cancelled = false;
    const pollData = async () => {
      const { liveSync } = await import('../services/liveSync');
      const remote = await liveSync.pullAll();
      if (cancelled || !remote) return;
      setOrders(remote.orders);
      setDeliveries(remote.deliveries);
      setReceivables(remote.receivables);
    };
    const poll = setInterval(pollData, 25000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pollData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Notificações remotas (staff): pull inicial + atualização a cada 45s
  useEffect(() => {
    let cancelled = false;
    const seenIds = new Set<string>();
    let firstSync = true;
    const syncNotifications = async () => {
      const { liveSync } = await import('../services/liveSync');
      if (!liveSync.isAvailable()) return;
      const remoteNotifs = await liveSync.pullNotifications('operador');
      if (cancelled || remoteNotifs.length === 0) return;
      // Alerta sonoro para notificações novas vindas de outros aparelhos
      const fresh = remoteNotifs.filter((n) => !seenIds.has(n.id) && !isSelfNotification(n.id));
      if (!firstSync && fresh.length > 0) playNotificationSound();
      firstSync = false;
      for (const n of fresh) seenIds.add(n.id);
      for (const n of remoteNotifs) seenIds.add(n.id);
      setNotifications((prev) => {
        const remoteIds = new Set(remoteNotifs.map((n) => n.id));
        const locals = prev.filter((n) => !remoteIds.has(n.id));
        const remoteItems: NotificationItem[] = remoteNotifs.map((rn) => ({
          id: rn.id,
          type: rn.type as NotificationItem['type'],
          title: rn.title,
          message: rn.message,
          date: new Date(rn.created_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          read: rn.read,
          actionTab: rn.action_tab || undefined,
        }));
        return [...remoteItems, ...locals];
      });
    };
    syncNotifications();
    const poll = setInterval(syncNotifications, 25000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('hg_products', JSON.stringify(products));
    localStorage.setItem('hg_customers', JSON.stringify(customers));
    localStorage.setItem('hg_custom_prices', JSON.stringify(customPrices));
    localStorage.setItem('hg_promotions', JSON.stringify(promotions));
    localStorage.setItem('hg_orders', JSON.stringify(orders));
    localStorage.setItem('hg_deliveries', JSON.stringify(deliveries));
    localStorage.setItem('hg_crates', JSON.stringify(crates));
    localStorage.setItem('hg_harvest_plans', JSON.stringify(harvestPlans));
    localStorage.setItem('hg_purchases', JSON.stringify(purchases));
    localStorage.setItem('hg_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('hg_receivables', JSON.stringify(receivables));
    localStorage.setItem('hg_payables', JSON.stringify(payables));
    localStorage.setItem('hg_expenses', JSON.stringify(expenses));
    localStorage.setItem('hg_cash_movements', JSON.stringify(cashMovements));
    localStorage.setItem('hg_monthly_closures', JSON.stringify(monthlyClosures));
    localStorage.setItem('hg_notifications', JSON.stringify(notifications));
    localStorage.setItem('hg_ai_logs', JSON.stringify(aiLogs));
  }, [
    products,
    customers,
    customPrices,
    promotions,
    orders,
    deliveries,
    crates,
    harvestPlans,
    purchases,
    suppliers,
    receivables,
    payables,
    expenses,
    cashMovements,
    monthlyClosures,
    notifications,
    aiLogs,
  ]);

  // Helper: Pricing with Customer Specific Price & Active Promotions
  const getProductPriceForCustomer = (productId: string, customerId: string) => {
    const product = products.find((p) => p.id === productId);
    const defaultPrice = product ? product.defaultPrice : 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // Check active promotion first
    const activePromo = promotions.find(
      (promo) =>
        promo.active &&
        promo.productId === productId &&
        (promo.customerId === 'all' || promo.customerId === customerId) &&
        todayStr >= promo.startDate &&
        todayStr <= promo.endDate
    );

    if (activePromo) {
      return {
        price: activePromo.promotionalPrice,
        originalPrice: defaultPrice,
        isPromo: true,
        promoNotes: activePromo.notes,
      };
    }

    // Check custom price
    const custom = customPrices.find((cp) => cp.customerId === customerId && cp.productId === productId);
    if (custom) {
      return {
        price: custom.price,
        originalPrice: defaultPrice,
        isPromo: false,
      };
    }

    return {
      price: defaultPrice,
      originalPrice: defaultPrice,
      isPromo: false,
    };
  };

  // Helper: Customer Crate balance calculation
  const getCustomerCrateBalance = (customerId: string): number => {
    const customerCrates = crates.filter((c) => c.customerId === customerId);
    return customerCrates.reduce((acc, curr) => acc + (curr.sent - curr.returned), 0);
  };

  // Helper: Product Needs Calculator (PRD §12, §14)
  const calculateProductNeeds = (): ProductNeed[] => {
    const needsMap = new Map<string, { needed: number; available: number }>();

    // 1. Calculate needed quantity from pending / active orders
    const pendingOrders = orders.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado');
    for (const ord of pendingOrders) {
      for (const item of ord.items) {
        const current = needsMap.get(item.productId) || { needed: 0, available: 0 };
        current.needed += item.quantity;
        needsMap.set(item.productId, current);
      }
    }

    // 2. Calculate available quantity from purchases and harvest plans
    for (const pur of purchases) {
      if (pur.status === 'pendente' || pur.status === 'recebido') {
        for (const item of pur.items) {
          const current = needsMap.get(item.productId) || { needed: 0, available: 0 };
          current.available += item.quantity;
          needsMap.set(item.productId, current);
        }
      }
    }

    for (const harv of harvestPlans) {
      const current = needsMap.get(harv.productId) || { needed: 0, available: 0 };
      current.available += harv.harvestQty;
      needsMap.set(harv.productId, current);
    }

    // Convert to list
    const result: ProductNeed[] = [];
    products.forEach((prod) => {
      const counts = needsMap.get(prod.id) || { needed: 0, available: 0 };
      const deficit = Math.max(0, counts.needed - counts.available);

      let status: 'comprar' | 'colher' | 'suficiente' = 'suficiente';
      if (deficit > 0) {
        // If product is folhagem/tempero or produced internally, prefer harvest
        if (prod.category === 'folhagens' || prod.category === 'temperos' || prod.origin.toLowerCase().includes('horta')) {
          status = 'colher';
        } else {
          status = 'comprar';
        }
      }

      result.push({
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        neededQty: counts.needed,
        availableQty: counts.available,
        deficit,
        status,
        category: prod.category,
      });
    });

    return result.sort((a, b) => b.deficit - a.deficit);
  };

  // Helper: Due Date Calculator based on Payment Term
  const calculateDueDate = (fromDateStr: string, term: PaymentTerm): string => {
    const d = new Date(fromDateStr);
    switch (term) {
      case 'sight':
        return fromDateStr;
      case '7d':
        d.setDate(d.getDate() + 7);
        break;
      case '15d':
        d.setDate(d.getDate() + 15);
        break;
      case '30d':
      case 'monthly':
        d.setDate(d.getDate() + 30);
        break;
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'biweekly':
        d.setDate(d.getDate() + 14);
        break;
      default:
        d.setDate(d.getDate() + 7);
    }
    return d.toISOString().split('T')[0];
  };

  // Action: Create Order with automatic delivery and accounts receivable creation
  const createOrder = (orderData: {
    customerId: string;
    deliveryDate: string;
    items: { productId: string; quantity: number }[];
    notes?: string;
    paymentMethod?: PaymentMethod;
    paymentTerm?: PaymentTerm;
  }): Order => {
    const customer = customers.find((c) => c.id === orderData.customerId);
    if (!customer) throw new Error('Cliente não encontrado');

    const orderSeq = orders.length + 104;
    const orderNumber = `PED-${orderSeq}`;
    const orderId = `ord-${orderSeq}`;
    const deliveryId = `del-${orderSeq + 100}`;
    const receivableId = `rec-${orderSeq + 200}`;
    const today = new Date().toISOString().split('T')[0];

    const finalPaymentMethod = orderData.paymentMethod || customer.paymentMethod;
    const finalPaymentTerm = orderData.paymentTerm || customer.paymentTerm;

    // Process items with customer-specific pricing & active promotions
    let subtotal = 0;
    const orderItems: OrderItem[] = orderData.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const priceInfo = getProductPriceForCustomer(item.productId, customer.id);
      const lineSubtotal = item.quantity * priceInfo.price;
      subtotal += lineSubtotal;

      return {
        productId: item.productId,
        productName: product ? product.name : 'Produto Desconhecido',
        unit: product ? product.unit : 'cx',
        quantity: item.quantity,
        unitPrice: priceInfo.price,
        originalPrice: priceInfo.originalPrice,
        isPromo: priceInfo.isPromo,
        subtotal: lineSubtotal,
      };
    });

    const total = subtotal;

    // 1. New Order Record
    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      date: today,
      deliveryDate: orderData.deliveryDate,
      status: 'pendente',
      items: orderItems,
      subtotal,
      discount: 0,
      total,
      paymentMethod: finalPaymentMethod,
      paymentTerm: finalPaymentTerm,
      paymentStatus: 'pendente',
      notes: orderData.notes,
      deliveryId,
      receivableId,
    };

    // 2. Automatically generate Delivery record (PRD §16)
    const newDelivery: Delivery = {
      id: deliveryId,
      orderId,
      orderNumber,
      customerId: customer.id,
      customerName: customer.name,
      address: `${customer.address.street}, ${customer.address.number}`,
      neighborhood: customer.address.neighborhood,
      city: customer.address.city,
      driverName: 'Carlos Silveira',
      vehicle: 'Caminhão Iveco Daily (Placa: HFG-8921)',
      date: orderData.deliveryDate,
      shift: 'manha',
      status: 'a_preparar',
      items: orderItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        expectedQty: i.quantity,
        unit: i.unit,
      })),
      cratesDelivered: orderItems.reduce((acc, curr) => (curr.unit === 'cx' ? acc + curr.quantity : acc), 0),
      cratesReturned: 0,
      notes: orderData.notes,
    };

    // 3. Automatically generate Accounts Receivable (PRD §21)
    const dueDate = calculateDueDate(orderData.deliveryDate, finalPaymentTerm);
    const newReceivable: AccountsReceivable = {
      id: receivableId,
      customerId: customer.id,
      customerName: customer.name,
      orderId,
      orderNumber,
      amount: total,
      dueDate,
      status: 'aberto',
      paymentMethod: finalPaymentMethod,
      notes: `Referente ao pedido ${orderNumber}`,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setDeliveries((prev) => [newDelivery, ...prev]);
    setReceivables((prev) => [newReceivable, ...prev]);

    // Push notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type: 'order',
      title: 'Novo Pedido Criado',
      message: `${customer.name} - ${orderNumber} no valor de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}.`,
      date: 'Agora mesmo',
      read: false,
      actionTab: 'orders',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Persistir no Supabase (silencioso; o app continua funcionando offline)
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      const notifId = genNotificationId();
      markNotificationSeen(notifId);
      await liveSync.pushOrder(newOrder, newDelivery, newReceivable);
      await liveSync.pushNotification({
        id: notifId,
        audience: 'operador',
        type: 'order',
        title: 'Novo Pedido Criado',
        message: newNotif.message,
        actionTab: 'orders',
      });
    })();

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    const order = orders.find((o) => o.id === orderId);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

    // Persistir no Supabase
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushOrderStatus(orderId, status);
      // A entrega vinculada acompanha o status do pedido (nos dois aparelhos)
      const linked = deliveries.find((d) => d.orderId === orderId);
      const deliveryMap: Partial<Record<Order['status'], DeliveryStatus>> = {
        em_separacao: 'a_preparar',
        pronto: 'separado',
        em_rota: 'em_rota',
        entregue: 'entregue',
      };
      const ds = deliveryMap[status];
      if (linked && ds) {
        await liveSync.pushDeliveryStatus(linked.id, ds);
      }
    })();

    // Synchronize delivery status
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.orderId === orderId) {
          let deliveryStatus: DeliveryStatus = d.status;
          if (status === 'em_separacao') deliveryStatus = 'a_preparar';
          if (status === 'pronto') deliveryStatus = 'separado';
          if (status === 'em_rota') deliveryStatus = 'em_rota';
          if (status === 'entregue') deliveryStatus = 'entregue';
          return { ...d, status: deliveryStatus };
        }
        return d;
      })
    );

    // Notificar comprador + operador sobre a mudança de status do pedido
    if (order && status !== 'pendente') {
      const statusInfo: Record<string, { title: string; msgBuyer: string; msgOp: string }> = {
        em_separacao: {
          title: 'Pedido em separação',
          msgBuyer: `Seu pedido ${order.orderNumber} está sendo separado.`,
          msgOp: `Pedido ${order.orderNumber} (${order.customerName}) entrou em separação.`,
        },
        pronto: {
          title: 'Pedido pronto',
          msgBuyer: `Seu pedido ${order.orderNumber} está pronto e aguarda a entrega.`,
          msgOp: `Pedido ${order.orderNumber} (${order.customerName}) pronto para carregamento.`,
        },
        em_rota: {
          title: 'Pedido em rota',
          msgBuyer: `Seu pedido ${order.orderNumber} saiu para entrega.`,
          msgOp: `Pedido ${order.orderNumber} (${order.customerName}) em rota de entrega.`,
        },
        entregue: {
          title: 'Pedido entregue',
          msgBuyer: `Seu pedido ${order.orderNumber} foi entregue. Bom aproveito!`,
          msgOp: `Pedido ${order.orderNumber} (${order.customerName}) entregue.`,
        },
      };
      const info = statusInfo[status];
      if (info) {
        const idOp = genNotificationId();
        const idBuyer = genNotificationId();
        markNotificationSeen(idOp);
        markNotificationSeen(idBuyer);
        setNotifications((prev) => [
          {
            id: idOp,
            type: 'order',
            title: info.title,
            message: info.msgOp,
            date: 'Agora mesmo',
            read: false,
            actionTab: 'orders',
          },
          ...prev,
        ]);
        (async () => {
          const { liveSync } = await import('../services/liveSync');
          await liveSync.pushNotification({
            id: idOp,
            audience: 'operador',
            type: 'order',
            title: info.title,
            message: info.msgOp,
            actionTab: 'orders',
          });
          await liveSync.pushNotification({
            id: idBuyer,
            audience: 'comprador',
            customerId: order.customerId,
            type: 'order',
            title: info.title,
            message: info.msgBuyer,
          });
        })();
      }
    }

    // Baixa do recebível ao finalizar a entrega:
    // PIX = baixa automática; à vista = operador confirma se recebeu agora
    if (status === 'entregue' && order) {
      const rec = receivables.find(
        (r) =>
          r.status !== 'pago' &&
          (r.orderId === orderId || (!!r.orderNumber && r.orderNumber === order.orderNumber))
      );
      if (rec) {
        if (
          order.paymentMethod === 'pix' ||
          window.confirm(
            `Pedido ${order.orderNumber} entregue.\n\nRecebeu ${formatBRL(rec.amount)} do cliente ${order.customerName} agora?\n\nOK = recebeu na entrega (baixa no financeiro)\nCancelar = ainda não recebeu`
          )
        ) {
          receivePayment(rec.id, rec.amount, order.paymentMethod);
        }
      }
    }
  };

  const updateDeliveryStatus = (deliveryId: string, status: DeliveryStatus) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === deliveryId ? { ...d, status } : d))
    );

    // Persistir no Supabase (entregador inicia/finaliza de outro aparelho)
    const delivery = deliveries.find((d) => d.id === deliveryId);
    // Status da entrega reflete no pedido (comprador acompanha na linha do tempo)
    const orderStatusByDelivery: Partial<Record<DeliveryStatus, Order['status']>> = {
      a_preparar: 'em_separacao',
      separado: 'pronto',
      em_rota: 'em_rota',
      entregue: 'entregue',
    };
    (async () => {
      try {
        const { liveSync } = await import('../services/liveSync');
        await liveSync.pushDeliveryStatus(deliveryId, status);
        const os = delivery?.orderId ? orderStatusByDelivery[status] : undefined;
        if (delivery?.orderId && os) {
          await liveSync.pushOrderStatus(delivery.orderId, os);
          setOrders((prev) =>
            prev.map((o) => (o.id === delivery.orderId ? { ...o, status: os } : o))
          );
        }
      } catch {
        // fallback: permanece somente local
      }
    })();

    // Notificar comprador + distribuidor quando a entrega sai para rota
    if (status === 'em_rota' && delivery) {
      notifyDeliveryEvent(delivery, 'em_rota');
    }
  };

  // Gera id único para notificações (compatível com UUID do Supabase)
  const genNotificationId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `notif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // Avisos de entrega: operador (distribuidor) e comprador, sincronizados no Supabase
  const notifyDeliveryEvent = (
    delivery: Delivery,
    kind: 'em_rota' | 'entregue' | 'problema'
  ) => {
    const config = {
      em_rota: {
        type: 'delivery' as const,
        title: 'Entrega em rota',
        msgOp: `Entrega do pedido ${delivery.orderNumber} para ${delivery.customerName} saiu para entrega com ${delivery.driverName}.`,
        msgBuyer: `Seu pedido ${delivery.orderNumber} saiu para entrega! O entregador ${delivery.driverName} está a caminho.`,
      },
      entregue: {
        type: 'delivery' as const,
        title: 'Entrega concluída',
        msgOp: `Entrega do pedido ${delivery.orderNumber} para ${delivery.customerName} foi concluída com sucesso.`,
        msgBuyer: `Seu pedido ${delivery.orderNumber} foi entregue. Bom aproveito!`,
      },
      problema: {
        type: 'issue' as const,
        title: 'Problema na entrega',
        msgOp: `O entregador reportou um problema na entrega do pedido ${delivery.orderNumber} (${delivery.customerName}).`,
        msgBuyer: `Ocorreu um problema na entrega do seu pedido ${delivery.orderNumber}. A distribuidora entrará em contato.`,
      },
    }[kind];

    const idOp = genNotificationId();
    const idBuyer = genNotificationId();
    markNotificationSeen(idOp);
    markNotificationSeen(idBuyer);

    setNotifications((prev) => [
      {
        id: idOp,
        type: config.type,
        title: config.title,
        message: config.msgOp,
        date: 'Agora mesmo',
        read: false,
        actionTab: 'deliveries',
      },
      ...prev,
    ]);

    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushNotification({
        id: idOp,
        audience: 'operador',
        type: config.type,
        title: config.title,
        message: config.msgOp,
        actionTab: 'deliveries',
      });
      await liveSync.pushNotification({
        id: idBuyer,
        audience: 'comprador',
        customerId: delivery.customerId,
        type: config.type,
        title: config.title,
        message: config.msgBuyer,
      });
    })();
  };

  // Delegar entrega a um entregador (perfil autenticado)
  const setDeliveryAssignment = (deliveryId: string, driverProfileId: string, driverName: string) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId ? { ...d, assignedDriverId: driverProfileId, driverName } : d
      )
    );

    // Persistir no Supabase (silencioso; o cache local continua funcionando)
    (async () => {
      try {
        const { getSupabaseClient } = await import('../lib/supabase');
        const client = getSupabaseClient();
        if (!client) return;
        await client
          .from('deliveries')
          .update({ assigned_driver_id: driverProfileId, driver_name: driverName })
          .eq('id', deliveryId);
      } catch {
        // fallback: permanece somente local
      }
    })();
  };

  // Action: Confirm Delivery with tare/net weight and crate balance updates (PRD §18, §19, §20)
  const confirmDelivery = (
    deliveryId: string,
    data: {
      deliveredItems: { productId: string; deliveredQty: number }[];
      grossWeight?: number;
      tareWeight?: number;
      cratesDelivered: number;
      cratesReturned: number;
      driverNotes?: string;
      issueReport?: string;
    }
  ) => {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;

    const netWeight =
      data.grossWeight && data.tareWeight ? Math.max(0, data.grossWeight - data.tareWeight) : undefined;

    const nowISO = new Date().toISOString();

    // 1. Update delivery
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          return {
            ...d,
            status: data.issueReport ? 'problema' : 'entregue',
            grossWeight: data.grossWeight,
            tareWeight: data.tareWeight,
            netWeight,
            cratesDelivered: data.cratesDelivered,
            cratesReturned: data.cratesReturned,
            driverNotes: data.driverNotes,
            issueReport: data.issueReport,
            completedAt: nowISO,
            items: d.items.map((it) => {
              const matched = data.deliveredItems.find((di) => di.productId === it.productId);
              return {
                ...it,
                deliveredQty: matched !== undefined ? matched.deliveredQty : it.expectedQty,
              };
            }),
          };
        }
        return d;
      })
    );

    // 2. Update Order status
    if (delivery.orderId) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === delivery.orderId
            ? { ...o, status: data.issueReport ? 'em_rota' : 'entregue' }
            : o
        )
      );
    }

    // 2b. PIX: baixa automática do recebível quando o entregador finaliza a entrega
    // (à vista fica em aberto para o operador confirmar no financeiro)
    if (!data.issueReport && delivery.orderId) {
      const linkedOrder = orders.find((o) => o.id === delivery.orderId);
      const rec = receivables.find(
        (r) =>
          r.status !== 'pago' &&
          (r.orderId === delivery.orderId ||
            (!!r.orderNumber && r.orderNumber === delivery.orderNumber))
      );
      if (linkedOrder && rec && linkedOrder.paymentMethod === 'pix') {
        receivePayment(rec.id, rec.amount, 'pix');
        // Persistir a baixa no Supabase (RPC valida no servidor quem pode baixar:
        // entregador da própria entrega, ou master/operador)
        (async () => {
          try {
            const { getSupabaseClient } = await import('../lib/supabase');
            const client = getSupabaseClient();
            if (client && delivery.orderId) {
              await client.rpc('fn_baixar_recebivel_entrega', {
                p_order_id: delivery.orderId,
                p_amount: rec.amount,
                p_method: 'pix',
              });
            }
          } catch {
            // sem conexão: baixa permanece local
          }
        })();
        const idOp = genNotificationId();
        markNotificationSeen(idOp);
        setNotifications((prev) => [
          {
            id: idOp,
            type: 'financial',
            title: 'Pagamento PIX recebido',
            message: `Entrega do pedido ${delivery.orderNumber} (${delivery.customerName}) finalizada. PIX de ${formatBRL(rec.amount)} baixado automaticamente.`,
            date: 'Agora mesmo',
            read: false,
            actionTab: 'finance',
          },
          ...prev,
        ]);
      }
    }

    // 3. Register Crate Movement (Vasilhames)
    if (data.cratesDelivered > 0 || data.cratesReturned > 0) {
      const crateEntry: CrateRecord = {
        id: `crate-${Date.now()}`,
        customerId: delivery.customerId,
        customerName: delivery.customerName,
        deliveryId,
        orderId: delivery.orderId,
        type: 'caixa_plastica_k',
        sent: data.cratesDelivered,
        returned: data.cratesReturned,
        balance: data.cratesDelivered - data.cratesReturned,
        date: nowISO.split('T')[0],
        notes: `Entrega ${delivery.orderNumber}. Devolvidas: ${data.cratesReturned}. Enviadas: ${data.cratesDelivered}.`,
      };
      setCrates((prev) => [crateEntry, ...prev]);
      (async () => {
        const { liveSync } = await import('../services/liveSync');
        await liveSync.pushCrate(crateEntry);
      })();
    }

    // Persistir no Supabase
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushDeliveryStatus(deliveryId, data.issueReport ? 'problema' : 'entregue', {
        grossWeight: data.grossWeight,
        tareWeight: data.tareWeight,
        netWeight,
        cratesReturned: data.cratesReturned,
        issueReport: data.issueReport,
        driverNotes: data.driverNotes,
      });
      if (delivery.orderId) {
        await liveSync.pushOrderStatus(delivery.orderId, data.issueReport ? 'em_rota' : 'entregue');
      }
    })();

    // Notificar comprador + distribuidor sobre a conclusão da entrega
    notifyDeliveryEvent(delivery, data.issueReport ? 'problema' : 'entregue');
  };

  // Customer Management
  const createCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushCustomer(newCustomer);
    })();
    return newCustomer;
  };

  const updateCustomer = (updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushCustomer(updated);
    })();
  };

  // Custom Prices
  const setCustomerCustomPrice = (customerId: string, productId: string, price: number) => {
    const cp: CustomPrice = {
      id: `cp-${Date.now()}`,
      customerId,
      productId,
      price,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setCustomPrices((prev) => [...prev.filter((c) => !(c.customerId === customerId && c.productId === productId)), cp]);
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushCustomPrice(cp);
    })();
  };

  const deleteCustomerCustomPrice = (id: string) => {
    setCustomPrices((prev) => prev.filter((cp) => cp.id !== id));
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.deleteCustomPrice(id);
    })();
  };

  // Promotions
  const createPromotion = (promoData: Omit<Promotion, 'id'>): Promotion => {
    const newPromo: Promotion = {
      ...promoData,
      id: `promo-${Date.now()}`,
    };
    setPromotions((prev) => [newPromo, ...prev]);
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushPromotion(newPromo);
    })();
    return newPromo;
  };

  const togglePromotionActive = (promoId: string) => {
    setPromotions((prev) => {
      const updated = prev.map((p) => (p.id === promoId ? { ...p, active: !p.active } : p));
      const changed = updated.find((p) => p.id === promoId);
      if (changed) {
        (async () => {
          const { liveSync } = await import('../services/liveSync');
          await liveSync.updatePromotion(promoId, changed.active);
        })();
      }
      return updated;
    });
  };

  // Products
  const createProduct = (productData: Omit<Product, 'id'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [...prev, newProduct]);
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushProduct(newProduct);
    })();
    return newProduct;
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.pushProduct(updated);
    })();
  };

  // Purchases & Accounts Payable
  const createPurchase = (
    supplierId: string,
    dueDate: string,
    items: { productId: string; quantity: number; unitCost: number }[]
  ): PurchaseRecord => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    const purchaseSeq = purchases.length + 90;
    const purchaseNumber = `COM-0${purchaseSeq}`;
    const purchaseId = `pur-${purchaseSeq}`;
    const payableId = `pay-${purchaseSeq + 300}`;
    const today = new Date().toISOString().split('T')[0];

    let total = 0;
    const purchaseItems = items.map((it) => {
      const product = products.find((p) => p.id === it.productId);
      const lineTotal = it.quantity * it.unitCost;
      total += lineTotal;
      return {
        productId: it.productId,
        productName: product ? product.name : 'Produto',
        quantity: it.quantity,
        unit: product ? product.unit : 'cx',
        unitCost: it.unitCost,
        total: lineTotal,
      };
    });

    const newPurchase: PurchaseRecord = {
      id: purchaseId,
      purchaseNumber,
      supplierId,
      supplierName: supplier ? supplier.name : 'Fornecedor',
      date: today,
      dueDate,
      items: purchaseItems,
      total,
      status: 'recebido',
      payableId,
    };

    // Auto generate Accounts Payable (PRD §22)
    const newPayable: AccountsPayable = {
      id: payableId,
      supplierOrPayee: supplier ? supplier.name : 'Fornecedor',
      category: 'compra_hortifruti',
      description: `Compra ${purchaseNumber} (${purchaseItems.length} itens)`,
      purchaseId,
      amount: total,
      dueDate,
      status: 'aberto',
      paymentMethod: 'pix',
    };

    setPurchases((prev) => [newPurchase, ...prev]);
    setPayables((prev) => [newPayable, ...prev]);

    return newPurchase;
  };

  // Harvest Planning (PRD §13)
  const createHarvestPlan = (
    productId: string,
    neededQty: number,
    harvestQty: number,
    date: string,
    responsible: string,
    notes?: string,
    supplier?: { id: string; name: string }
  ): HarvestPlan => {
    const product = products.find((p) => p.id === productId);
    const newPlan: HarvestPlan = {
      id: `harv-${Date.now()}`,
      productId,
      productName: product ? product.name : 'Produto',
      unit: product ? product.unit : 'cx',
      neededQty,
      harvestQty,
      date,
      responsible,
      status: 'pendente',
      notes,
      supplierId: supplier?.id,
      supplierName: supplier?.name,
    };
    setHarvestPlans((prev) => [newPlan, ...prev]);
    return newPlan;
  };

  const updateHarvestStatus = (id: string, status: HarvestPlan['status']) => {
    setHarvestPlans((prev) => prev.map((h) => (h.id === id ? { ...h, status } : h)));
  };

  const deleteHarvestPlan = (id: string) => {
    setHarvestPlans((prev) => prev.filter((h) => h.id !== id));
  };

  // Suppliers
  const createSupplier = (data: Omit<Supplier, 'id'>): Supplier => {
    const newSupplier: Supplier = { ...data, id: `sup-${Date.now()}` };
    setSuppliers((prev) => [newSupplier, ...prev]);
    return newSupplier;
  };

  const updateSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? supplier : s)));
  };

  // Expenses & Cash Flow
  const createExpense = (expenseData: Omit<Expense, 'id'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);

    // Cash movement out
    const cashMove: CashMovement = {
      id: `mov-${Date.now()}`,
      date: expenseData.date,
      type: 'saida',
      category: expenseData.category,
      description: expenseData.description,
      amount: expenseData.amount,
      referenceId: newExpense.id,
    };
    setCashMovements((prev) => [cashMove, ...prev]);

    return newExpense;
  };

  const receivePayment = (receivableId: string, amount: number, paymentMethod: PaymentMethod) => {
    const today = new Date().toISOString().split('T')[0];

    setReceivables((prev) =>
      prev.map((r) => {
        if (r.id === receivableId) {
          const isFull = amount >= r.amount;
          return {
            ...r,
            status: isFull ? 'pago' : 'parcial',
            paidAmount: (r.paidAmount || 0) + amount,
            paidDate: today,
            paymentMethod,
          };
        }
        return r;
      })
    );

    const rec = receivables.find((r) => r.id === receivableId);
    const cashMove: CashMovement = {
      id: `mov-${Date.now()}`,
      date: today,
      type: 'entrada',
      category: 'recebimento_venda',
      description: `Recebimento ${rec?.customerName || 'Cliente'} (${rec?.orderNumber || ''})`,
      amount,
      referenceId: receivableId,
    };
    setCashMovements((prev) => [cashMove, ...prev]);
  };

  const payBill = (payableId: string, paymentMethod: PaymentMethod) => {
    const today = new Date().toISOString().split('T')[0];
    const bill = payables.find((p) => p.id === payableId);
    if (!bill) return;

    setPayables((prev) =>
      prev.map((p) => (p.id === payableId ? { ...p, status: 'pago', paidDate: today, paymentMethod } : p))
    );

    const cashMove: CashMovement = {
      id: `mov-${Date.now()}`,
      date: today,
      type: 'saida',
      category: bill.category,
      description: `Pagamento ${bill.supplierOrPayee} - ${bill.description}`,
      amount: bill.amount,
      referenceId: payableId,
    };
    setCashMovements((prev) => [cashMove, ...prev]);
  };

  // Monthly Closure (PRD §26)
  const closeMonthPeriod = (month: string, notes?: string) => {
    const nowISO = new Date().toISOString();

    // Compute metrics for month
    const monthOrders = orders.filter((o) => o.date.startsWith(month));
    const grossRevenue = monthOrders.reduce((acc, curr) => acc + curr.total, 0);

    const monthCashIn = cashMovements
      .filter((m) => m.date.startsWith(month) && m.type === 'entrada')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthPurchases = purchases
      .filter((p) => p.date.startsWith(month))
      .reduce((acc, curr) => acc + curr.total, 0);

    const monthExpenses = expenses
      .filter((e) => e.date.startsWith(month))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const openRec = receivables
      .filter((r) => r.dueDate.startsWith(month) && r.status === 'aberto')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const openPay = payables
      .filter((p) => p.dueDate.startsWith(month) && p.status === 'aberto')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const netResult = monthCashIn - (monthPurchases + monthExpenses);

    const newClosure: MonthlyClosure = {
      id: `clos-${month}`,
      month,
      closedAt: nowISO,
      closedBy: 'Proprietário Geral',
      status: 'fechado',
      grossRevenue,
      totalReceived: monthCashIn,
      totalPurchases: monthPurchases,
      totalExpenses: monthExpenses,
      openReceivables: openRec,
      openPayables: openPay,
      netResult,
      notes: notes || `Período ${month} fechado com sucesso pelo administrador.`,
    };

    setMonthlyClosures((prev) => {
      const filtered = prev.filter((c) => c.month !== month);
      return [newClosure, ...filtered];
    });
  };

  const reopenMonthPeriod = (month: string) => {
    setMonthlyClosures((prev) =>
      prev.map((c) => (c.month === month ? { ...c, status: 'aberto', closedAt: undefined } : c))
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    // Sincronizar "lida" no Supabase (multi-aparelho)
    (async () => {
      const { liveSync } = await import('../services/liveSync');
      await liveSync.markNotificationRead(id);
    })();
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const logAIAudit = (entry: Omit<AIAuditLog, 'id' | 'timestamp'>): AIAuditLog => {
    const newLog: AIAuditLog = {
      ...entry,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setAiLogs((prev) => [newLog, ...prev]);
    return newLog;
  };

  const executeAISuggestion = (action: any) => {
    if (!action) return;
    const data = action.data || {};
    const today = new Date().toISOString().split('T')[0];

    switch (action.type) {
      // Delegar entrega para entregador (valida que a entrega existe)
      case 'EXECUTE_ASSIGN_DELIVERY': {
        const delivery = deliveries.find((d) => d.id === data.deliveryId);
        if (delivery && data.driverProfileId && data.driverName) {
          setDeliveryAssignment(delivery.id, data.driverProfileId, data.driverName);
        }
        setCurrentTab('deliveries');
        break;
      }
      // Criar plano de colheita (valida que o produto existe)
      case 'EXECUTE_CREATE_HARVEST': {
        const product = products.find((p) => p.id === data.productId);
        if (product && Number(data.harvestQty) > 0) {
          createHarvestPlan(
            product.id,
            Number(data.neededQty) || Number(data.harvestQty),
            Number(data.harvestQty),
            data.date || today,
            data.responsible || 'Assistente IA',
            data.notes
          );
        }
        setCurrentTab('planning');
        break;
      }
      // Mudar status de pedido (valida pedido e status)
      case 'EXECUTE_ORDER_STATUS': {
        const validStatus = ['pendente', 'em_separacao', 'pronto', 'em_rota', 'entregue', 'cancelado'];
        if (
          data.orderId &&
          orders.some((o) => o.id === data.orderId) &&
          validStatus.includes(data.status)
        ) {
          updateOrderStatus(data.orderId, data.status);
        }
        setCurrentTab('orders');
        break;
      }
      // Registrar recebimento (valida conta e valor)
      case 'EXECUTE_RECEIVE_PAYMENT': {
        if (
          data.receivableId &&
          receivables.some((r) => r.id === data.receivableId) &&
          Number(data.amount) > 0
        ) {
          receivePayment(data.receivableId, Number(data.amount), data.paymentMethod || 'pix');
        }
        setCurrentTab('finance');
        break;
      }
      default:
        if (action.tab) {
          setCurrentTab(action.tab);
        }
    }
  };

  const resetToInitialData = () => {
    setProducts(INITIAL_PRODUCTS);
    setCustomers(INITIAL_CUSTOMERS);
    setCustomPrices(INITIAL_CUSTOM_PRICES);
    setPromotions(INITIAL_PROMOTIONS);
    setOrders(INITIAL_ORDERS);
    setDeliveries(INITIAL_DELIVERIES);
    setCrates(INITIAL_CRATES);
    setHarvestPlans(INITIAL_HARVEST_PLANS);
    setPurchases(INITIAL_PURCHASES);
    setSuppliers(INITIAL_SUPPLIERS);
    setReceivables(INITIAL_RECEIVABLES);
    setPayables(INITIAL_PAYABLES);
    setExpenses(INITIAL_EXPENSES);
    setCashMovements(INITIAL_CASH_MOVEMENTS);
    setMonthlyClosures(INITIAL_MONTHLY_CLOSURES);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAiLogs(INITIAL_AI_LOGS);
    localStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        userRole,
        setUserRole,
        selectedCustomerId,
        setSelectedCustomerId,
        isAssistantOpen,
        setIsAssistantOpen,
        assistantInitialPrompt,
        setAssistantInitialPrompt,

        products,
        customers,
        customPrices,
        promotions,
        orders,
        deliveries,
        crates,
        harvestPlans,
        purchases,
        suppliers,
        receivables,
        payables,
        expenses,
        cashMovements,
        monthlyClosures,
        notifications,
        aiLogs,

        getProductPriceForCustomer,
        calculateProductNeeds,
        getCustomerCrateBalance,

        createOrder,
        updateOrderStatus,
        updateDeliveryStatus,
        setDeliveryAssignment,
        confirmDelivery,

        createCustomer,
        updateCustomer,
        setCustomerCustomPrice,
        deleteCustomerCustomPrice,

        createPromotion,
        togglePromotionActive,

        createProduct,
        updateProduct,

        createPurchase,
        createHarvestPlan,
        updateHarvestStatus,
        deleteHarvestPlan,

        createSupplier,
        updateSupplier,

        createExpense,
        receivePayment,
        payBill,

        closeMonthPeriod,
        reopenMonthPeriod,

        markNotificationAsRead,
        clearAllNotifications,

        logAIAudit,
        executeAISuggestion,
        resetToInitialData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
