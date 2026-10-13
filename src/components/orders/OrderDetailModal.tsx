import React, { useEffect, useState } from 'react';
import {
  X,
  ShoppingBag,
  Truck,
  CircleDollarSign,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  Printer,
  UserCog,
  ArrowRightLeft,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Order } from '../../types';
import { formatBRL, formatDate, getOrderStatusBadge, getPaymentTermLabel } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';
import { getSupabaseClient } from '../../lib/supabase';

interface DriverProfile {
  id: string;
  full_name: string | null;
  driver_name: string | null;
}

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  initialDriverPick?: boolean;
  onEditOrder?: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  initialDriverPick,
  onEditOrder,
}) => {
  const { updateOrderStatus, deleteOrder, setDeliveryAssignment, deliveries, setCurrentTab } = useApp();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [showDriverPick, setShowDriverPick] = useState(false);
  const [assignDone, setAssignDone] = useState<string | null>(null);

  // Carrega entregadores ativos
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const client = getSupabaseClient();
      if (!client) return;
      const { data } = await client
        .from('app_profiles')
        .select('id, full_name, driver_name')
        .eq('role', 'entregador')
        .eq('status', 'ativo');
      if (data) setDrivers(data as any);
    })();
  }, [isOpen]);

  // Fecha painéis auxiliares ao abrir/trocar de pedido
  // (initialDriverPick=true abre direto no seletor de entregador)
  useEffect(() => {
    setShowDriverPick(!!isOpen && !!initialDriverPick && !!order);
    setAssignDone(null);
  }, [isOpen, order?.id, initialDriverPick]);

  if (!isOpen || !order) return null;

  const badge = getOrderStatusBadge(order.status);

  // Entrega vinculada a este pedido
  const delivery = deliveries.find((d) => d.orderId === order.id) ||
    deliveries.find((d) => d.orderNumber === order.orderNumber);

  // "Em Rota": muda status e abre o seletor de entregador na sequência
  const handleGoRoute = () => {
    updateOrderStatus(order.id, 'em_rota');
    setShowDriverPick(true);
    setAssignDone(null);
  };

  // Excluir pedido (remove também entrega e recebível)
  const handleDelete = () => {
    const ok = window.confirm(
      `Excluir o pedido ${order.orderNumber} de ${order.customerName} (${formatBRL(order.total)})?\n\nIsso remove também a entrega e a conta a receber. Não pode ser desfeito.`
    );
    if (!ok) return;
    deleteOrder(order.id);
    onClose();
  };

  const handlePickDriver = (drv: DriverProfile) => {
    if (delivery) {
      const name = drv.driver_name || drv.full_name || 'Entregador';
      setDeliveryAssignment(delivery.id, drv.id, name);
      setAssignDone(name);
      setShowDriverPick(false);
    } else {
      // sem entrega vinculada: manda para a tela de entregas para delegar lá
      setCurrentTab('deliveries');
      onClose();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-4 sm:my-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-600 p-2 text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">{order.orderNumber}</h2>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">Cliente: {order.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100"
              title="Imprimir Pedido / Separação"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Key metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50 text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Data Emissão</span>
              <span className="font-semibold text-gray-800">{formatDate(order.date)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Data Entrega</span>
              <span className="font-bold text-emerald-800">{formatDate(order.deliveryDate)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Forma Pagto</span>
              <span className="font-semibold text-gray-800 uppercase">{order.paymentMethod}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] uppercase font-bold">Condição</span>
              <span className="font-semibold text-gray-800">{getPaymentTermLabel(order.paymentTerm)}</span>
            </div>
          </div>

          {/* Items breakdown */}
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
              Itens do Pedido ({order.items.length})
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[440px]">
                  <thead className="bg-gray-50 text-gray-500 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Produto</th>
                      <th className="py-2 px-3 text-center">Quantidade</th>
                      <th className="py-2 px-3 text-right">Preço Unit.</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-gray-900">{item.productName}</span>
                          {item.isPromo && (
                            <span className="ml-2 rounded bg-rose-100 px-1 py-0.2 text-[9px] font-bold text-rose-800">
                              PROMOÇÃO
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-700">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">
                          {formatBRL(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatBRL(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
              <span className="font-bold block">Observações:</span>
              {order.notes}
            </div>
          )}

          {/* Confirmação de envio ao entregador */}
          {assignDone && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Entrega enviada para <b>{assignDone}</b> — já aparece no app dele em "Minhas Entregas".
              </span>
            </div>
          )}

          {/* Seletor de entregador (abre ao colocar em rota) */}
          {showDriverPick && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                <Truck className="h-4 w-4" />
                Pedido em rota — escolha o entregador
              </p>
              <p className="text-[11px] text-indigo-700 mb-3">
                {delivery
                  ? `A entrega do pedido ${order.orderNumber} será enviada para o app do entregador selecionado.`
                  : 'Entrega não localizada para este pedido — delegue na tela de Entregas.'}
              </p>
              {drivers.length === 0 ? (
                <p className="text-[11px] text-gray-500">Nenhum entregador cadastrado. Crie a conta dele no Painel Master.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {drivers.map((drv) => {
                    const nome = drv.driver_name || drv.full_name || 'Entregador';
                    const jaEh = delivery?.driverName === nome;
                    return (
                      <button
                        key={drv.id}
                        onClick={() => handlePickDriver(drv)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                          jaEh
                            ? 'border-indigo-400 bg-indigo-600 text-white'
                            : 'border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-100'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <UserCog className="h-3.5 w-3.5" />
                          {nome}
                          {jaEh && <span className="text-[9px] font-black uppercase">atual</span>}
                        </span>
                        {delivery && (
                          <ArrowRightLeft className="h-3.5 w-3.5 opacity-70" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setShowDriverPick(false)}
                  className="text-[11px] font-bold text-indigo-700 hover:underline"
                >
                  Escolher depois
                </button>
                {!delivery && (
                  <button
                    onClick={() => { setCurrentTab('deliveries'); onClose(); }}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"
                  >
                    Abrir Entregas
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Status Progression Controls */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/40">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
              Avançar Status Operacional
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateOrderStatus(order.id, 'em_separacao')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  order.status === 'em_separacao'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                1. Em Separação
              </button>

              <button
                onClick={() => updateOrderStatus(order.id, 'pronto')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  order.status === 'pronto'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                2. Pronto p/ Carregamento
              </button>

              <button
                onClick={handleGoRoute}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  order.status === 'em_rota'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                3. Em Rota (Caminhão)
              </button>

              <button
                onClick={() => updateOrderStatus(order.id, 'entregue')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  order.status === 'entregue'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                4. Entregue com Sucesso ✅
              </button>
            </div>

            {/* Atalho: trocar entregador quando já está em rota */}
            {order.status === 'em_rota' && !showDriverPick && (
              <button
                onClick={() => setShowDriverPick(true)}
                className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-800 hover:bg-indigo-50"
              >
                <UserCog className="h-3.5 w-3.5" />
                {delivery?.driverName
                  ? `Entregador atual: ${delivery.driverName} — trocar`
                  : 'Enviar para um entregador'}
              </button>
            )}
          </div>

          {/* Total */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div>
              <span className="text-xs text-gray-500">Valor Final:</span>
              <p className="text-2xl font-black text-emerald-800">{formatBRL(order.total)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onEditOrder && order.status !== 'entregue' && order.status !== 'cancelado' && (
                <button
                  onClick={() => onEditOrder(order)}
                  title="Corrigir itens, quantidades, preços ou data deste pedido"
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
              <button
                onClick={handleDelete}
                title="Excluir este pedido"
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-black"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
