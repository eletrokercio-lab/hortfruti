import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';
import { CrateRecord } from '../../types';

export const CratesManagement: React.FC = () => {
  const { customers, crates, getCustomerCrateBalance } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [returnQty, setReturnQty] = useState<number>(5);
  const [returnNotes, setReturnNotes] = useState('');

  // Summarize per customer
  const customerCratesSummary = customers.map((c) => {
    const balance = getCustomerCrateBalance(c.id);
    const history = crates.filter((cr) => cr.customerId === c.id);
    const totalSent = history.reduce((acc, curr) => acc + curr.sent, 0);
    const totalReturned = history.reduce((acc, curr) => acc + curr.returned, 0);

    return {
      customer: c,
      balance,
      totalSent,
      totalReturned,
      history,
    };
  });

  const filtered = customerCratesSummary.filter(
    (item) =>
      item.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.customer.tradeName && item.customer.tradeName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalOutstandingCrates = customerCratesSummary.reduce(
    (acc, curr) => acc + curr.balance,
    0
  );

  const handleOpenReturn = (cId: string) => {
    setSelectedCustomerId(cId);
    setReturnQty(5);
    setReturnNotes('Recolhimento avulso no estabelecimento');
    setIsReturnModalOpen(true);
  };

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || returnQty <= 0) return;

    // Direct update to local crates record
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;

    const newEntry: CrateRecord = {
      id: `crate-${Date.now()}`,
      customerId: cust.id,
      customerName: cust.name,
      type: 'caixa_plastica_k',
      sent: 0,
      returned: returnQty,
      balance: -returnQty,
      date: new Date().toISOString().split('T')[0],
      notes: returnNotes || `Devolução avulsa de ${returnQty} caixas`,
    };

    // Save into localStorage
    const saved = localStorage.getItem('hg_crates');
    const list: CrateRecord[] = saved ? JSON.parse(saved) : crates;
    localStorage.setItem('hg_crates', JSON.stringify([newEntry, ...list]));
    window.location.reload(); // Simple sync
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-600" />
            Controle de Vasilhames & Caixas Retornáveis
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Rastreamento de caixas plásticas K e engradados em poder dos clientes
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-right">
          <span className="text-[10px] uppercase font-bold text-blue-700 block">
            Total de Caixas com Clientes
          </span>
          <span className="text-xl font-black text-blue-900">
            {totalOutstandingCrates} caixas pendentes
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por cliente para consultar saldo de caixas..."
          className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs"
        />
      </div>

      {/* Customer Crates Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Bairro / Cidade</th>
                <th className="py-3 px-4 text-right">Total Enviadas</th>
                <th className="py-3 px-4 text-right">Total Devolvidas</th>
                <th className="py-3 px-4 text-right">Saldo Devedor</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.customer.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-gray-900">{item.customer.name}</p>
                    {item.customer.tradeName && (
                      <p className="text-[11px] text-gray-500">{item.customer.tradeName}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {item.customer.address.neighborhood}, {item.customer.address.city}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 font-semibold">
                    {item.totalSent} caixas
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                    {item.totalReturned} caixas
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block font-black text-sm ${
                        item.balance > 0 ? 'text-blue-800' : 'text-gray-400'
                      }`}
                    >
                      {item.balance} caixas pendentes
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleOpenReturn(item.customer.id)}
                      className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-100"
                    >
                      Registrar Devolução
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement Log */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Extrato de Entradas e Saídas de Vasilhames</h3>
        <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
          {crates.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 text-xs bg-white hover:bg-gray-50">
              <div>
                <p className="font-bold text-gray-900">{c.customerName}</p>
                <p className="text-[11px] text-gray-500">{formatDate(c.date)} • {c.notes}</p>
              </div>
              <div className="text-right">
                {c.sent > 0 && <span className="text-blue-700 font-bold block">+{c.sent} enviadas</span>}
                {c.returned > 0 && <span className="text-emerald-700 font-bold block">-{c.returned} devolvidas</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Registrar Devolução */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-gray-900 mb-1">Registrar Devolução de Caixas</h3>
            <p className="text-xs text-gray-500 mb-4">
              Cliente: {customers.find((c) => c.id === selectedCustomerId)?.name}
            </p>

            <form onSubmit={handleSaveReturn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Quantidade de Caixas Devolvidas
                </label>
                <input
                  type="number"
                  min="1"
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Observação / Conferente
                </label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Ex: Motorista Roberto recolheu 5 caixas limpas"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Confirmar Devolução
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
