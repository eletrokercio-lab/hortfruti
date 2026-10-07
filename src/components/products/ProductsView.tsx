import React, { useState } from 'react';
import {
  Box,
  Plus,
  Search,
  Filter,
  Layers,
  Edit2,
  CheckCircle2,
  X,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory, ProductSalesType, ProductUnit } from '../../types';
import { formatBRL } from '../../utils/formatters';

export const ProductsView: React.FC = () => {
  const { products, createProduct, updateProduct } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('legumes');
  const [unit, setUnit] = useState<ProductUnit>('cx');
  const [salesType, setSalesType] = useState<ProductSalesType>('caixa');
  const [defaultPrice, setDefaultPrice] = useState<number>(50);
  const [avgCost, setAvgCost] = useState<number>(30);
  const [origin, setOrigin] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.origin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenNew = () => {
    setEditingProduct(null);
    setName('');
    setCategory('legumes');
    setUnit('cx');
    setSalesType('caixa');
    setDefaultPrice(50);
    setAvgCost(30);
    setOrigin('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setSalesType(p.salesType);
    setDefaultPrice(p.defaultPrice);
    setAvgCost(p.avgCost);
    setOrigin(p.origin);
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name,
        category,
        unit,
        salesType,
        defaultPrice,
        avgCost,
        origin,
        notes,
      });
    } else {
      createProduct({
        name,
        category,
        unit,
        salesType,
        defaultPrice,
        avgCost,
        origin,
        notes,
        status: 'active',
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Box className="h-6 w-6 text-emerald-600" />
            Catálogo de Produtos & Tabela Base
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cadastro de hortifrutis, custos médios, unidades e margens de venda
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do produto ou região de origem..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 focus:bg-white focus:outline-hidden"
          >
            <option value="all">Todas Categorias</option>
            <option value="frutas">Frutas</option>
            <option value="legumes">Legumes</option>
            <option value="verduras">Verduras</option>
            <option value="folhagens">Folhagens</option>
            <option value="temperos">Temperos</option>
            <option value="tuberculos">Tubérculos</option>
            <option value="outros">Outros</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Unidade</th>
                <th className="py-3 px-4">Origem / Produtor</th>
                <th className="py-3 px-4 text-right">Custo Médio</th>
                <th className="py-3 px-4 text-right">Preço Venda Base</th>
                <th className="py-3 px-4 text-right">Margem Est.</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((prod) => {
                const margin =
                  prod.defaultPrice > 0
                    ? ((prod.defaultPrice - prod.avgCost) / prod.defaultPrice) * 100
                    : 0;

                return (
                  <tr key={prod.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900">{prod.name}</p>
                      {prod.notes && <p className="text-[10px] text-gray-400">{prod.notes}</p>}
                    </td>
                    <td className="py-3 px-4 capitalize text-gray-600">{prod.category}</td>
                    <td className="py-3 px-4 font-mono font-bold text-gray-700">{prod.unit}</td>
                    <td className="py-3 px-4 text-gray-500">{prod.origin}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatBRL(prod.avgCost)}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-800">
                      {formatBRL(prod.defaultPrice)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-emerald-50/60">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-gray-900">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto Hortifruti'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Tomate Italiano 1A"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="frutas">Frutas</option>
                    <option value="legumes">Legumes</option>
                    <option value="verduras">Verduras</option>
                    <option value="folhagens">Folhagens</option>
                    <option value="temperos">Temperos</option>
                    <option value="tuberculos">Tubérculos</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ProductUnit)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="cx">cx (Caixa)</option>
                    <option value="kg">kg (Quilo)</option>
                    <option value="un">un (Unidade)</option>
                    <option value="saco">saco (Saco)</option>
                    <option value="bandeja">bandeja</option>
                    <option value="duzia">dúzia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Venda</label>
                  <select
                    value={salesType}
                    onChange={(e) => setSalesType(e.target.value as ProductSalesType)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="caixa">Caixa</option>
                    <option value="peso">Peso (kg)</option>
                    <option value="unidade">Unidade</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Custo Médio (R$)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={avgCost}
                    onChange={(e) => setAvgCost(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Preço Padrão Venda (R$)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Origem / Região Produtora</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Ex: Fazenda Vale do Sol - Bragança"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Observações de Seleção / Embalagem</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Caixa com 20kg selecionada ponto 1"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
