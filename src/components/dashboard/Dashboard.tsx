import React from 'react';
import {
  ShoppingBag,
  Truck,
  Sparkles,
  AlertCircle,
  PlusCircle,
  PackageSearch,
  CalendarCheck,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate, getOrderStatusBadge } from '../../utils/formatters';

interface DashboardProps {
  onOpenNewOrder: () => void;
  onOpenNewCustomer: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenNewOrder, onOpenNewCustomer }) => {
  const {
    orders,
    deliveries,
    receivables,
    payables,
    calculateProductNeeds,
    harvestPlans,
    setCurrentTab,
    setIsAssistantOpen,
    setAssistantInitialPrompt,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Daily statistics
  const todayOrders = orders.filter((o) => o.date === todayStr);
  const salesToday = todayOrders.reduce((acc, curr) => acc + curr.total, 0);

  const pendingOrders = orders.filter((o) => o.status === 'pendente' || o.status === 'em_separacao');
  const todayDeliveries = deliveries.filter((d) => d.date === todayStr);
  const completedDeliveries = todayDeliveries.filter((d) => d.status === 'entregue');
  const inRouteDeliveries = todayDeliveries.filter((d) => d.status === 'em_rota');

  // Product Needs
  const needs = calculateProductNeeds();
  const purchasesNeeded = needs.filter((n) => n.status === 'comprar');
  const harvestsNeeded = needs.filter((n) => n.status === 'colher');

  // Financial status
  const overdueReceivables = receivables.filter((r) => r.status === 'vencido');
  const overdueTotal = overdueReceivables.reduce((acc, curr) => acc + curr.amount, 0);

  const totalToReceive = receivables
    .filter((r) => r.status === 'aberto' || r.status === 'vencido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalToPay = payables
    .filter((p) => p.status === 'aberto' || p.status === 'vencido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleAskRecommendations = () => {
    setAssistantInitialPrompt('Quais são as prioridades operacionais que preciso resolver primeiro hoje?');
    setIsAssistantOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* PRD §56: Morning Briefing Card (Copiloto Operacional da Distribuidora) */}
      <div className="rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-900 via-teal-950 to-emerald-950 p-5 md:p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Central do Dia • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <h1 className="mt-1 text-xl md:text-2xl font-black tracking-tight text-white">
              Bom dia! O que está acontecendo hoje?
            </h1>
            <p className="mt-1 text-xs md:text-sm text-emerald-100/80">
              Resumo instantâneo das prioridades da distribuidora para manter os pedidos e rotas em dia.
            </p>
          </div>

          <button
            onClick={handleAskRecommendations}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition-all shadow-md active:scale-95 shrink-0"
          >
            <Sparkles className="h-4 w-4 text-emerald-300 animate-spin" style={{ animationDuration: '4s' }} />
            <span>✨ Ver Recomendações da IA</span>
          </button>
        </div>

        {/* Priority KPI badges */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-emerald-800/60 pt-4">
          <div
            onClick={() => setCurrentTab('planning')}
            className="cursor-pointer rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <span className="text-base">🔴</span> Compras
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              {purchasesNeeded.length}{' '}
              <span className="text-xs font-normal text-emerald-200">produtos</span>
            </div>
            <p className="text-[11px] text-emerald-200/70">
              {purchasesNeeded.length > 0 ? 'Falta no estoque p/ pedidos' : 'Tudo suprido'}
            </p>
          </div>

          <div
            onClick={() => setCurrentTab('planning')}
            className="cursor-pointer rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <span className="text-base">🟡</span> Colheitas
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              {harvestsNeeded.length + harvestPlans.filter((h) => h.status !== 'concluido').length}{' '}
              <span className="text-xs font-normal text-emerald-200">itens</span>
            </div>
            <p className="text-[11px] text-emerald-200/70">Folhagens e temperos</p>
          </div>

          <div
            onClick={() => setCurrentTab('deliveries')}
            className="cursor-pointer rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <span className="text-base">🚚</span> Entregas
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              {todayDeliveries.length}{' '}
              <span className="text-xs font-normal text-emerald-200">
                ({completedDeliveries.length} entregues)
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/70">
              {inRouteDeliveries.length} em rota agora
            </p>
          </div>

          <div
            onClick={() => setCurrentTab('finance')}
            className="cursor-pointer rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <span className="text-base">💰</span> Vencidos
            </div>
            <div className="mt-1 text-xl font-bold text-white">
              {overdueReceivables.length > 0 ? formatBRL(overdueTotal) : 'Zero'}
            </div>
            <p className="text-[11px] text-emerald-200/70">
              {overdueReceivables.length} faturas em atraso
            </p>
          </div>
        </div>
      </div>

      {/* PRD §4: Quick Action Bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={onOpenNewOrder}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Novo Pedido</span>
        </button>

        <button
          onClick={onOpenNewCustomer}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
        >
          <Users className="h-4 w-4 text-emerald-600" />
          <span>Novo Cliente</span>
        </button>

        <button
          onClick={() => setCurrentTab('planning')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
        >
          <PackageSearch className="h-4 w-4 text-blue-600" />
          <span>Resolver Compras</span>
        </button>

        <button
          onClick={() => setCurrentTab('planning')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
        >
          <CalendarCheck className="h-4 w-4 text-amber-600" />
          <span>Planejar Colheita</span>
        </button>

        <button
          onClick={() => setCurrentTab('deliveries')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
        >
          <Truck className="h-4 w-4 text-indigo-600" />
          <span>Ver Entregas</span>
        </button>

        <button
          onClick={() => setCurrentTab('finance')}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
        >
          <CircleDollarSign className="h-4 w-4 text-emerald-600" />
          <span>Financeiro</span>
        </button>

        <button
          onClick={() => setIsAssistantOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 px-3.5 py-2.5 text-xs font-bold text-emerald-800 transition-colors ml-auto shadow-2xs"
        >
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span>Assistente IA</span>
        </button>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vendas do Dia */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Vendas de Hoje</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{formatBRL(salesToday)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            <span className="font-semibold text-emerald-600">{todayOrders.length} pedidos</span> emitidos hoje
          </p>
        </div>

        {/* Pedidos Pendentes */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Separação / Pendentes</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{pendingOrders.length}</span>
            <span className="text-xs text-gray-400">pedidos ativos</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Aguardando conferência ou separação</p>
        </div>

        {/* Entregas do Dia */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Entregas de Hoje</span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{todayDeliveries.length}</span>
            <span className="text-xs font-bold text-emerald-600">
              {completedDeliveries.length} concluídas
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{
                width: todayDeliveries.length > 0 ? `${(completedDeliveries.length / todayDeliveries.length) * 100}%` : '0%',
              }}
            />
          </div>
        </div>

        {/* Saldo a Receber vs Pagar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Posição Financeira</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">A Receber:</span>
            <span className="font-bold text-emerald-700">{formatBRL(totalToReceive)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">A Pagar:</span>
            <span className="font-bold text-rose-700">{formatBRL(totalToPay)}</span>
          </div>
          {overdueReceivables.length > 0 && (
            <p className="mt-2 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              ⚠️ {formatBRL(overdueTotal)} em atraso
            </p>
          )}
        </div>
      </div>

      {/* Two Column Operational Focus: Entregas de Hoje & Necessidades de Compra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Entregas de Hoje */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-gray-900">Entregas Programadas para Hoje</h2>
            </div>
            <button
              onClick={() => setCurrentTab('deliveries')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Ver todas <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {todayDeliveries.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500">
                Nenhuma entrega registrada para a data de hoje.
              </p>
            ) : (
              todayDeliveries.map((del) => (
                <div
                  key={del.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-gray-900">{del.customerName}</span>
                      <span className="text-[10px] text-gray-500 font-mono">({del.orderNumber})</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      📍 {del.address} • {del.neighborhood}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Motorista: {del.driverName} • {del.cratesDelivered} caixas
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        del.status === 'entregue'
                          ? 'bg-emerald-100 text-emerald-800'
                          : del.status === 'em_rota'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {del.status === 'entregue' ? 'Entregue' : del.status === 'em_rota' ? 'Em Rota' : 'A Preparar'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Necessidades Urgentes de Compra (PRD §14) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-rose-600" />
              <h2 className="text-sm font-bold text-gray-900">Necessidades de Compra / Suprimento</h2>
            </div>
            <button
              onClick={() => setCurrentTab('planning')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Resolver compras <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {purchasesNeeded.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-gray-800">Estoque suprido!</p>
                <p className="text-[11px] text-gray-500">
                  A quantidade prevista atende todos os pedidos em andamento.
                </p>
              </div>
            ) : (
              purchasesNeeded.slice(0, 4).map((need) => (
                <div
                  key={need.productId}
                  className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/40 p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔴</span>
                      <span className="font-bold text-xs text-gray-900">{need.productName}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Necessário p/ pedidos: <span className="font-semibold">{need.neededQty} {need.unit}</span> • Já disponível: {need.availableQty} {need.unit}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-xs text-rose-700">
                      Faltam {need.deficit} {need.unit}
                    </span>
                    <button
                      onClick={() => setCurrentTab('planning')}
                      className="block mt-1 text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      Comprar →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-gray-900">Últimos Pedidos Cadastrados</h2>
          </div>
          <button
            onClick={() => setCurrentTab('orders')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            Ver todos ({orders.length}) <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 font-semibold">
                <th className="py-2.5 px-3">Pedido</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Data / Entrega</th>
                <th className="py-2.5 px-3">Itens</th>
                <th className="py-2.5 px-3">Total</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((ord) => {
                const badge = getOrderStatusBadge(ord.status);
                return (
                  <tr key={ord.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-gray-900">{ord.orderNumber}</td>
                    <td className="py-3 px-3 font-semibold text-gray-800">{ord.customerName}</td>
                    <td className="py-3 px-3 text-gray-500">
                      {formatDate(ord.date)} → <span className="font-semibold text-gray-700">{formatDate(ord.deliveryDate)}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-600">{ord.items.length} itens</td>
                    <td className="py-3 px-3 font-bold text-emerald-800">{formatBRL(ord.total)}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
