import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate } from '../../utils/formatters';

export const SuppliersView: React.FC = () => {
  const { suppliers, purchases, products } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'suppliers' | 'history'>('suppliers');

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.document.includes(searchTerm)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-emerald-600" />
            Fornecedores & Histórico de Compras
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Produtores rurais, cooperativas agrícolas, Ceagesp e registros de aquisição
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'suppliers'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>Fornecedores Cadastrados ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>Histórico de Compras Realizadas ({purchases.length})</span>
        </button>
      </div>

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const supplierPurchases = purchases.filter((p) => p.supplierId === s.id);
              const totalBought = supplierPurchases.reduce((acc, curr) => acc + curr.total, 0);

              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{s.name}</h3>
                      <p className="text-[11px] text-gray-400 font-mono">Doc: {s.document}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Produtor / Parceiro
                    </span>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span>{s.address}</span>
                    </p>
                    <p className="text-gray-500">Condição: {s.paymentCondition}</p>
                  </div>

                  {s.notes && (
                    <p className="text-[11px] text-gray-500 bg-emerald-50/50 p-2 rounded-lg">
                      {s.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">Total Comprado:</span>
                    <span className="font-black text-gray-900">{formatBRL(totalBought)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                  <th className="py-3 px-4">Nº Compra</th>
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">Data Compra</th>
                  <th className="py-3 px-4">Vencimento Contas a Pagar</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{pur.purchaseNumber}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{pur.supplierName}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(pur.date)}</td>
                    <td className="py-3 px-4 text-gray-700 font-semibold">{formatDate(pur.dueDate)}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {pur.items.map((it) => `${it.quantity} ${it.unit} ${it.productName}`).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">
                      {formatBRL(pur.total)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Recebido
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
