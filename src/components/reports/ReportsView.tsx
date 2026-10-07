import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  ShoppingBag,
  Truck,
  Users,
  Box,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate } from '../../utils/formatters';

export const ReportsView: React.FC = () => {
  const { orders, customers, products, deliveries, purchases } = useApp();

  const [reportType, setReportType] = useState<'sales' | 'customers' | 'products' | 'deliveries'>('sales');

  // Customer sales ranking
  const customerRankings = customers.map((c) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const total = custOrders.reduce((acc, curr) => acc + curr.total, 0);
    return {
      customer: c,
      ordersCount: custOrders.length,
      total,
    };
  }).sort((a, b) => b.total - a.total);

  // Products sales ranking
  const productRankings = products.map((p) => {
    let totalQty = 0;
    let totalRevenue = 0;
    orders.forEach((o) => {
      o.items.forEach((it) => {
        if (it.productId === p.id) {
          totalQty += it.quantity;
          totalRevenue += it.subtotal;
        }
      });
    });
    return {
      product: p,
      totalQty,
      totalRevenue,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
            Relatórios Gerenciais
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Rankings de vendas, curva de produtos mais vendidos e performance de entregas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-2">
        <button
          onClick={() => setReportType('sales')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            reportType === 'sales'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Vendas por Pedido</span>
        </button>

        <button
          onClick={() => setReportType('customers')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            reportType === 'customers'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Maiores Clientes (Faturamento)</span>
        </button>

        <button
          onClick={() => setReportType('products')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            reportType === 'products'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Box className="h-4 w-4" />
          <span>Produtos Mais Vendidos</span>
        </button>

        <button
          onClick={() => setReportType('deliveries')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            reportType === 'deliveries'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Performance de Entregas</span>
        </button>
      </div>

      {/* Tab: Sales */}
      {reportType === 'sales' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Qtd Itens</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{o.orderNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(o.date)}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{o.customerName}</td>
                    <td className="py-3 px-4 text-gray-600">{o.items.length} itens</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">{formatBRL(o.total)}</td>
                    <td className="py-3 px-4 font-semibold capitalize text-gray-700">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Customers */}
      {reportType === 'customers' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Posição</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Bairro / Cidade</th>
                  <th className="py-3 px-4 text-center">Nº de Pedidos</th>
                  <th className="py-3 px-4 text-right">Total Faturado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerRankings.map((cr, idx) => (
                  <tr key={cr.customer.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-400">#{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-gray-900">{cr.customer.name}</td>
                    <td className="py-3 px-4 text-gray-500">{cr.customer.address.neighborhood}, {cr.customer.address.city}</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-700">{cr.ordersCount}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">{formatBRL(cr.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Products */}
      {reportType === 'products' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Volume Vendido</th>
                  <th className="py-3 px-4 text-right">Faturamento Gerado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productRankings.map((pr) => (
                  <tr key={pr.product.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">{pr.product.name}</td>
                    <td className="py-3 px-4 capitalize text-gray-500">{pr.product.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-700">
                      {pr.totalQty} {pr.product.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">
                      {formatBRL(pr.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Deliveries */}
      {reportType === 'deliveries' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Motorista</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Caixas Entregues</th>
                  <th className="py-3 px-4">Caixas Devolvidas</th>
                  <th className="py-3 px-4">Ocorrência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{d.orderNumber}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{d.customerName}</td>
                    <td className="py-3 px-4 text-gray-700">{d.driverName}</td>
                    <td className="py-3 px-4 font-semibold capitalize">{d.status}</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{d.cratesDelivered}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{d.cratesReturned}</td>
                    <td className="py-3 px-4 text-rose-600 font-medium">{d.issueReport || 'Sem ocorrências'}</td>
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
