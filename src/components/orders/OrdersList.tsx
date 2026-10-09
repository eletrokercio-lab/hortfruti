import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  ArrowUpDown,
  PackageOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus } from '../../types';
import { formatBRL, formatDate, getOrderStatusBadge } from '../../utils/formatters';
import { OrderDetailModal } from './OrderDetailModal';

interface OrdersListProps {
  onOpenNewOrder: () => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({ onOpenNewOrder }) => {
  const { orders, updateOrderStatus } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'hoje' | 'amanha' | 'todos'>('hoje');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [openDriverPick, setOpenDriverPick] = useState(false);

  // Data de hoje/amanhã no formato YYYY-MM-DD (local)
  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = toISODate(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = toISODate(tomorrowDate);
  const deliveryDay = (o: Order) => (o.deliveryDate || '').slice(0, 10);

  // Filtro de data (base dos KPIs)
  const baseOrders = orders.filter((o) => {
    if (dateFilter === 'todos') return true;
    const day = deliveryDay(o);
    return dateFilter === 'hoje' ? day === todayStr : day === tomorrowStr;
  });

  // Filtered orders
  const filteredOrders = baseOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValue = filteredOrders.reduce((acc, curr) => acc + curr.total, 0);

  // Próximo passo operacional de cada status (botão rápido na linha)
  const NEXT_STEP: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
    pendente: { next: 'em_separacao', label: 'Separar' },
    em_separacao: { next: 'pronto', label: 'Pronto' },
    pronto: { next: 'em_rota', label: 'Em Rota' },
    em_rota: { next: 'entregue', label: 'Entregar' },
  };

  const handleQuickStep = (ord: Order) => {
    const step = NEXT_STEP[ord.status];
    if (!step) return;
    updateOrderStatus(ord.id, step.next);
    // Ao colocar em rota, abre o modal direto no seletor de entregador
    if (step.next === 'em_rota') {
      setSelectedOrder(ord);
      setOpenDriverPick(true);
      setIsDetailOpen(true);
    }
  };

  const handleOpenDetail = (order: Order) => {
    setSelectedOrder(order);
    setOpenDriverPick(false);
    setIsDetailOpen(true);
  };

  const dateTabs: { key: 'hoje' | 'amanha' | 'todos'; label: string; count: number }[] = [
    { key: 'hoje', label: 'Hoje', count: orders.filter((o) => deliveryDay(o) === todayStr).length },
    { key: 'amanha', label: 'Amanhã', count: orders.filter((o) => deliveryDay(o) === tomorrowStr).length },
    { key: 'todos', label: 'Todos', count: orders.length },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-emerald-600" />
            Pedidos de Venda
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gerenciamento completo do ciclo de pedidos, separação e entregas
          </p>
        </div>

        <button
          onClick={onOpenNewOrder}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Pedido</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Total Listado</span>
          <p className="text-lg font-black text-gray-900">{filteredOrders.length} pedidos</p>
          <span className="text-xs font-semibold text-emerald-700">{formatBRL(totalValue)}</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Pendentes</span>
          <p className="text-lg font-black text-amber-700">
            {baseOrders.filter((o) => o.status === 'pendente').length}
          </p>
          <span className="text-[11px] text-gray-500">Aguardando separação</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Em Separação / Rota</span>
          <p className="text-lg font-black text-blue-700">
            {baseOrders.filter((o) => o.status === 'em_separacao' || o.status === 'em_rota').length}
          </p>
          <span className="text-[11px] text-gray-500">Em andamento na expedição</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Entregues</span>
          <p className="text-lg font-black text-emerald-700">
            {baseOrders.filter((o) => o.status === 'entregue').length}
          </p>
          <span className="text-[11px] text-gray-500">Concluídos com sucesso</span>
        </div>
      </div>

      {/* Date Tabs: fila do dia */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit shadow-2xs">
        {dateTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDateFilter(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              dateFilter === tab.key
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                dateFilter === tab.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número do pedido ou cliente..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 focus:bg-white focus:outline-hidden"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_separacao">Em Separação</option>
            <option value="pronto">Pronto p/ Rota</option>
            <option value="em_rota">Em Rota</option>
            <option value="entregue">Entregue</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                <th className="py-3 px-4">Pedido</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Data Emissão</th>
                <th className="py-3 px-4">Entrega</th>
                <th className="py-3 px-4">Itens</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const badge = getOrderStatusBadge(ord.status);
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => handleOpenDetail(ord)}
                      className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{ord.orderNumber}</td>
                      <td className="py-3 px-4 font-bold text-gray-800">{ord.customerName}</td>
                      <td className="py-3 px-4 text-gray-500">{formatDate(ord.date)}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-900">
                        {formatDate(ord.deliveryDate)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {ord.items.length} produto{ord.items.length > 1 ? 's' : ''}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-emerald-800">
                        {formatBRL(ord.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {NEXT_STEP[ord.status] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickStep(ord);
                              }}
                              className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title={`Avançar para: ${NEXT_STEP[ord.status]!.label}`}
                            >
                              {ord.status === 'em_rota' ? (
                                <Truck className="h-3.5 w-3.5" />
                              ) : (
                                <PackageOpen className="h-3.5 w-3.5" />
                              )}
                              {NEXT_STEP[ord.status]!.label}
                            </button>
                          )}
                          {ord.status === 'entregue' && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Concluído
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(ord);
                            }}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder : null}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        initialDriverPick={openDriverPick}
      />
    </div>
  );
};
