export type UserRole = 'admin' | 'operator' | 'driver' | 'accountant';

// Perfis de acesso real (Supabase Auth)
export type AppRole = 'master' | 'operador' | 'entregador' | 'comprador';

export interface AppProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  customer_id: string | null;
  driver_name: string | null;
  status: 'ativo' | 'pendente' | 'bloqueado';
  created_by: string | null;
  created_at: string;
}

export interface CustomerAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
}

export type PaymentMethod = 'pix' | 'boleto' | 'cash' | 'credit' | 'transfer';
export type PaymentTerm = 'sight' | '7d' | '15d' | '30d' | 'weekly' | 'biweekly' | 'monthly';

export interface Customer {
  id: string;
  name: string;
  tradeName?: string;
  document: string; // CPF or CNPJ
  phone: string;
  whatsapp: string;
  address: CustomerAddress;
  status: 'active' | 'inactive';
  paymentMethod: PaymentMethod;
  paymentTerm: PaymentTerm;
  creditLimit: number;
  commercialCondition: string;
  notes?: string;
  createdAt: string;
}

export interface CustomPrice {
  id: string;
  customerId: string;
  productId: string;
  price: number;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  customerId: string; // 'all' for all clients or specific customerId
  productId: string;
  promotionalPrice: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  minQuantity?: number;
  notes?: string;
  active: boolean;
}

export type ProductCategory = 
  | 'frutas' 
  | 'legumes' 
  | 'verduras' 
  | 'folhagens' 
  | 'temperos' 
  | 'tuberculos' 
  | 'outros';

export type ProductUnit = 'kg' | 'cx' | 'un' | 'saco' | 'bandeja' | 'duzia';
export type ProductSalesType = 'peso' | 'unidade' | 'caixa';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  salesType: ProductSalesType;
  defaultPrice: number;
  avgCost: number;
  defaultSupplierId?: string;
  origin: string;
  notes?: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
}

export interface OrderItem {
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  isPromo?: boolean;
  subtotal: number;
}

export type OrderStatus = 
  | 'pendente' 
  | 'em_separacao' 
  | 'pronto' 
  | 'em_rota' 
  | 'entregue' 
  | 'cancelado';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  deliveryDate: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentTerm: PaymentTerm;
  paymentStatus: 'pendente' | 'pago' | 'parcial';
  notes?: string;
  deliveryId?: string;
  receivableId?: string;
}

export type DeliveryStatus = 
  | 'a_preparar' 
  | 'separado' 
  | 'em_rota' 
  | 'entregue' 
  | 'problema';

export interface DeliveryItem {
  productId: string;
  productName: string;
  expectedQty: number;
  deliveredQty?: number;
  unit: ProductUnit;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  address: string;
  neighborhood: string;
  city: string;
  driverName: string;
  vehicle: string;
  date: string;
  shift: 'manha' | 'tarde';
  status: DeliveryStatus;
  items: DeliveryItem[];
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  cratesDelivered: number;
  cratesReturned: number;
  issueReport?: string;
  driverNotes?: string;
  notes?: string;
  completedAt?: string;
  assignedDriverId?: string;
  routeOrder?: number;
}

export interface CrateRecord {
  id: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  deliveryId?: string;
  type: 'caixa_plastica_k' | 'engradado' | 'palete' | 'cesto';
  sent: number;
  returned: number;
  balance: number;
  date: string;
  notes?: string;
}

export type HarvestStatus = 'pendente' | 'em_preparacao' | 'colhendo' | 'concluido';

export interface HarvestPlan {
  id: string;
  productId: string;
  productName: string;
  unit: ProductUnit;
  neededQty: number;
  harvestQty: number;
  date: string;
  responsible: string;
  status: HarvestStatus;
  notes?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: ProductUnit;
  unitCost: number;
  total: number;
}

export interface PurchaseRecord {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  dueDate: string;
  items: PurchaseItem[];
  total: number;
  status: 'pendente' | 'recebido' | 'cancelado';
  payableId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string;
  phone: string;
  whatsapp: string;
  address: string;
  suppliedProducts: string[];
  paymentCondition: string;
  notes?: string;
}

export type FinancialStatus = 'aberto' | 'pago' | 'vencido' | 'parcial';

export interface AccountsReceivable {
  id: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: FinancialStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export type PayableCategory = 
  | 'compra_hortifruti' 
  | 'combustivel' 
  | 'manutencao' 
  | 'salario' 
  | 'aluguel' 
  | 'energia' 
  | 'impostos' 
  | 'embalagens' 
  | 'outros';

export interface AccountsPayable {
  id: string;
  supplierOrPayee: string;
  category: PayableCategory;
  description: string;
  purchaseId?: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: FinancialStatus;
  paymentMethod: PaymentMethod;
}

export interface Expense {
  id: string;
  category: PayableCategory;
  description: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  receiptRef?: string;
}

export interface CashMovement {
  id: string;
  date: string;
  type: 'entrada' | 'saida';
  category: string;
  description: string;
  amount: number;
  referenceId?: string;
}

export interface MonthlyClosure {
  id: string;
  month: string; // YYYY-MM
  closedAt?: string;
  closedBy?: string;
  status: 'aberto' | 'fechado';
  grossRevenue: number;
  totalReceived: number;
  totalPurchases: number;
  totalExpenses: number;
  openReceivables: number;
  openPayables: number;
  netResult: number;
  notes?: string;
}

export interface AIAuditLog {
  id: string;
  timestamp: string;
  userRole: UserRole;
  question: string;
  response: string;
  suggestedAction?: {
    type: string;
    label: string;
    tab?: string;
    data?: any;
  } | null;
  status: 'consulted' | 'approved' | 'rejected' | 'auto_answered';
}

export interface NotificationItem {
  id: string;
  type: 'order' | 'delivery' | 'purchase' | 'harvest' | 'financial' | 'issue';
  title: string;
  message: string;
  date: string;
  read: boolean;
  actionTab?: string;
}
