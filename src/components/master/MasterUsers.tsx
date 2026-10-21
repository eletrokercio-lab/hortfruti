import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Ban,
  CheckCircle2,
  LogIn,
  KeyRound,
  Store,
  RefreshCw,
  Copy,
  Save,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import type { AppProfile } from '../../types';
const roleLabels: Record<string, { title: string; color: string }> = {
  master: { title: 'Master (Suporte)', color: 'bg-gray-900 text-white' },
  operador: { title: 'Cliente Master (Operação)', color: 'bg-emerald-600 text-white' },
  entregador: { title: 'Entregador', color: 'bg-amber-600 text-white' },
  comprador: { title: 'Comprador', color: 'bg-blue-600 text-white' },
};

const statusLabels: Record<string, { title: string; color: string }> = {
  ativo: { title: 'Ativo', color: 'bg-emerald-100 text-emerald-800' },
  pendente: { title: 'Aguardando vínculo', color: 'bg-amber-100 text-amber-800' },
  bloqueado: { title: 'Bloqueado', color: 'bg-rose-100 text-rose-800' },
};

export const MasterUsers: React.FC = () => {
  const { session, enterSupportMode } = useAuth();
  const { customers } = useApp();

  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // form de criação
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'operador' | 'entregador' | 'comprador'>('operador');
  const [driverName, setDriverName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState(false);

  // PIX
  const [pixKey, setPixKey] = useState('');
  const [pixLoading, setPixLoading] = useState(true);
  const [pixSaving, setPixSaving] = useState(false);

  const [search, setSearch] = useState('');

  const loadProfiles = useCallback(async () => {
    if (!session) return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.profiles) setProfiles(json.profiles);
      else if (json.error) setMessage({ type: 'err', text: json.error });
    } catch {
      setMessage({ type: 'err', text: 'Falha ao carregar usuários.' });
    }
    setLoadingList(false);
  }, [session]);

  const loadPixKey = useCallback(async () => {
    const { getSupabaseClient } = await import('../../lib/supabase');
    const client = getSupabaseClient();
    if (!client) return;
    setPixLoading(true);
    const { data } = await client.from('app_settings').select('value').eq('key', 'pix_key').maybeSingle();
    if (data?.value) setPixKey(data.value);
    setPixLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
    loadPixKey();
  }, [loadProfiles, loadPixKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role,
          driverName: role === 'entregador' ? driverName : undefined,
          customerId: role === 'comprador' && customerId ? customerId : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'ok', text: json.message });
        setShowForm(false);
        setEmail(''); setPassword(''); setFullName(''); setDriverName(''); setCustomerId('');
        loadProfiles();
      } else {
        setMessage({ type: 'err', text: json.error || 'Falha ao criar conta.' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Erro de conexão com o servidor.' });
    }
    setBusy(false);
  };

  const handleStatus = async (userId: string, status: 'ativo' | 'pendente' | 'bloqueado') => {
    if (!session) return;
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, status }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'ok', text: json.message });
        loadProfiles();
      } else {
        setMessage({ type: 'err', text: json.error || 'Falha ao atualizar.' });
      }
    } catch {
      setMessage({ type: 'err', text: 'Erro de conexão.' });
    }
  };

  // Redefine a senha de acesso de uma conta (master)
  const handleResetPassword = async (p: AppProfile) => {
    if (!session) return;
    const nova = window.prompt(
      `Nova senha de acesso para ${p.full_name || p.email}\n(mínimo 6 caracteres — informe a pessoa depois):`,
      ''
    );
    if (nova === null) return;
    if (nova.trim().length < 6) {
      setMessage({ type: 'err', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: p.id, password: nova.trim() }),
      });
      const json = await res.json();
      setMessage(
        json.success
          ? { type: 'ok', text: json.message }
          : { type: 'err', text: json.error || 'Falha ao redefinir a senha.' }
      );
    } catch {
      setMessage({ type: 'err', text: 'Erro de conexão.' });
    }
  };

  const handleSavePix = async () => {
    const { getSupabaseClient } = await import('../../lib/supabase');
    const client = getSupabaseClient();
    if (!client) return;
    setPixSaving(true);
    const { error } = await client
      .from('app_settings')
      .upsert({ key: 'pix_key', value: pixKey.trim(), updated_at: new Date().toISOString() });
    setPixSaving(false);
    setMessage(
      error
        ? { type: 'err', text: 'Falha ao salvar a chave PIX: ' + error.message }
        : { type: 'ok', text: 'Chave PIX salva! Compradores já podem pagar com ela.' }
    );
  };

  const handleSupport = (p: AppProfile) => {
    if (p.role === 'operador') {
      enterSupportMode({ id: p.id, name: p.full_name || p.email });
    } else if (p.role === 'comprador' && p.customer_id) {
      const cust = customers.find((c) => c.id === p.customer_id);
      enterSupportMode({ id: p.id, name: cust?.name || p.email, asBuyer: true, customerId: p.customer_id });
    }
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.email.toLowerCase().includes(q) ||
      (p.full_name || '').toLowerCase().includes(q) ||
      p.role.includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-gray-900">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            Usuários & Acessos
          </h1>
          <p className="text-xs text-gray-500">
            Crie contas de operação, entregadores e compradores. Bloqueie acessos quando necessário.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProfiles}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} /> Atualizar
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
          >
            <UserPlus className="h-4 w-4" /> Criar conta
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            message.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Formulário de criação */}
      {showForm && (
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Tipo de conta</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="operador">Cliente Master (operação completa)</option>
                <option value="entregador">Entregador</option>
                <option value="comprador">Comprador (mercado/comércio)</option>
                <option value="master">Master (suporte)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Nome completo</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="Ex.: Carlos Silveira"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">E-mail de acesso</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="pessoa@email.com"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Senha inicial</label>
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                placeholder="mínimo 6 caracteres"
              />
            </div>
            {role === 'entregador' && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Nome do entregador (igual ao cadastro de entregas)
                </label>
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  placeholder="Ex.: Carlos Silveira"
                />
              </div>
            )}
            {role === 'comprador' && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  Vincular ao cadastro de cliente (opcional agora)
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">— Vincular depois —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Criando...' : 'Criar conta'}
            </button>
          </div>
        </form>
      )}

      {/* PIX */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <KeyRound className="h-4 w-4 text-emerald-600" /> Chave PIX da distribuidora
        </h2>
        <p className="mb-2 text-xs text-gray-500">
          Exibida ao comprador no fechamento do pedido. Você recebe direto, sem taxas.
        </p>
        <div className="flex gap-2">
          <input
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            disabled={pixLoading}
            placeholder="Ex.: 11 91234-5678, e-mail ou chave aleatória"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleSavePix}
            disabled={pixSaving || pixLoading || !pixKey.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {pixSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 p-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Users className="h-4 w-4 text-emerald-600" /> Contas ({filtered.length})
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar e-mail ou nome..."
              className="w-48 rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:border-emerald-500 focus:outline-none md:w-64"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="p-6 text-center text-xs text-gray-500">Nenhuma conta encontrada.</p>
          )}
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleLabels[p.role]?.color || 'bg-gray-100'}`}>
                    {roleLabels[p.role]?.title || p.role}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusLabels[p.status]?.color}`}>
                    {statusLabels[p.status]?.title || p.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{p.full_name || p.email}</p>
                <p className="truncate text-xs text-gray-500">{p.email}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {(p.role === 'operador' || p.role === 'comprador') && p.status === 'ativo' && (
                  <button
                    onClick={() => handleSupport(p)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    title="Ver exatamente a tela que esta pessoa vê"
                  >
                    <LogIn className="h-3 w-3" /> Entrar como
                  </button>
                )}
                {p.status === 'pendente' && (
                  <button
                    onClick={() => handleStatus(p.id, 'ativo')}
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Aprovar
                  </button>
                )}
                {p.role !== 'master' && (
                  <button
                    onClick={() => handleResetPassword(p)}
                    className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                    title="Definir uma nova senha de acesso para esta conta"
                  >
                    <KeyRound className="h-3 w-3" /> Resetar senha
                  </button>
                )}
                {p.status !== 'bloqueado' && p.role !== 'master' && (
                  <button
                    onClick={() => handleStatus(p.id, 'bloqueado')}
                    className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Ban className="h-3 w-3" /> Bloquear
                  </button>
                )}
                {p.status === 'bloqueado' && (
                  <button
                    onClick={() => handleStatus(p.id, 'ativo')}
                    className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Reativar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
