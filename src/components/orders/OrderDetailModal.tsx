import React from 'react';
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
} from 'lucide-react';
import { Order } from '../../types';
import { formatBRL, formatDate, getOrderStatusBadge, getPaymentTermLabel } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { updateOrderStatus, setCurrentTab } = useApp();

  if (!isOpen || !order) return null;

  const badge = getOrderStatusBadge(order.status);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/80">
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

        <div className="p-6 space-y-6">
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
              <table className="w-full text-left text-xs">
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

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
              <span className="font-bold block">Observações:</span>
              {order.notes}
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
                onClick={() => updateOrderStatus(order.id, 'em_rota')}
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
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div>
              <span className="text-xs text-gray-500">Valor Final:</span>
              <p className="text-2xl font-black text-emerald-800">{formatBRL(order.total)}</p>
            </div>
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
  );
};
