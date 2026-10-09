import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  MessageCircle,
  MapPin,
  Pencil,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate } from '../../utils/formatters';
import { Supplier } from '../../types';

const emptyForm = {
  name: '',
  document: '',
  phone: '',
  whatsapp: '',
  address: '',
  paymentCondition: '',
  notes: '',
  suppliedProducts: '',
};

export const SuppliersView: React.FC = () => {
  const { suppliers, purchases, createSupplier, updateSupplier } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'suppliers' | 'history'>('suppliers');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const setField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      document: s.document,
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      address: s.address || '',
      paymentCondition: s.paymentCondition || '',
      notes: s.notes || '',
      suppliedProducts: (s.suppliedProducts || []).join(', '),
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Informe o nome do fornecedor.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      document: form.document.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      address: form.address.trim(),
      paymentCondition: form.paymentCondition.trim() || 'A combinar',
      notes: form.notes.trim() || undefined,
      suppliedProducts: form.suppliedProducts
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
    };
    if (editingId) {
      const current = suppliers.find((s) => s.id === editingId);
      updateSupplier({ ...(current as Supplier), ...payload });
    } else {
      createSupplier(payload);
    }
    setSaving(false);
    setModalOpen(false);
  };

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
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 self-start rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </button>
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
          {suppliers.length > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar fornecedor..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs text-gray-800 outline-none focus:border-emerald-400"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center">
              <p className="text-sm font-bold text-gray-700">
                {suppliers.length === 0 ? 'Nenhum fornecedor cadastrado ainda' : 'Nada encontrado'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {suppliers.length === 0
                  ? 'Clique em "Novo Fornecedor" para cadastrar seu primeiro produtor ou cooperativa.'
                  : 'Tente buscar por outro nome ou documento.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => {
                const supplierPurchases = purchases.filter((p) => p.supplierId === s.id);
                const totalBought = supplierPurchases.reduce((acc, curr) => acc + curr.total, 0);
                const waNumber = (s.whatsapp || s.phone || '').replace(/\D/g, '');

                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">{s.name}</h3>
                        {s.document && (
                          <p className="text-[11px] text-gray-400 font-mono">Doc: {s.document}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Produtor / Parceiro
                        </span>
                        <button
                          onClick={() => openEdit(s)}
                          title="Editar fornecedor"
                          className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600 space-y-1">
                      {s.address && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span>{s.address}</span>
                        </p>
                      )}
                      {waNumber && (
                        <p className="flex items-center gap-1.5">
                          <MessageCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <a
                            href={`https://wa.me/55${waNumber}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {s.whatsapp || s.phone}
                          </a>
                        </p>
                      )}
                      <p className="text-gray-500">Condição: {s.paymentCondition}</p>
                      {s.suppliedProducts && s.suppliedProducts.length > 0 && (
                        <p className="text-gray-500">Fornece: {s.suppliedProducts.join(', ')}</p>
                      )}
                    </div>

                    {s.notes && (
                      <p className="text-[11px] text-gray-500 bg-emerald-50/50 p-2 rounded-lg">
                        {s.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      <span className="text-gray-500">
                        Compras: {supplierPurchases.length}
                        {supplierPurchases.length > 0 && (
                          <span className="text-gray-400">
                            {' '}· últ. {formatDate(supplierPurchases[0].date)}
                          </span>
                        )}
                      </span>
                      <span className="font-black text-gray-900">{formatBRL(totalBought)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400">
                      Nenhuma compra registrada ainda.
                    </td>
                  </tr>
                )}
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

      {/* Modal: Novo / Editar Fornecedor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-black text-gray-900">
                  {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 px-6 py-5">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Ex: Produtor Rural João / Cooperativa Verde"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">CPF / CNPJ</label>
                  <input
                    value={form.document}
                    onChange={(e) => setField('document', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Condição de Pagamento</label>
                  <input
                    value={form.paymentCondition}
                    onChange={(e) => setField('paymentCondition', e.target.value)}
                    placeholder="Ex: PIX na entrega / 28 dias"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Telefone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">WhatsApp</label>
                  <input
                    value={form.whatsapp}
                    onChange={(e) => setField('whatsapp', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Endereço</label>
                <input
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder="Cidade, sítio/rodovia ou referência"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Produtos que fornece</label>
                <input
                  value={form.suppliedProducts}
                  onChange={(e) => setField('suppliedProducts', e.target.value)}
                  placeholder="Separe por vírgula: Tomate, Alface, Banana"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                />
              </div>

              {formError && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
