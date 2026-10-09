import React, { useState } from 'react';
import { PriceInput } from '../ui/PriceInput';
import {
  PackageSearch,
  CalendarCheck,
  ShoppingCart,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Trash2,
  Copy,
  Printer,
  MessageCircle,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate } from '../../utils/formatters';

export const PlanningView: React.FC = () => {
  const {
    calculateProductNeeds,
    harvestPlans,
    createHarvestPlan,
    updateHarvestStatus,
    deleteHarvestPlan,
    products,
    suppliers,
    createPurchase,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'needs' | 'harvest'>('needs');
  const [copiedHarvest, setCopiedHarvest] = useState(false);

  const harvestStatusLabel = (status: string) =>
    status === 'concluido'
      ? 'Concluído'
      : status === 'colhendo'
      ? 'Colhendo'
      : status === 'em_preparacao'
      ? 'Em Preparação'
      : 'Pendente';

  // Lista de colheita em texto (copiar / WhatsApp / imprimir)
  const buildHarvestText = () => {
    const lines = harvestPlans.map(
      (hp, i) =>
        `${i + 1}) ${hp.productName}\n   Colher: ${hp.harvestQty} ${hp.unit} (necessário ${hp.neededQty} ${hp.unit})\n   Data: ${formatDate(hp.date)} · Responsável: ${hp.responsible}${hp.supplierName ? `\n   Fornecedor: ${hp.supplierName}` : ''} · ${harvestStatusLabel(hp.status)}${hp.notes ? `\n   Obs: ${hp.notes}` : ''}`
    );
    return `🧺 ORDEM DE COLHEITA (${harvestPlans.length} ${harvestPlans.length === 1 ? 'item' : 'itens'})\n\n${lines.join('\n\n')}`;
  };

  const copyHarvestList = async () => {
    try {
      await navigator.clipboard.writeText(buildHarvestText());
      setCopiedHarvest(true);
      setTimeout(() => setCopiedHarvest(false), 2000);
    } catch {
      // fallback antigo
      const ta = document.createElement('textarea');
      ta.value = buildHarvestText();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedHarvest(true);
      setTimeout(() => setCopiedHarvest(false), 2000);
    }
  };

  const sendHarvestWhatsapp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildHarvestText())}`, '_blank');
  };

  const printHarvestList = () => {
    const rows = harvestPlans
      .map(
        (hp) => `
          <tr>
            <td><strong>${hp.productName}</strong><br/><small>${hp.notes || ''}</small></td>
            <td>${hp.neededQty} ${hp.unit}</td>
            <td><strong>${hp.harvestQty} ${hp.unit}</strong></td>
            <td>${formatDate(hp.date)}</td>
            <td>${hp.responsible}</td>
            <td>${hp.supplierName || '—'}</td>
            <td>${harvestStatusLabel(hp.status)}</td>
          </tr>`
      )
      .join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
      <title>Ordem de Colheita</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#111}
        h1{font-size:18px;margin:0 0 2px}
        p.sub{color:#555;font-size:12px;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
        th{background:#ecfdf5;text-transform:uppercase;font-size:10px}
        small{color:#666}
        @media print{button{display:none}}
      </style></head><body>
      <h1>Ordem de Colheita</h1>
      <p class="sub">Emitida em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${harvestPlans.length} ${harvestPlans.length === 1 ? 'item' : 'itens'}</p>
      <table><thead><tr><th>Produto</th><th>Necessário</th><th>A Colher</th><th>Data</th><th>Responsável</th><th>Fornecedor</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    w.document.close();
  };

  // Purchase modal state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
  const [purchaseDueDate, setPurchaseDueDate] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    { productId: string; quantity: number; unitCost: number }[]
  >([]);

  // Harvest modal state
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [harvestProductId, setHarvestProductId] = useState('');
  const [harvestNeededQty, setHarvestNeededQty] = useState<number>(20);
  const [harvestQty, setHarvestQty] = useState<number>(25);
  const [harvestDate, setHarvestDate] = useState('');
  const [harvestResponsible, setHarvestResponsible] = useState('Sebastião (Horta Mogi)');
  const [harvestSupplierId, setHarvestSupplierId] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');

  const needs = calculateProductNeeds();
  const purchasesNeeded = needs.filter((n) => n.status === 'comprar');
  const harvestsNeeded = needs.filter((n) => n.status === 'colher');

  // Quick Resolve Purchases modal launcher
  const handleOpenResolvePurchases = (preselectedProduct?: any) => {
    if (suppliers.length > 0) {
      setPurchaseSupplierId(suppliers[0].id);
    }
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setPurchaseDueDate(nextWeek.toISOString().split('T')[0]);

    if (preselectedProduct) {
      setPurchaseItems([
        {
          productId: preselectedProduct.productId,
          quantity: preselectedProduct.deficit,
          unitCost: products.find((p) => p.id === preselectedProduct.productId)?.avgCost || 50,
        },
      ]);
    } else {
      // Pre-fill with all missing items
      const itemsToBuy = purchasesNeeded.map((n) => ({
        productId: n.productId,
        quantity: n.deficit,
        unitCost: products.find((p) => p.id === n.productId)?.avgCost || 50,
      }));
      setPurchaseItems(itemsToBuy.length > 0 ? itemsToBuy : [{ productId: products[0].id, quantity: 20, unitCost: 40 }]);
    }

    setIsPurchaseModalOpen(true);
  };

  const handleOpenHarvestModal = (preselectedProduct?: any) => {
    const today = new Date().toISOString().split('T')[0];
    setHarvestDate(today);
    setHarvestSupplierId('');

    if (preselectedProduct) {
      setHarvestProductId(preselectedProduct.productId);
      setHarvestNeededQty(preselectedProduct.neededQty);
      setHarvestQty(preselectedProduct.neededQty);
    } else if (products.length > 0) {
      const folhagem = products.find((p) => p.category === 'folhagens' || p.category === 'temperos');
      setHarvestProductId(folhagem ? folhagem.id : products[0].id);
      setHarvestNeededQty(15);
      setHarvestQty(20);
    }

    setIsHarvestModalOpen(true);
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseSupplierId || purchaseItems.length === 0) return;

    createPurchase(purchaseSupplierId, purchaseDueDate, purchaseItems);
    setIsPurchaseModalOpen(false);
  };

  const handleSubmitHarvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!harvestProductId) return;

    const supplier = suppliers.find((s) => s.id === harvestSupplierId);
    createHarvestPlan(
      harvestProductId,
      harvestNeededQty,
      harvestQty,
      harvestDate,
      harvestResponsible,
      harvestNotes,
      supplier ? { id: supplier.id, name: supplier.name } : undefined
    );
    setIsHarvestModalOpen(false);
  };

  // Envia uma ordem de colheita para o WhatsApp do fornecedor vinculado
  const sendHarvestToSupplier = (hp: any) => {
    const supplier = suppliers.find((s) => s.id === hp.supplierId);
    const phone = (supplier?.whatsapp || supplier?.phone || '').replace(/\D/g, '');
    const text = `🧺 *ORDEM DE COLHEITA*\n\nProduto: ${hp.productName}\nColher: ${hp.harvestQty} ${hp.unit} (necessário ${hp.neededQty} ${hp.unit})\nData: ${formatDate(hp.date)}\nResponsável: ${hp.responsible}${hp.notes ? `\nObs: ${hp.notes}` : ''}`;
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <PackageSearch className="h-6 w-6 text-emerald-600" />
            Planejamento & Necessidades Operacionais
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cálculo dinâmico: Quanto precisamos ter disponível para atender todos os pedidos?
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenResolvePurchases()}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Resolver Compras</span>
          </button>

          <button
            onClick={() => handleOpenHarvestModal()}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
          >
            <CalendarCheck className="h-4 w-4 text-amber-600" />
            <span>Planejar Colheita</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('needs')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'needs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <PackageSearch className="h-4 w-4" />
          <span>Matriz de Necessidades ({needs.length} produtos)</span>
          {purchasesNeeded.length > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {purchasesNeeded.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('harvest')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'harvest'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Planejamento de Colheita ({harvestPlans.length})</span>
        </button>
      </div>

      {/* Tab 1: Matriz de Necessidades (PRD §12, §14) */}
      {activeTab === 'needs' && (
        <div className="space-y-4">
          {/* Alert cards for immediate action */}
          {purchasesNeeded.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔴</span>
                <div>
                  <h3 className="text-xs font-bold">
                    Atenção: {purchasesNeeded.length} produto(s) com quantidade insuficiente para os pedidos!
                  </h3>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Você pode converter todas as necessidades em um pedido de compra com 1 clique no botão "Resolver Compras".
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenResolvePurchases()}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs shrink-0"
              >
                Resolver Compras Agora
              </button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-right">Necessário p/ Pedidos</th>
                    <th className="py-3 px-4 text-right">Já Disponível / Previsto</th>
                    <th className="py-3 px-4 text-right">Falta (Déficit)</th>
                    <th className="py-3 px-4">Situação</th>
                    <th className="py-3 px-4 text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {needs.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{item.productName}</td>
                      <td className="py-3 px-4 text-gray-500 capitalize">{item.category}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-700">
                        {item.neededQty} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {item.availableQty} {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        {item.deficit > 0 ? (
                          <span className="text-rose-600">-{item.deficit} {item.unit}</span>
                        ) : (
                          <span className="text-emerald-700">0 {item.unit}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'comprar' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                            🔴 Faltam {item.deficit} {item.unit}
                          </span>
                        )}
                        {item.status === 'colher' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            🟡 Colher {item.deficit} {item.unit}
                          </span>
                        )}
                        {item.status === 'suficiente' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            🟢 Quantidade suficiente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.status === 'comprar' && (
                          <button
                            onClick={() => handleOpenResolvePurchases(item)}
                            className="rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                          >
                            Comprar
                          </button>
                        )}
                        {item.status === 'colher' && (
                          <button
                            onClick={() => handleOpenHarvestModal(item)}
                            className="rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                          >
                            Colher
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Planejamento de Colheita (PRD §13) */}
      {activeTab === 'harvest' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {harvestPlans.length > 0 && (
              <>
                <button
                  onClick={copyHarvestList}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> {copiedHarvest ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={printHarvestList}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </button>
                <button
                  onClick={sendHarvestWhatsapp}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </button>
              </>
            )}
            <button
              onClick={() => handleOpenHarvestModal()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs"
            >
              <Plus className="h-4 w-4" /> Nova Ordem de Colheita
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {harvestPlans.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-200">
                Nenhum plano de colheita cadastrado.
              </div>
            ) : (
              harvestPlans.map((hp) => {
                const cardSupplier = suppliers.find((s) => s.id === hp.supplierId);
                return (
                <div
                  key={hp.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{hp.productName}</h3>
                      <p className="text-[11px] text-gray-500">
                        Responsável: <span className="font-semibold text-gray-700">{hp.responsible}</span>
                      </p>
                      {cardSupplier && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                          <ShoppingCart className="h-3 w-3 text-emerald-600" />
                          Fornecedor: <span className="font-semibold text-gray-700">{cardSupplier.name}</span>
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        hp.status === 'concluido'
                          ? 'bg-emerald-100 text-emerald-800'
                          : hp.status === 'colhendo'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {hp.status === 'concluido'
                        ? 'Concluído'
                        : hp.status === 'colhendo'
                        ? 'Colhendo'
                        : hp.status === 'em_preparacao'
                        ? 'Em Preparação'
                        : 'Pendente'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-2 text-xs">
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">Necessário</span>
                      <span className="font-semibold text-gray-800">{hp.neededQty} {hp.unit}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold block">A Colher</span>
                      <span className="font-bold text-emerald-700">{hp.harvestQty} {hp.unit}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Data: {formatDate(hp.date)}</span>
                  </div>

                  {hp.notes && (
                    <p className="text-[11px] text-gray-600 bg-amber-50/50 p-2 rounded-lg">
                      {hp.notes}
                    </p>
                  )}

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Status:</span>
                    <div className="flex items-center gap-2">
                      {cardSupplier && (
                        <button
                          onClick={() => sendHarvestToSupplier(hp)}
                          title={`Enviar ordem para ${cardSupplier.name} no WhatsApp`}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <select
                        value={hp.status}
                        onChange={(e) => updateHarvestStatus(hp.id, e.target.value as any)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-800"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="em_preparacao">Em Preparação</option>
                        <option value="colhendo">Colhendo</option>
                        <option value="concluido">Concluído</option>
                      </select>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir a ordem de colheita de ${hp.productName}?`)) {
                            deleteHarvestPlan(hp.id);
                          }
                        }}
                        title="Excluir ordem de colheita"
                        className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal: Resolver Compras */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-gray-900">Registrar Compra com Fornecedor</h3>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fornecedor *</label>
                  <select
                    value={purchaseSupplierId}
                    onChange={(e) => setPurchaseSupplierId(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vencimento Contas a Pagar</label>
                  <input
                    type="date"
                    value={purchaseDueDate}
                    onChange={(e) => setPurchaseDueDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              {/* Items to buy */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                  Itens da Compra ({purchaseItems.length})
                </label>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-52 overflow-y-auto">
                  {purchaseItems.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.productId);
                    return (
                      <div key={idx} className="flex items-center justify-between p-2.5 text-xs gap-3">
                        <div className="flex-1 font-bold text-gray-800">{prod?.name}</div>
                        <div className="flex items-center gap-2">
                          <PriceInput
                            min="1"
                            value={it.quantity}
                            onValueChange={(v) => {
                              const copy = [...purchaseItems];
                              copy[idx].quantity = v || 1;
                              setPurchaseItems(copy);
                            }}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-right text-xs font-bold"
                          />
                          <span className="text-gray-500 text-[11px] font-semibold">{prod?.unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-[10px]">Custo R$:</span>
                          <PriceInput
                            value={it.unitCost}
                            onValueChange={(v) => {
                              const copy = [...purchaseItems];
                              copy[idx].unitCost = v;
                              setPurchaseItems(copy);
                            }}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-right text-xs font-bold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-xs text-gray-500">
                  Total Compra: R${' '}
                  {purchaseItems
                    .reduce((acc, curr) => acc + curr.quantity * curr.unitCost, 0)
                    .toFixed(2)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPurchaseModalOpen(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs"
                  >
                    Confirmar Compra
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Planejar Colheita */}
      {isHarvestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-amber-700" />
                <h3 className="font-bold text-sm text-gray-900">Planejar Ordem de Colheita</h3>
              </div>
              <button
                onClick={() => setIsHarvestModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHarvest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Produto da Horta *</label>
                <select
                  value={harvestProductId}
                  onChange={(e) => setHarvestProductId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit}) - Origem: {p.origin}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Fornecedor / Produtor <span className="text-gray-400 font-normal">(quem vai entregar a colheita)</span>
                </label>
                <select
                  value={harvestSupplierId}
                  onChange={(e) => setHarvestSupplierId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                >
                  <option value="">— Sem fornecedor vinculado —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.whatsapp || s.phone ? ` · ${s.whatsapp || s.phone}` : ''}
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="mt-1 text-[10px] text-gray-400">
                    Nenhum fornecedor cadastrado ainda. Cadastre na aba Fornecedores.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Qtd Necessária</label>
                  <PriceInput
                    value={harvestNeededQty}
                    onValueChange={setHarvestNeededQty}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Qtd a Colher</label>
                  <PriceInput
                    value={harvestQty}
                    onValueChange={setHarvestQty}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Data da Colheita</label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Responsável</label>
                  <input
                    type="text"
                    value={harvestResponsible}
                    onChange={(e) => setHarvestResponsible(e.target.value)}
                    placeholder="Ex: Sebastião (Horta)"
                    required
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observações da Colheita</label>
                <input
                  type="text"
                  value={harvestNotes}
                  onChange={(e) => setHarvestNotes(e.target.value)}
                  placeholder="Ex: Colher no primeiro turno antes das 08h"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsHarvestModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Salvar Colheita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
