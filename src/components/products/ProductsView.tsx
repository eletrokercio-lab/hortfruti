import React, { useEffect, useState } from 'react';
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
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory, ProductSalesType, ProductUnit } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { searchProductImages, getCuratedImage, ProductImageOption } from '../../services/productImageSearch';

export const ProductsView: React.FC = () => {
  const { products, createProduct, updateProduct } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [showPhotoReview, setShowPhotoReview] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('legumes');
  const [unit, setUnit] = useState<ProductUnit>('cx');
  const [salesType, setSalesType] = useState<ProductSalesType>('caixa');
  const [defaultPrice, setDefaultPrice] = useState<number>(50);
  const [avgCost, setAvgCost] = useState<number>(30);
  const [origin, setOrigin] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imgOptions, setImgOptions] = useState<ProductImageOption[]>([]);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgSearchedFor, setImgSearchedFor] = useState('');

  // Busca automática de fotos enquanto o nome é digitado (debounce 700ms).
  // Limpa as opções antigas imediatamente e ignora respostas fora de ordem.
  useEffect(() => {
    if (!isModalOpen || name.trim().length < 3) {
      setImgOptions([]);
      setImgSearchedFor('');
      return;
    }
    setImgOptions([]);
    setImgLoading(true);
    const term = name.trim();
    const timer = setTimeout(async () => {
      const opts = await searchProductImages(term, 4);
      // só aplica se o nome ainda for o mesmo (evita foto do produto anterior)
      if (name.trim() === term) {
        setImgOptions(opts);
        setImgSearchedFor(term);
        setImgLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [name, isModalOpen]);

  // Hortifrutis comuns: 1 toque preenche o cadastro (só ajustar preço)
  const QUICK_CATALOG: { name: string; category: ProductCategory; unit: ProductUnit; salesType: ProductSalesType; cost: number; price: number }[] = [
    { name: 'Tomate Italiano', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 60, price: 85 },
    { name: 'Tomate Salada', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 50, price: 72 },
    { name: 'Cebola Pêra Nacional', category: 'legumes', unit: 'saco', salesType: 'peso', cost: 55, price: 75 },
    { name: 'Batata Inglesa Lavada', category: 'tuberculos', unit: 'saco', salesType: 'peso', cost: 95, price: 130 },
    { name: 'Batata Doce', category: 'tuberculos', unit: 'cx', salesType: 'caixa', cost: 45, price: 65 },
    { name: 'Cenoura', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 35, price: 52 },
    { name: 'Beterraba', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 30, price: 45 },
    { name: 'Abobrinha Italiana', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 40, price: 58 },
    { name: 'Chuchu', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 28, price: 42 },
    { name: 'Pepino Comum', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 32, price: 48 },
    { name: 'Pimentão Verde', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 48, price: 68 },
    { name: 'Vagem', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 55, price: 78 },
    { name: 'Banana Prata', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 48, price: 68 },
    { name: 'Maçã Gala', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 90, price: 125 },
    { name: 'Mamão Formosa', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 42, price: 62 },
    { name: 'Laranja Pera', category: 'frutas', unit: 'saco', salesType: 'peso', cost: 38, price: 55 },
    { name: 'Melancia', category: 'frutas', unit: 'un', salesType: 'unidade', cost: 25, price: 40 },
    { name: 'Abacaxi Pérola', category: 'frutas', unit: 'un', salesType: 'unidade', cost: 8, price: 14 },
    { name: 'Uva Itália', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 110, price: 150 },
    { name: 'Manga Palmer', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 55, price: 78 },
    { name: 'Limão Taiti', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 45, price: 65 },
    { name: 'Morango', category: 'frutas', unit: 'bandeja', salesType: 'unidade', cost: 9, price: 15 },
    { name: 'Repolho Verde', category: 'verduras', unit: 'cx', salesType: 'caixa', cost: 35, price: 52 },
    { name: 'Brócolis Ninja', category: 'verduras', unit: 'cx', salesType: 'caixa', cost: 48, price: 68 },
    { name: 'Couve-Flor', category: 'verduras', unit: 'un', salesType: 'unidade', cost: 7, price: 12 },
    { name: 'Abóbora Cabotiá', category: 'verduras', unit: 'cx', salesType: 'peso', cost: 32, price: 48 },
    { name: 'Alface Crespa', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 30, price: 42 },
    { name: 'Rúcula', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 26, price: 38 },
    { name: 'Espinafre', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 28, price: 40 },
    { name: 'Coentro', category: 'temperos', unit: 'cx', salesType: 'caixa', cost: 22, price: 34 },
    { name: 'Cebolinha', category: 'temperos', unit: 'cx', salesType: 'caixa', cost: 22, price: 34 },
    { name: 'Salsinha', category: 'temperos', unit: 'cx', salesType: 'caixa', cost: 22, price: 34 },
    { name: 'Alho', category: 'temperos', unit: 'saco', salesType: 'peso', cost: 160, price: 210 },
    { name: 'Mandioca', category: 'tuberculos', unit: 'cx', salesType: 'peso', cost: 40, price: 58 },
    { name: 'Agrião', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 24, price: 36 },
    { name: 'Almeirão', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 24, price: 36 },
    { name: 'Acelga', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 26, price: 38 },
    { name: 'Escarola', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 26, price: 38 },
    { name: 'Couve Manteiga', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 22, price: 34 },
    { name: 'Radite', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 22, price: 34 },
    { name: 'Mostarda Folhas', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 22, price: 34 },
    { name: 'Alface Lisa', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 30, price: 42 },
    { name: 'Alface Roxa', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 32, price: 46 },
    { name: 'Alface Americana', category: 'folhagens', unit: 'cx', salesType: 'caixa', cost: 32, price: 46 },
    { name: 'Abacate', category: 'frutas', unit: 'cx', salesType: 'peso', cost: 65, price: 95 },
    { name: 'Maçã Fuji', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 95, price: 130 },
    { name: 'Pêssego', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 85, price: 118 },
    { name: 'Maracujá', category: 'frutas', unit: 'cx', salesType: 'caixa', cost: 70, price: 100 },
    { name: 'Rabanete', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 20, price: 32 },
    { name: 'Milho Verde', category: 'legumes', unit: 'saco', salesType: 'peso', cost: 38, price: 55 },
    { name: 'Cheiro Verde Misto', category: 'temperos', unit: 'cx', salesType: 'caixa', cost: 24, price: 36 },
    { name: 'Cenoura KG', category: 'legumes', unit: 'kg', salesType: 'peso', cost: 2.6, price: 4.5 },
    { name: 'Beterraba KG', category: 'legumes', unit: 'kg', salesType: 'peso', cost: 2.4, price: 4.2 },
    { name: 'Beterraba Maçã', category: 'legumes', unit: 'cx', salesType: 'caixa', cost: 34, price: 50 },
  ];

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
    setImageUrl('');
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
    setImageUrl(p.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleQuickAdd = (item: (typeof QUICK_CATALOG)[number]) => {
    setEditingProduct(null);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setSalesType(item.salesType);
    setDefaultPrice(item.price);
    setAvgCost(item.cost);
    setOrigin('');
    setNotes('');
    setImageUrl('');
    setIsModalOpen(true);
  };

  const quickFiltered = QUICK_CATALOG.filter((q) =>
    q.name.toLowerCase().includes(quickSearch.toLowerCase())
  );
  const isAlreadyRegistered = (qName: string) =>
    products.some((p) => p.name.toLowerCase() === qName.toLowerCase());

  const CATEGORY_EMOJI: Record<string, string> = {
    frutas: '🍎',
    legumes: '🥕',
    verduras: '🥬',
    folhagens: '🌿',
    temperos: '🌱',
    tuberculos: '🥔',
    outros: '📦',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    frutas: 'Frutas',
    legumes: 'Legumes',
    verduras: 'Verduras',
    folhagens: 'Folhagens',
    temperos: 'Temperos',
    tuberculos: 'Tubérculos',
    outros: 'Outros',
  };

  const categoryLabel = (c: string) => CATEGORY_LABELS[c] || c;

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
        imageUrl: imageUrl || undefined,
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
        imageUrl: imageUrl || undefined,
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPhotoReview(true)}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-sm transition-all active:scale-95"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Conferir Fotos</span>
          </button>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Produto</span>
          </button>
        </div>
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

      {/* Adicionar Hortifruti rápido */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-2xs overflow-hidden">
        <button
          onClick={() => setQuickOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-emerald-50"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs font-black text-emerald-900">Adicionar Hortifruti</p>
              <p className="text-[10px] text-emerald-700">
                Toque no produto e ele já vem preenchido — só ajustar o preço e salvar
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700">{quickOpen ? 'FECHAR' : 'ABRIR'}</span>
        </button>
        {quickOpen && (
          <div className="border-t border-emerald-100 bg-white px-4 py-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Buscar produto (ex: banana, tomate...)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {quickFiltered.map((q) => {
                const registered = isAlreadyRegistered(q.name);
                return (
                  <button
                    key={q.name}
                    onClick={() => !registered && handleQuickAdd(q)}
                    disabled={registered}
                    title={registered ? 'Já cadastrado' : `Adicionar ${q.name}`}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                      registered
                        ? 'cursor-default border-gray-200 bg-gray-100 text-gray-400'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {registered ? '✓ ' : '+ '}
                    {q.name}
                    <span className="ml-1 font-normal text-gray-400">
                      {q.unit === 'un' ? 'un' : q.unit}
                    </span>
                  </button>
                );
              })}
              {quickFiltered.length === 0 && (
                <p className="text-xs text-gray-500 py-2">
                  Não encontrou? Use "Novo Produto" para cadastrar do zero.
                </p>
              )}
            </div>
          </div>
        )}
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
                      <div className="flex items-center gap-2.5">
                        {prod.imageUrl || getCuratedImage(prod.name) ? (
                          <img
                            src={prod.imageUrl || getCuratedImage(prod.name) || ''}
                            alt={prod.name}
                            loading="lazy"
                            className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm">
                            {CATEGORY_EMOJI[prod.category] || '📦'}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900">{prod.name}</p>
                          {prod.notes && <p className="text-[10px] text-gray-400">{prod.notes}</p>}
                        </div>
                      </div>
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
      {/* Conferência de fotos: todas de uma vez; toque para corrigir */}
      {showPhotoReview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-emerald-600" />
                Conferência de Fotos
              </p>
              <p className="text-[11px] text-gray-500">
                Toque em uma foto para abrir o produto e trocar a imagem
              </p>
            </div>
            <button
              onClick={() => setShowPhotoReview(false)}
              className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {[...products]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((prod) => {
                  const img = prod.imageUrl || getCuratedImage(prod.name);
                  return (
                    <button
                      key={prod.id}
                      onClick={() => {
                        setShowPhotoReview(false);
                        handleOpenEdit(prod);
                      }}
                      className="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-2xs transition-all hover:border-emerald-400 hover:shadow-sm active:scale-95"
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={prod.name}
                          loading="lazy"
                          className="h-24 w-full bg-gray-50 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center bg-gray-50 text-2xl">
                          {CATEGORY_EMOJI[prod.category] || '📦'}
                        </div>
                      )}
                      <div className="px-2 py-1.5">
                        <p className="truncate text-[11px] font-bold text-gray-900 group-hover:text-emerald-700">
                          {prod.name}
                        </p>
                        <p className="text-[9px] text-gray-400">{categoryLabel(prod.category)}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

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

              {/* Foto do produto: busca automática pelo nome */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Foto do Produto
                  {imgLoading && <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />}
                </p>

                {imgOptions.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {imgOptions.map((opt) => (
                      <button
                        key={opt.url}
                        type="button"
                        onClick={() => setImageUrl(opt.url)}
                        title={opt.title}
                        className={`relative h-16 overflow-hidden rounded-lg border-2 transition-all ${
                          imageUrl === opt.url
                            ? 'border-emerald-600 ring-2 ring-emerald-200'
                            : 'border-transparent hover:border-emerald-300'
                        }`}
                      >
                        <img src={opt.url} alt={opt.title} className="h-full w-full object-cover" loading="lazy" />
                        {imageUrl === opt.url && (
                          <span className="absolute bottom-0.5 right-0.5 rounded-full bg-emerald-600 p-0.5">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  !imgLoading && name.trim().length >= 3 && (
                    <p className="text-[11px] text-gray-400">
                      Nenhuma foto encontrada para "{imgSearchedFor}" — você pode colar um link abaixo.
                    </p>
                  )
                )}

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Ou cole aqui o link de uma foto (opcional)"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-900 focus:bg-white focus:outline-hidden"
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="mt-1 text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Remover foto
                  </button>
                )}
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
