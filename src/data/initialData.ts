import {
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
} from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Tomate Italiano',
    category: 'legumes',
    unit: 'cx',
    salesType: 'caixa',
    defaultPrice: 85.0,
    avgCost: 55.0,
    origin: 'Fazenda Vale do Sol - Bragança',
    status: 'active',
    notes: 'Caixa 20kg tipo especial 1A',
  },
  {
    id: 'prod-2',
    name: 'Cebola Nacional Pêra',
    category: 'legumes',
    unit: 'saco',
    salesType: 'peso',
    defaultPrice: 78.0,
    avgCost: 48.0,
    origin: 'Região de Monte Alto / SP',
    status: 'active',
    notes: 'Saco de 20kg classificada média 3',
  },
  {
    id: 'prod-3',
    name: 'Batata Inglesa Lavada',
    category: 'tuberculos',
    unit: 'saco',
    salesType: 'peso',
    defaultPrice: 110.0,
    avgCost: 72.0,
    origin: 'Sul de Minas Gerais',
    status: 'active',
    notes: 'Saco de 25kg tipo Ágata especial',
  },
  {
    id: 'prod-4',
    name: 'Alface Americana Hidropônica',
    category: 'folhagens',
    unit: 'cx',
    salesType: 'caixa',
    defaultPrice: 42.0,
    avgCost: 24.0,
    origin: 'Horta Própria - Mogi das Cruzes',
    status: 'active',
    notes: 'Caixa com 12 unidades frescas embaladas',
  },
  {
    id: 'prod-5',
    name: 'Cenoura Especial',
    category: 'tuberculos',
    unit: 'cx',
    salesType: 'caixa',
    defaultPrice: 65.0,
    avgCost: 40.0,
    origin: 'Irecê / Bahia',
    status: 'active',
    notes: 'Caixa de 20kg lavada e selecionada',
  },
  {
    id: 'prod-6',
    name: 'Banana Prata Climatizada',
    category: 'frutas',
    unit: 'cx',
    salesType: 'caixa',
    defaultPrice: 75.0,
    avgCost: 48.0,
    origin: 'Vale do Ribeira',
    status: 'active',
    notes: 'Caixa de 20kg ponto ideal de maturação',
  },
  {
    id: 'prod-7',
    name: 'Manga Palmer Exportação',
    category: 'frutas',
    unit: 'cx',
    salesType: 'caixa',
    defaultPrice: 88.0,
    avgCost: 56.0,
    origin: 'Petrolina / PE',
    status: 'active',
    notes: 'Caixa de 12kg sem fiapo doce',
  },
  {
    id: 'prod-8',
    name: 'Pimentão Verde Extra',
    category: 'legumes',
    unit: 'cx',
    salesType: 'caixa',
    defaultPrice: 58.0,
    avgCost: 35.0,
    origin: 'Atibaia / SP',
    status: 'active',
    notes: 'Caixa com 12kg selecionados',
  },
  {
    id: 'prod-9',
    name: 'Cheiro Verde (Salsa e Cebolinha)',
    category: 'temperos',
    unit: 'un',
    salesType: 'unidade',
    defaultPrice: 2.8,
    avgCost: 1.2,
    origin: 'Horta Própria Local',
    status: 'active',
    notes: 'Maço grande colheita do dia',
  },
  {
    id: 'prod-10',
    name: 'Alho Roxo Nacional',
    category: 'temperos',
    unit: 'kg',
    salesType: 'peso',
    defaultPrice: 32.0,
    avgCost: 21.0,
    origin: 'Curitibanos / SC',
    status: 'active',
    notes: 'Classificado tipo 6 e 7',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_CUSTOM_PRICES: CustomPrice[] = [];

export const INITIAL_PROMOTIONS: Promotion[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_DELIVERIES: Delivery[] = [];

export const INITIAL_CRATES: CrateRecord[] = [];

export const INITIAL_HARVEST_PLANS: HarvestPlan[] = [];

export const INITIAL_PURCHASES: PurchaseRecord[] = [];

export const INITIAL_RECEIVABLES: AccountsReceivable[] = [];

export const INITIAL_PAYABLES: AccountsPayable[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const INITIAL_CASH_MOVEMENTS: CashMovement[] = [];

export const INITIAL_MONTHLY_CLOSURES: MonthlyClosure[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_AI_LOGS: AIAuditLog[] = [];
