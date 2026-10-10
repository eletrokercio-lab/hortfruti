import React, { useState } from 'react';
import { PriceInput } from '../ui/PriceInput';
import {
  ArrowLeft,
  Users,
  ShoppingBag,
  CircleDollarSign,
  Tag,
  Percent,
  Layers,
  Phone,
  MessageCircle,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  X,
  Pencil,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate, getFinancialStatusBadge, getOrderStatusBadge } from '../../utils/formatters';
import type { Customer } from '../../types';

interface CustomerDetailViewProps {
  customerId: string;
  onBack: () => void;
  onNewOrderForCustomer: (customerId: string) => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customerId,
  onBack,
  onNewOrderForCustomer,
}) => {
  const {
    customers,
    orders,
    receivables,
    customPrices,
    promotions,
    crates,
    products,
    setCustomerCustomPrice,
    deleteCustomerCustomPrice,
    createPromotion,
    togglePromotionActive,
    getCustomerCrateBalance,
    updateCustomer,
  } = useApp();

  // Modal de edição do cliente
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Customer | null>(null);

  const [activeTab, setActiveTab] = useState<
    'summary' | 'orders' | 'finance' | 'prices' | 'promotions' | 'crates'
  >('summary');

  // Custom price modal
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceProductId, setPriceProductId] = useState('');
  const [priceSearch, setPriceSearch] = useState('');
  const [customPriceVal, setCustomPriceVal] = useState<number>(0);

  // Promotion modal
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoProductId, setPromoProductId] = useState('');
  const [promoPrice, setPromoPrice] = useState<number>(0);
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoNotes, setPromoNotes] = useState('');

  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Cliente não encontrado.</p>
        <button onClick={onBack} className="mt-2 text-emerald-600 font-bold hover:underline">
          Voltar para lista
        </button>
      </div>
    );
  }

  // Relations
  const customerOrders = orders.filter((o) => o.customerId === customer.id);
  const customerReceivables = receivables.filter((r) => r.customerId === customer.id);
  const customerPrices = customPrices.filter((cp) => cp.customerId === customer.id);
  const customerPromos = promotions.filter(
    (p) => p.customerId === customer.id || p.customerId === 'all'
  );
  const customerCrates = crates.filter((c) => c.customerId === customer.id);
  const crateBalance = getCustomerCrateBalance(customer.id);

  const totalSpent = customerOrders.reduce((acc, curr) => acc + curr.total, 0);
  const totalOpenFinance = customerReceivables
    .filter((r) => r.status === 'aberto' || r.status === 'vencido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleOpenPriceModal = () => {
    setPriceSearch('');
    if (products.length > 0) {
      setPriceProductId(products[0].id);
      setCustomPriceVal(products[0].defaultPrice * 0.95);
    }
    setIsPriceModalOpen(true);
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const term = priceSearch.trim().toLowerCase();

    // Se o usuário digitou o nome sem clicar na sugestão, resolve sozinho:
    // 1) correspondência exata de nome; 2) único produto que casa com o termo.
    let productId = priceProductId;
    if (!productId && term) {
      const exact = products.find((p) => p.name.toLowerCase() === term);
      const partial = products.filter((p) => p.name.toLowerCase().includes(term));
      if (exact) productId = exact.id;
      else if (partial.length === 1) productId = partial[0].id;
    }

    if (!productId || customPriceVal <= 0) {
      alert(
        !productId
          ? 'Escolha um produto da lista antes de salvar: digite o nome e clique na opção que aparecer embaixo.'
          : 'Informe um preço maior que zero.'
      );
      return;
    }
    setPriceProductId(productId);
    setCustomerCustomPrice(customer.id, productId, customPriceVal);
    setIsPriceModalOpen(false);
  };

  const handleOpenEdit = () => {
    setEditForm({ ...customer });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    if (!editForm.name.trim()) {
      alert('O nome do cliente é obrigatório.');
      return;
    }
    updateCustomer(editForm);
    setIsEditOpen(false);
  };

  const handleOpenPromoModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const next10Days = new Date();
    next10Days.setDate(next10Days.getDate() + 10);

    setPromoStartDate(today);
    setPromoEndDate(next10Days.toISOString().split('T')[0]);
    if (products.length > 0) {
      setPromoProductId(products[0].id);
      setPromoPrice(products[0].defaultPrice * 0.9);
    }
    setPromoNotes('Oferta especial de safra para o cliente');
    setIsPromoModalOpen(true);
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoProductId || promoPrice <= 0) return;
    createPromotion({
      customerId: customer.id,
      productId: promoProductId,
      promotionalPrice: promoPrice,
      startDate: promoStartDate,
      endDate: promoEndDate,
      notes: promoNotes,
      active: true,
    });
    setIsPromoModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Back button and profile header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100 shadow-2xs"
            title="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">{customer.name}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  customer.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {customer.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {customer.tradeName ? `${customer.tradeName} • ` : ''}
              Doc: {customer.document} • Cadastrado em {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 shadow-2xs"
          >
            <Pencil className="h-4 w-4" />
            <span>Editar</span>
          </button>
          {customer.whatsapp && (
            <a
              href={`https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Contato da distribuidora HortiGestão com o cliente ${customer.name}.`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          )}
          <button
            onClick={() => onNewOrderForCustomer(customer.id)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs active:scale-95 transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Novo Pedido</span>
          </button>
        </div>
      </div>

      {/* PRD §44: The 6 Clear Clean Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 bg-white rounded-t-2xl px-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'summary'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>1. Resumo Cadastral</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>2. Pedidos ({customerOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'finance'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CircleDollarSign className="h-4 w-4" />
          <span>3. Financeiro ({customerReceivables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('prices')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'prices'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>4. Preços Individuais ({customerPrices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'promotions'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Percent className="h-4 w-4" />
          <span>5. Promoções ({customerPromos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('crates')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'crates'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>6. Vasilhames ({crateBalance} saldo)</span>
        </button>
      </div>

      {/* Tab 1: Resumo */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
              Dados Cadastrais & Entrega
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Endereço de Entrega</span>
                <span className="font-semibold text-gray-800">
                  {customer.address.street}, {customer.address.number}
                </span>
                <p className="text-gray-500 text-[11px]">
                  {customer.address.neighborhood} - {customer.address.city}/{customer.address.state} • CEP {customer.address.zipCode}
                </p>
                {customer.address.reference && (
                  <p className="text-gray-400 text-[10px] mt-0.5">Ref: {customer.address.reference}</p>
                )}
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Contato Direto</span>
                <p className="font-semibold text-gray-800">Tel: {customer.phone}</p>
                <p className="font-semibold text-emerald-700">WhatsApp: {customer.whatsapp}</p>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Condição Comercial</span>
                <p className="font-semibold text-gray-800">{customer.commercialCondition || 'Tabela Padrão'}</p>
                <p className="text-gray-500">Prazo: {customer.paymentTerm} • Forma: {customer.paymentMethod.toUpperCase()}</p>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Limite de Crédito</span>
                <p className="text-sm font-black text-gray-900">{formatBRL(customer.creditLimit)}</p>
                <p className="text-gray-500 text-[11px]">
                  Em Aberto Atual: <span className="font-bold text-rose-600">{formatBRL(totalOpenFinance)}</span>
                </p>
              </div>
            </div>

            {customer.notes && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                <span className="font-bold block text-gray-900 mb-0.5">Observações Operacionais:</span>
                {customer.notes}
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Histórico Consolidado</h3>

              <div className="flex justify-between text-xs py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Total Comprado:</span>
                <span className="font-bold text-gray-900">{formatBRL(totalSpent)}</span>
              </div>

              <div className="flex justify-between text-xs py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Total de Pedidos:</span>
                <span className="font-bold text-gray-900">{customerOrders.length}</span>
              </div>

              <div className="flex justify-between text-xs py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Saldo de Caixas (Vasilhames):</span>
                <span className="font-bold text-blue-700">{crateBalance} caixas</span>
              </div>

              <div className="flex justify-between text-xs py-1.5">
                <span className="text-gray-500">Preços Personalizados:</span>
                <span className="font-bold text-purple-700">{customerPrices.length} itens</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Pedidos */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Histórico de Pedidos do Cliente</h3>
            <button
              onClick={() => onNewOrderForCustomer(customer.id)}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              + Novo Pedido
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Pedido</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Entrega</th>
                  <th className="py-2.5 px-3">Itens</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Nenhum pedido realizado ainda.
                    </td>
                  </tr>
                ) : (
                  customerOrders.map((ord) => {
                    const badge = getOrderStatusBadge(ord.status);
                    return (
                      <tr key={ord.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{ord.orderNumber}</td>
                        <td className="py-2.5 px-3 text-gray-500">{formatDate(ord.date)}</td>
                        <td className="py-2.5 px-3 text-gray-700 font-semibold">{formatDate(ord.deliveryDate)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{ord.items.length} itens</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-800">{formatBRL(ord.total)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Financeiro */}
      {activeTab === 'finance' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Extrato Financeiro e Faturas</h3>
            <span className="text-xs text-gray-500">
              Total em aberto: <strong className="text-rose-600">{formatBRL(totalOpenFinance)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Ref. Pedido</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3">Forma</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      Nenhum lançamento financeiro registrado.
                    </td>
                  </tr>
                ) : (
                  customerReceivables.map((rec) => {
                    const badge = getFinancialStatusBadge(rec.status);
                    return (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{rec.orderNumber || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{formatBRL(rec.amount)}</td>
                        <td className="py-2.5 px-3 text-gray-600">{formatDate(rec.dueDate)}</td>
                        <td className="py-2.5 px-3 uppercase text-gray-500">{rec.paymentMethod}</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Preços Individuais (PRD §7) */}
      {activeTab === 'prices' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Tabela de Preços Exclusiva do Cliente</h3>
              <p className="text-xs text-gray-500">
                Preços cadastrados aqui substituem o valor padrão automaticamente ao emitir pedidos para {customer.name}.
              </p>
            </div>
            <button
              onClick={handleOpenPriceModal}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs"
            >
              <Plus className="h-4 w-4" /> Definir Preço Especial
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {customerPrices.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Nenhum preço individual configurado. Este cliente utiliza os preços padrão da distribuidora.
              </div>
            ) : (
              customerPrices.map((cp) => {
                const prod = products.find((p) => p.id === cp.productId);
                return (
                  <div key={cp.id} className="flex items-center justify-between p-3 text-xs bg-white hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-gray-900">{prod?.name}</p>
                      <p className="text-[11px] text-gray-500">
                        Preço padrão geral: {formatBRL(prod?.defaultPrice)} / {prod?.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-xs">
                          Preço Especial
                        </span>
                        <p className="text-sm font-black text-emerald-800">{formatBRL(cp.price)} / {prod?.unit}</p>
                      </div>

                      <button
                        onClick={() => deleteCustomerCustomPrice(cp.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-rose-600"
                        title="Remover preço exclusivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Promoções (PRD §8) */}
      {activeTab === 'promotions' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Promoções Válidas para este Cliente</h3>
              <p className="text-xs text-gray-500">
                Promoções por período aplicam desconto automaticamente no pedido durante o intervalo configurado.
              </p>
            </div>
            <button
              onClick={handleOpenPromoModal}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs"
            >
              <Plus className="h-4 w-4" /> Criar Promoção
            </button>
          </div>

          <div className="space-y-3">
            {customerPromos.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Nenhuma promoção ativa para este cliente.
              </div>
            ) : (
              customerPromos.map((promo) => {
                const prod = products.find((p) => p.id === promo.productId);
                return (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/40 p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{prod?.name}</span>
                        <span className="rounded bg-purple-200 px-1.5 py-0.2 text-[10px] font-bold text-purple-900">
                          {formatBRL(promo.promotionalPrice)} / {prod?.unit}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        Validade: {formatDate(promo.startDate)} até {formatDate(promo.endDate)}
                        {promo.notes ? ` • ${promo.notes}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePromotionActive(promo.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                          promo.active
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {promo.active ? 'Ativa' : 'Pausada'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Vasilhames (PRD §19) */}
      {activeTab === 'crates' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Controle de Vasilhames & Caixas Retornáveis</h3>
              <p className="text-xs text-gray-500">
                Caixas modelo K e recipientes deixados no cliente que aguardam devolução.
              </p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-right">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Saldo Pendente com Cliente</span>
              <span className="text-lg font-black text-blue-900">{crateBalance} caixas</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {customerCrates.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Nenhuma movimentação de vasilhames registrada para este cliente.
              </div>
            ) : (
              customerCrates.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 text-xs bg-white hover:bg-gray-50">
                  <div>
                    <span className="font-bold text-gray-900">{formatDate(c.date)}</span>
                    <p className="text-[11px] text-gray-500">{c.notes}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 font-bold">Devolvidas: {c.returned}</span> •{' '}
                    <span className="text-blue-700 font-bold">Enviadas: {c.sent}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Definir Preço Especial */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-gray-900 mb-1">Definir Preço Exclusivo</h3>
            <p className="text-xs text-gray-500 mb-4">Cliente: {customer.name}</p>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Produto</label>
                {(() => {
                  const selected = products.find((p) => p.id === priceProductId);
                  const term = priceSearch.trim().toLowerCase();
                  // Se o termo casa exatamente com o produto selecionado, lista recolhida
                  const matches = term
                    ? products
                        .filter((p) => p.name.toLowerCase().includes(term))
                        .slice(0, 8)
                    : [];
                  const showList =
                    term.length > 0 && !(selected && selected.name.toLowerCase() === term);
                  return (
                    <div className="relative">
                      <input
                        type="text"
                        value={
                          showList || term === ''
                            ? priceSearch
                            : priceSearch // mantém o que está digitado; ao escolher, term == nome
                        }
                        onChange={(e) => setPriceSearch(e.target.value)}
                        placeholder="Digite o nome do produto..."
                        autoComplete="off"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 font-medium focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      {selected && !showList && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          Selecionado: <b>{selected.name}</b> (Tabela padrão:{' '}
                          {formatBRL(selected.defaultPrice)}/{selected.unit})
                        </p>
                      )}
                      {showList && (
                        <div className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                          {matches.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-gray-500">
                              Nenhum produto encontrado.
                            </p>
                          ) : (
                            matches.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setPriceProductId(p.id);
                                  setCustomPriceVal(p.defaultPrice * 0.95);
                                  setPriceSearch(p.name);
                                }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-emerald-50"
                              >
                                <span className="font-bold text-gray-900">{p.name}</span>
                                <span className="text-gray-500">
                                  {formatBRL(p.defaultPrice)}/{p.unit}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Preço Especial para este Cliente (R$)
                </label>
                <PriceInput
                  value={customPriceVal}
                  onValueChange={setCustomPriceVal}
                  placeholder="Ex: 5,50"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900"
                />
                <p className="mt-1 text-[10px] text-gray-400">Aceita vírgula ou ponto: 5,50 ou 5.50</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
                >
                  Salvar Preço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Criar Promoção */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-gray-900 mb-1">Criar Promoção por Período</h3>
            <p className="text-xs text-gray-500 mb-4">Cliente: {customer.name}</p>

            <form onSubmit={handleSavePromo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Produto</label>
                <select
                  value={promoProductId}
                  onChange={(e) => setPromoProductId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Preço Promocional (R$)</label>
                <PriceInput
                  value={promoPrice}
                  onValueChange={setPromoPrice}
                  placeholder="Ex: 5,50"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Início</label>
                  <input
                    type="date"
                    value={promoStartDate}
                    onChange={(e) => setPromoStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fim</label>
                  <input
                    type="date"
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Motivo / Observação</label>
                <input
                  type="text"
                  value={promoNotes}
                  onChange={(e) => setPromoNotes(e.target.value)}
                  placeholder="Ex: Quinzena do Hortifruti"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white"
                >
                  Ativar Promoção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Editar Cliente */}
      {isEditOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-gray-900 mb-1">Editar Cliente</h3>
            <p className="text-xs text-gray-500 mb-4">{customer.name}</p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome / Razão Social *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={editForm.tradeName || ''}
                    onChange={(e) => setEditForm({ ...editForm, tradeName: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    value={editForm.document}
                    onChange={(e) => setEditForm({ ...editForm, document: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="(47) 99999-0000"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp (com DDD)</label>
                  <input
                    type="tel"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    placeholder="47999990000"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-bold text-gray-900 mb-2">Endereço de Entrega</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Rua</label>
                    <input
                      type="text"
                      value={editForm.address.street}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, street: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Número</label>
                    <input
                      type="text"
                      value={editForm.address.number}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, number: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={editForm.address.neighborhood}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, neighborhood: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={editForm.address.city}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, city: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={editForm.address.state}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, state: e.target.value.toUpperCase() } })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">CEP</label>
                    <input
                      type="text"
                      value={editForm.address.zipCode}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, zipCode: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-4">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ponto de Referência</label>
                    <input
                      type="text"
                      value={editForm.address.reference || ''}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, reference: e.target.value } })}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value as Customer['paymentMethod'] })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="pix">PIX</option>
                    <option value="cash">À Vista</option>
                    <option value="credit">A Prazo</option>
                    <option value="boleto">Boleto</option>
                    <option value="transfer">Transferência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Prazo</label>
                  <select
                    value={editForm.paymentTerm}
                    onChange={(e) => setEditForm({ ...editForm, paymentTerm: e.target.value as Customer['paymentTerm'] })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="sight">À Vista</option>
                    <option value="7d">7 Dias</option>
                    <option value="15d">15 Dias</option>
                    <option value="30d">30 Dias</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Limite de Crédito (R$)</label>
                  <PriceInput
                    value={editForm.creditLimit}
                    onValueChange={(v) => setEditForm({ ...editForm, creditLimit: v })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Condição Comercial</label>
                  <input
                    type="text"
                    value={editForm.commercialCondition}
                    onChange={(e) => setEditForm({ ...editForm, commercialCondition: e.target.value })}
                    placeholder="Ex: Tabela Atacado"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Situação</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Customer['status'] })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
