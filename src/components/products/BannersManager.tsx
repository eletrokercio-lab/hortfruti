import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Edit2, Plus, Megaphone } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { liveSync } from '../../services/liveSync';
import { Banner, Product, Promotion } from '../../types';
import { PriceInput } from '../ui/PriceInput';

/**
 * Gerenciador de banners promocionais da loja do comprador.
 * Imagem 1200x480 px (proporção 5:2) — clique no banner leva ao produto vinculado.
 */
export const BannersManager: React.FC<{ products: Product[] }> = ({ products }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  // Preço promocional digitado no banner — vira uma promoção real para todos
  const [promoPrice, setPromoPrice] = useState(0);
  const [promoUntil, setPromoUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const fileRef = useRef<HTMLInputElement>(null);

  // Data de hoje (YYYY-MM-DD) para o início da promoção do banner
  const todayStr = () => new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await liveSync.pullBanners();
    setBanners(list || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setImageUrl('');
    setProductId('');
    setTitle('');
    setActive(true);
    setSortOrder(0);
    setPromoPrice(0);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setPromoUntil(d.toISOString().slice(0, 10));
  };

  // Upload do arquivo para o bucket público "banners" (1200x480 recomendado)
  const handleFile = async (file: File) => {
    const client = getSupabaseClient();
    if (!client) {
      setMsg('Sem conexão com o banco — cole uma URL de imagem.');
      return;
    }
    setUploading(true);
    setMsg('');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `banner-${Date.now()}.${ext}`;
      const { error } = await client.storage.from('banners').upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });
      if (error) throw error;
      const { data } = client.storage.from('banners').getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      setMsg(
        'Falha no upload (' +
          (err?.message || 'erro') +
          '). Se o SQL dos banners ainda não foi rodado, execute-o ou cole uma URL.'
      );
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setMsg('Envie uma imagem ou cole uma URL.');
      return;
    }
    setSaving(true);
    setMsg('');
    const banner: Banner = {
      id: editingId || `banner-${Date.now()}`,
      imageUrl,
      productId: productId || undefined,
      title: title.trim() || undefined,
      active,
      sortOrder,
      promoPrice: promoPrice > 0 ? promoPrice : undefined,
      promoUntil: promoPrice > 0 ? promoUntil || todayStr() : undefined,
    };
    await liveSync.pushBanner(banner);
    // Preço promocional: cria/atualiza uma promoção REAL para todos os clientes
    // (id determinístico por banner, então editar o banner atualiza a promoção)
    if (banner.productId && banner.promoPrice && banner.promoPrice > 0) {
      const promo: Promotion = {
        id: `banner-${banner.id}`,
        customerId: 'all',
        productId: banner.productId,
        promotionalPrice: banner.promoPrice,
        startDate: todayStr(),
        endDate: banner.promoUntil || todayStr(),
        active: banner.active,
        notes: `Promoção do banner da loja`,
      };
      await liveSync.pushPromotion(promo);
    } else if (editingId) {
      // Preço removido ou produto desvinculado → desativa a promoção do banner
      await liveSync.updatePromotion(`banner-${editingId}`, false);
    }
    setSaving(false);
    resetForm();
    await load();
    setMsg(
      banner.promoPrice && banner.promoPrice > 0
        ? 'Banner salvo! O preço promocional já vale para todos os clientes na loja.'
        : 'Banner salvo! Ele já aparece na loja do comprador.'
    );
  };

  const handleEdit = (b: Banner) => {
    setEditingId(b.id);
    setImageUrl(b.imageUrl);
    setProductId(b.productId || '');
    setTitle(b.title || '');
    setActive(b.active);
    setSortOrder(b.sortOrder);
    setPromoPrice(b.promoPrice || 0);
    if (b.promoUntil) {
      setPromoUntil(b.promoUntil);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setPromoUntil(d.toISOString().slice(0, 10));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (b: Banner) => {
    if (!window.confirm('Excluir este banner?')) return;
    await liveSync.deleteBanner(b.id);
    // Encerra também a promoção criada pelo banner (se existir)
    await liveSync.updatePromotion(`banner-${b.id}`, false);
    if (editingId === b.id) resetForm();
    await load();
  };

  const productName = (id?: string) => products.find((p) => p.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      {/* Formulário */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs space-y-4"
      >
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-black text-gray-900">
              {editingId ? 'Editar Banner' : 'Novo Banner de Promoção'}
            </h2>
            <p className="text-[11px] text-gray-500">
              Tamanho ideal da imagem: <strong>1200 × 480 px</strong> (proporção 5:2) · JPG ou PNG até 500 KB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-4 py-6 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando imagem...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" /> Enviar imagem do banner
                </>
              )}
            </button>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="...ou cole a URL da imagem"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
            />
            {imageUrl && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="relative">
                  <img src={imageUrl} alt="Prévia do banner" className="aspect-[5/2] w-full object-cover" />
                  {/* Prévia do selo de preço que o comprador verá no banner */}
                  {productId && (() => {
                    const linked = products.find((p) => p.id === productId);
                    if (!linked) return null;
                    const valor = promoPrice > 0 ? promoPrice : linked.defaultPrice;
                    if (valor <= 0) return null;
                    return (
                      <div className="absolute bottom-2 left-2 rounded-xl bg-white/95 px-2.5 py-1 shadow-md">
                        <p className="text-[9px] font-black text-rose-600 uppercase">
                          {promoPrice > 0 ? 'Promoção' : 'Oferta'}
                        </p>
                        <p className="text-sm font-black text-gray-900">
                          R$ {valor.toFixed(2).replace('.', ',')}
                          <span className="ml-1 text-[10px] font-bold text-gray-500">/{linked.unit}</span>
                        </p>
                      </div>
                    );
                  })()}
                </div>
                {productId && (() => {
                  const linked = products.find((p) => p.id === productId);
                  if (!linked) return null;
                  return (
                    <p className="border-t border-gray-100 bg-emerald-50/60 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800">
                      O cliente compra por este valor (com promoção ativa, sai pelo preço promocional)
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Produto vinculado (onde o banner leva ao clicar)
              </label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">— Banner informativo (sem destino) —</option>
                {products
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.defaultPrice > 0 ? `· ${p.unit === 'cx' ? 'cx' : p.unit} R$ ${p.defaultPrice.toFixed(2)}` : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Título interno (opcional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Promoção da semana"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Preço promocional no banner (R$)
                </label>
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 focus-within:border-emerald-500">
                  <span className="text-xs font-bold text-gray-400">R$</span>
                  <PriceInput
                    value={promoPrice}
                    onValueChange={setPromoPrice}
                    placeholder="Ex.: 34,90"
                    className="w-full bg-transparent text-xs font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] font-semibold text-amber-800">
                  O cliente compra por este valor ao clicar no banner
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Promoção válida até</label>
                <input
                  type="date"
                  value={promoUntil}
                  onChange={(e) => setPromoUntil(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-2 py-[7px] text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] font-semibold text-amber-800">
                  {promoPrice > 0
                    ? 'Vira promoção real para todos os clientes'
                    : 'Usada só se o preço for preenchido'}
                </p>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="w-24">
                <label className="block text-xs font-bold text-gray-700 mb-1">Ordem</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-xs font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Ativo na loja
              </label>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editingId ? 'Salvar alterações' : 'Adicionar banner'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        {msg && <p className="text-[11px] font-bold text-emerald-700">{msg}</p>}
      </form>

      {/* Lista */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-xs font-black text-gray-900">Banners cadastrados ({banners.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          </div>
        ) : banners.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-gray-400">
            Nenhum banner ainda. A loja mostra promoções automáticas até você cadastrar o primeiro.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {banners.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                <img
                  src={b.imageUrl}
                  alt={b.title || 'Banner'}
                  className="h-14 w-[140px] shrink-0 rounded-lg border border-gray-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-gray-900">{b.title || 'Sem título'}</p>
                  <p className="text-[11px] text-gray-500">
                    → {productName(b.productId)} · ordem {b.sortOrder}
                  </p>
                  {b.promoPrice != null && b.promoPrice > 0 && (
                    <p className="text-[11px] font-black text-rose-600">
                      Promoção: R$ {b.promoPrice.toFixed(2).replace('.', ',')}
                      {b.promoUntil ? ` · até ${b.promoUntil.split('-').reverse().join('/')}` : ''}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    b.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {b.active ? 'ATIVO' : 'INATIVO'}
                </span>
                <button
                  onClick={() => handleEdit(b)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-700"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(b)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
