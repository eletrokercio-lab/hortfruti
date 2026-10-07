import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Users,
  Box,
  ShoppingBag,
  Truck,
  CircleDollarSign,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const {
    customers,
    products,
    orders,
    deliveries,
    receivables,
    setCurrentTab,
    setSelectedCustomerId,
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Search matches
  const matchedCustomers = trimmed
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          (c.tradeName && c.tradeName.toLowerCase().includes(trimmed)) ||
          c.document.includes(trimmed)
      )
    : [];

  const matchedProducts = trimmed
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.category.toLowerCase().includes(trimmed) ||
          p.origin.toLowerCase().includes(trimmed)
      )
    : [];

  const matchedOrders = trimmed
    ? orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(trimmed) ||
          o.customerName.toLowerCase().includes(trimmed)
      )
    : [];

  const matchedDeliveries = trimmed
    ? deliveries.filter(
        (d) =>
          d.orderNumber.toLowerCase().includes(trimmed) ||
          d.customerName.toLowerCase().includes(trimmed) ||
          d.driverName.toLowerCase().includes(trimmed) ||
          d.neighborhood.toLowerCase().includes(trimmed)
      )
    : [];

  const matchedReceivables = trimmed
    ? receivables.filter(
        (r) =>
          r.customerName.toLowerCase().includes(trimmed) ||
          (r.orderNumber && r.orderNumber.toLowerCase().includes(trimmed))
      )
    : [];

  const totalResults =
    matchedCustomers.length +
    matchedProducts.length +
    matchedOrders.length +
    matchedDeliveries.length +
    matchedReceivables.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-16 md:pt-24 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o que procura (ex: João, Tomate, PED-101, Campinas...)"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Esc
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!trimmed && (
            <div className="py-8 text-center text-xs text-gray-400">
              Digite pelo menos uma letra para buscar em clientes, produtos, pedidos, entregas e financeiro.
            </div>
          )}

          {trimmed && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-gray-500">
              Nenhum registro encontrado para "{query}".
            </div>
          )}

          {/* Clientes */}
          {matchedCustomers.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                Clientes ({matchedCustomers.length})
              </p>
              <div className="space-y-1">
                {matchedCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      setCurrentTab('customer-detail');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50/60 cursor-pointer border border-transparent hover:border-emerald-200 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{cust.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {cust.tradeName && `${cust.tradeName} • `} {cust.address.neighborhood}, {cust.address.city}
                      </p>
                    </div>
                    <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                      Ver Ficha <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Produtos */}
          {matchedProducts.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-blue-600" />
                Produtos ({matchedProducts.length})
              </p>
              <div className="space-y-1">
                {matchedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setCurrentTab('products');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50/60 cursor-pointer border border-transparent hover:border-blue-200 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{prod.name}</p>
                      <p className="text-[11px] text-gray-500">
                        Categoria: {prod.category} • Origem: {prod.origin}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-gray-800">
                      {formatBRL(prod.defaultPrice)} / {prod.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pedidos */}
          {matchedOrders.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-purple-600" />
                Pedidos ({matchedOrders.length})
              </p>
              <div className="space-y-1">
                {matchedOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setCurrentTab('orders');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-purple-50/60 cursor-pointer border border-transparent hover:border-purple-200 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {ord.orderNumber} - {ord.customerName}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Entrega: {ord.deliveryDate} • Status: {ord.status}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">
                      {formatBRL(ord.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entregas */}
          {matchedDeliveries.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-amber-600" />
                Entregas ({matchedDeliveries.length})
              </p>
              <div className="space-y-1">
                {matchedDeliveries.map((del) => (
                  <div
                    key={del.id}
                    onClick={() => {
                      setCurrentTab('deliveries');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-amber-50/60 cursor-pointer border border-transparent hover:border-amber-200 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {del.orderNumber} • {del.customerName}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Motorista: {del.driverName} • Bairro: {del.neighborhood}
                      </p>
                    </div>
                    <span className="text-xs text-amber-800 font-medium">
                      {del.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contas a Receber */}
          {matchedReceivables.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <CircleDollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Títulos Financeiros ({matchedReceivables.length})
              </p>
              <div className="space-y-1">
                {matchedReceivables.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      setCurrentTab('finance');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50/60 cursor-pointer border border-transparent hover:border-emerald-200 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{rec.customerName}</p>
                      <p className="text-[11px] text-gray-500">
                        Vencimento: {rec.dueDate} • Status: {rec.status}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-gray-900">
                      {formatBRL(rec.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-right text-[11px] text-gray-400">
          Dica: Pressione Esc para fechar a qualquer momento
        </div>
      </div>
    </div>
  );
};
