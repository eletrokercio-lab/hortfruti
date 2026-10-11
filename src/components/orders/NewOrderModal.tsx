import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  History,
  Pencil,
  RotateCcw,
  UserCog,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatUnit } from '../../utils/formatters';
import { PaymentMethod, PaymentTerm } from '../../types';
import { PriceInput } from '../ui/PriceInput';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDraft?: any;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  initialDraft,
}) => {
  const {
    customers,
    products,
    orders,
    createOrder,
    getProductPriceForCustomer,
    setCustomerCustomPrice,
  } = useApp();

  const [customerId, setCustomerId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>('7d');

  // Items list (unitPriceOverride = preço ajustado só para este pedido)
  const [items, setItems] = useState<
    { productId: string; quantity: number; unitPriceOverride?: number }[]
  >([]);

  // Editor de preço individual da linha
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  // Natural Language AI input field
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState('');

  // Default tomorrow for delivery
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDeliveryDate(tomorrow.toISOString().split('T')[0]);

      if (customers.length > 0 && !customerId) {
        // Pré-seleciona o primeiro cliente e já carrega os itens da última compra dele
        handleCustomerChange(customers[0].id);
      }

      if (initialDraft) {
        applyDraft(initialDraft);
      }
    }
  }, [isOpen, initialDraft, customers, products]);

  // When customer changes, update default payment conditions
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      setPaymentMethod(selected.paymentMethod);
      setPaymentTerm(selected.paymentTerm);
    }

    // Facilita o dia a dia: cliente que já pediu entra com os itens e os
    // preços da última compra já preenchidos (quando o rascunho está intocado)
    const last = orders
      .filter((o) => o.customerId === id && o.status !== 'cancelado')
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const pristine =
      items.length === 0 ||
      (items.length === 1 &&
        items[0].unitPriceOverride == null &&
        products[0] != null &&
        items[0].productId === products[0].id &&
        items[0].quantity === 10);
    if (last && last.items.length > 0 && pristine) {
      setItems(buildItemsFromOrder(last, id));
    } else if (items.length === 0 && products.length > 0) {
      setItems([{ productId: products[0].id, quantity: 10 }]);
    }
  };

  // Itens do último pedido do cliente, com o preço pago da última vez
  // (override quando o preço atual diverge do negociado naquela compra)
  const buildItemsFromOrder = (
    order: (typeof orders)[number],
    custId: string
  ): { productId: string; quantity: number; unitPriceOverride?: number }[] =>
    order.items
      .map((it) => {
        const exists = products.some((p) => p.id === it.productId);
        if (!exists) return null;
        const current = getProductPriceForCustomer(it.productId, custId).price;
        const lastPaid = Number(it.unitPrice) || 0;
        const override =
          lastPaid > 0 && Math.abs(current - lastPaid) > 0.005
            ? { unitPriceOverride: lastPaid }
            : {};
        return {
          productId: it.productId,
          quantity: Math.max(1, Math.round(it.quantity)),
          ...override,
        };
      })
      .filter((x): x is { productId: string; quantity: number; unitPriceOverride?: number } => x !== null);

  const applyDraft = (draft: any) => {
    if (draft.customerId) {
      handleCustomerChange(draft.customerId);
    } else if (draft.customerName) {
      const matched = customers.find(
        (c) =>
          c.name.toLowerCase().includes(draft.customerName.toLowerCase()) ||
          (c.tradeName && c.tradeName.toLowerCase().includes(draft.customerName.toLowerCase()))
      );
      if (matched) handleCustomerChange(matched.id);
    }

    if (draft.deliveryDate) {
      setDeliveryDate(draft.deliveryDate);
    }

    if (draft.notes) {
      setNotes(draft.notes);
    }

    if (draft.items && Array.isArray(draft.items) && draft.items.length > 0) {
      const mapped = draft.items.map((it: any) => {
        let pId = it.productId;
        if (!pId) {
          const matchedProd = products.find((p) =>
            p.name.toLowerCase().includes((it.productName || '').toLowerCase())
          );
          pId = matchedProd ? matchedProd.id : products[0]?.id;
        }
        return {
          productId: pId,
          quantity: it.quantity || 10,
        };
      });
      setItems(mapped);
    }
  };

  const handleAiParse = async () => {
    if (!aiInputText.trim()) return;
    setIsAiProcessing(true);
    setAiError('');

    try {
      const res = await fetch('/api/assistant/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naturalText: aiInputText,
          customersList: customers,
          productsList: products,
        }),
      });

      const data = await res.json();
      if (data.success && data.draft) {
        applyDraft(data.draft);
        setAiInputText('');
      } else {
        setAiError('Não foi possível interpretar o texto.');
      }
    } catch (err: any) {
      setAiError('Erro ao comunicar com IA: ' + err.message);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleAddItem = () => {
    if (products.length > 0) {
      setItems([...items, { productId: products[0].id, quantity: 10 }]);
    }
  };

  // Último pedido do cliente selecionado (para repetir itens)
  const lastCustomerOrder = orders
    .filter((o) => o.customerId === customerId && o.status !== 'cancelado')
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const handleRepeatLastOrder = () => {
    if (!lastCustomerOrder) return;
    const mapped = buildItemsFromOrder(lastCustomerOrder, customerId);
    if (mapped.length === 0) return;
    setItems(mapped);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItemProduct = (index: number, newProductId: string) => {
    const updated = [...items];
    updated[index].productId = newProductId;
    // Produto trocado invalida ajuste de preço da linha
    delete updated[index].unitPriceOverride;
    setItems(updated);
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, qty);
    setItems(updated);
  };

  const openPriceEditor = (idx: number) => {
    const it = items[idx];
    const current =
      it.unitPriceOverride != null
        ? it.unitPriceOverride
        : customerId
          ? getProductPriceForCustomer(it.productId, customerId).price
          : products.find((p) => p.id === it.productId)?.defaultPrice || 0;
    setEditingIdx(idx);
    setEditPrice(current > 0 ? current : 0);
  };

  const closePriceEditor = () => {
    setEditingIdx(null);
    setEditPrice(0);
  };

  // Salva como preço exclusivo do cliente (vale para este e os próximos pedidos)
  const handleSaveCustomerPrice = () => {
    const idx = editingIdx;
    if (idx == null || !customerId || editPrice <= 0) return;
    setCustomerCustomPrice(customerId, items[idx].productId, editPrice);
    // O cálculo normal já passa a usar o preço exclusivo — limpa o override
    const updated = [...items];
    delete updated[idx].unitPriceOverride;
    setItems(updated);
    closePriceEditor();
  };

  // Usa o valor ajustado apenas neste pedido
  const handleSaveOrderOnlyPrice = () => {
    const idx = editingIdx;
    if (idx == null || editPrice <= 0) return;
    const updated = [...items];
    updated[idx].unitPriceOverride = editPrice;
    setItems(updated);
    closePriceEditor();
  };

  // Volta ao preço da tabela/promoção (remove ajuste só-no-pedido)
  const handleResetPrice = (idx: number) => {
    const updated = [...items];
    delete updated[idx].unitPriceOverride;
    setItems(updated);
  };

  if (!isOpen) return null;

  // Calculate totals
  let totalOrder = 0;
  const itemsCalculation = items.map((it) => {
    const product = products.find((p) => p.id === it.productId);
    const priceInfo = customerId
      ? getProductPriceForCustomer(it.productId, customerId)
      : { price: product?.defaultPrice || 0, originalPrice: product?.defaultPrice || 0, isPromo: false };
    const hasOverride = it.unitPriceOverride != null && it.unitPriceOverride > 0;
    const price = hasOverride ? (it.unitPriceOverride as number) : priceInfo.price;
    const lineTotal = it.quantity * price;
    totalOrder += lineTotal;

    return {
      product,
      quantity: it.quantity,
      price,
      originalPrice: hasOverride ? priceInfo.price : priceInfo.originalPrice,
      isPromo: priceInfo.isPromo,
      hasOverride,
      lineTotal,
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    if (items.length === 0) return;

    createOrder({
      customerId,
      deliveryDate,
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        ...(it.unitPriceOverride != null && it.unitPriceOverride > 0
          ? { unitPrice: it.unitPriceOverride }
          : {}),
      })),
      notes,
      paymentMethod,
      paymentTerm,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl my-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-600 p-2 text-white shadow-xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Novo Pedido de Venda</h2>
              <p className="text-xs text-gray-500">
                Preços de cliente e promoções aplicados automaticamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* PRD §33: AI Quick Natural Language Command */}
        <div className="border-b border-gray-100 bg-linear-to-r from-emerald-50/70 to-teal-50/70 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-emerald-700 animate-pulse" />
            <span className="text-xs font-bold text-emerald-900">
              Digitação Rápida com IA (Opcional)
            </span>
          </div>
          <p className="text-[11px] text-emerald-800/80 mb-2">
            Escreva o pedido como veio do WhatsApp ou telefone (Ex: "Pedido do Sacolão para amanhã: 20 caixas de tomate, 10 de cebola e 5 de batata")
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiInputText}
              onChange={(e) => setAiInputText(e.target.value)}
              placeholder="Digite o pedido em linguagem natural..."
              className="flex-1 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAiParse();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAiParse}
              disabled={isAiProcessing || !aiInputText.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors shrink-0"
            >
              {isAiProcessing ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  <span>Preenchendo...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Preencher Pedido</span>
                </>
              )}
            </button>
          </div>
          {aiError && <p className="text-[11px] text-rose-600 mt-1">{aiError}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Top Fields: Cliente, Data Entrega, Pagamento, Prazo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Cliente *
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.tradeName ? `(${c.tradeName})` : ''}
                    </option>
                  ))}
                </select>
                {lastCustomerOrder && (
                  <button
                    type="button"
                    onClick={handleRepeatLastOrder}
                    className="flex shrink-0 items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                    title={`Puxa os itens do pedido ${lastCustomerOrder.orderNumber} (${new Date(lastCustomerOrder.date + 'T12:00:00').toLocaleDateString('pt-BR')})`}
                  >
                    <History className="h-3.5 w-3.5" />
                    Último pedido
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Data da Entrega *
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Condição / Prazo
              </label>
              <select
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value as PaymentTerm)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="sight">À vista na entrega</option>
                <option value="7d">Boleto 7 dias</option>
                <option value="15d">Boleto 15 dias</option>
                <option value="30d">Boleto 30 dias</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Produtos do Pedido ({items.length})
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Produto
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {itemsCalculation.map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 bg-white hover:bg-gray-50/50"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={row.product?.id}
                      onChange={(e) => handleUpdateItemProduct(idx, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Qtd:</span>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value, 10) || 1)}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs font-bold text-gray-900"
                      />
                      <span className="text-xs text-gray-500 font-semibold">{row.product?.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[200px]">
                    {editingIdx === idx ? (
                      // Editor de preço individual inline
                      <div className="w-full rounded-xl border border-emerald-300 bg-emerald-50/60 p-2.5">
                        <p className="mb-1 text-[10px] font-bold uppercase text-emerald-800">
                          Preço individual — {row.product?.name}
                        </p>
                        <PriceInput
                          key={`price-edit-${editingIdx}`}
                          value={editPrice}
                          onValueChange={setEditPrice}
                          className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-900"
                          autoFocus
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSaveCustomerPrice}
                            disabled={editPrice <= 0}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                            title="Vale para este e todos os próximos pedidos deste cliente"
                          >
                            <UserCog className="h-3 w-3" />
                            Preço do cliente
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveOrderOnlyPrice}
                            disabled={editPrice <= 0}
                            className="rounded-lg border border-emerald-600 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                            title="Usa este valor apenas neste pedido"
                          >
                            Só neste pedido
                          </button>
                          <button
                            type="button"
                            onClick={closePriceEditor}
                            className="ml-auto text-[10px] font-semibold text-gray-400 hover:text-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {row.isPromo && (
                              <span className="rounded bg-rose-100 px-1 text-[9px] font-bold text-rose-800">
                                PROMOÇÃO
                              </span>
                            )}
                            {row.hasOverride ? (
                              <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                                AJUSTADO
                              </span>
                            ) : (
                              row.price !== row.originalPrice &&
                              !row.isPromo && (
                                <span className="rounded bg-blue-100 px-1 text-[9px] font-bold text-blue-800">
                                  PREÇO CLIENTE
                                </span>
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => openPriceEditor(idx)}
                              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold shadow-xs transition-colors ${
                                row.hasOverride
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                  : row.price !== row.originalPrice && !row.isPromo
                                    ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
                                    : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title="Clique para definir preço individual para este cliente"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>{formatBRL(row.price)}</span>
                            </button>
                            {row.hasOverride && (
                              <button
                                type="button"
                                onClick={() => handleResetPrice(idx)}
                                className="rounded p-0.5 text-gray-300 hover:text-amber-700"
                                title="Voltar ao preço da tabela"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs font-bold text-emerald-700">
                            = {formatBRL(row.lineTotal)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="rounded-lg p-1.5 text-gray-400 hover:text-rose-600 disabled:opacity-30"
                          title="Remover Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Observações para Separação / Motorista
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entregar pela Doca 2 até 08h30. Conferir caixas no ato."
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Total & Confirmation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-200 pt-4 bg-gray-50 -mx-6 -mb-6 p-6">
            <div>
              <p className="text-xs text-gray-500">Valor Total do Pedido:</p>
              <p className="text-2xl font-black text-emerald-800">{formatBRL(totalOrder)}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar e Gerar Entrega</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
