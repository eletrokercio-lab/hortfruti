import React, { useEffect, useState } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Smartphone,
  Layers,
  Search,
  UserCog,
  UserPlus,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseClient } from '../../lib/supabase';
import { Delivery, DeliveryStatus } from '../../types';
import { formatDate, getDeliveryStatusBadge } from '../../utils/formatters';

interface DriverProfile {
  id: string;
  full_name: string | null;
  driver_name: string | null;
}

interface DeliveriesManagementProps {
  onGoToUsers?: () => void;
}

export const DeliveriesManagement: React.FC<DeliveriesManagementProps> = ({ onGoToUsers }) => {
  const { deliveries, updateDeliveryStatus, setDeliveryAssignment, setCurrentTab } = useApp();
  const { profile, supportCustomer } = useAuth();
  // Master e operador podem cadastrar entregadores (servidor limita operador a entregador)
  const canCreateDriver =
    (profile?.role === 'master' || profile?.role === 'operador') && !supportCustomer;

  // ===== Modal rápido: Novo Entregador =====
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [drvName, setDrvName] = useState('');
  const [drvEmail, setDrvEmail] = useState('');
  const [drvPass, setDrvPass] = useState('');
  const [drvSaving, setDrvSaving] = useState(false);
  const [drvMsg, setDrvMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrvMsg(null);
    if (!drvName.trim() || !drvEmail.trim() || drvPass.length < 6) {
      setDrvMsg({ ok: false, text: 'Preencha nome, e-mail e senha (mínimo 6 caracteres).' });
      return;
    }
    setDrvSaving(true);
    try {
      const client = getSupabaseClient();
      const { data } = await client!.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        setDrvMsg({ ok: false, text: 'Sessão expirada. Faça login novamente.' });
        return;
      }
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: drvEmail.trim().toLowerCase(),
          password: drvPass,
          fullName: drvName.trim(),
          role: 'entregador',
          driverName: drvName.trim(),
        }),
      });
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDrvMsg({ ok: false, text: j.error || 'Falha ao criar a conta do entregador.' });
        return;
      }
      setDrvMsg({
        ok: true,
        text: `Entregador "${drvName.trim()}" criado! Ele já pode entrar no app com o e-mail e a senha cadastrados.`,
      });
      setDrvName('');
      setDrvEmail('');
      setDrvPass('');
    } catch (err: any) {
      setDrvMsg({ ok: false, text: 'Erro de conexão: ' + (err?.message || err) });
    } finally {
      setDrvSaving(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [driverProfiles, setDriverProfiles] = useState<DriverProfile[]>([]);

  // Carrega entregadores cadastrados (perfis autenticados)
  useEffect(() => {
    (async () => {
      const client = getSupabaseClient();
      if (!client) return;
      const { data } = await client
        .from('app_profiles')
        .select('id, full_name, driver_name')
        .eq('role', 'entregador')
        .eq('status', 'ativo');
      if (data) setDriverProfiles(data as any);
    })();
  }, [deliveries.length]);

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesDriver = driverFilter === 'all' || d.driverName === driverFilter;

    return matchesSearch && matchesStatus && matchesDriver;
  });

  const uniqueDrivers = Array.from(new Set(deliveries.map((d) => d.driverName)));

  // ===== Lista de Separação por entregador =====
  const pendingByDriver = deliveries.filter((d) => d.status !== 'entregue');
  const driversWithPending = Array.from(
    new Set(pendingByDriver.map((d) => d.driverName || 'Não delegadas'))
  );

  const handlePrintSeparation = (driver: string) => {
    const list = pendingByDriver.filter((d) => (d.driverName || 'Não delegadas') === driver);

    // Totais consolidados por produto (galpão separa tudo de uma vez)
    const totals = new Map<string, number>();
    for (const d of list) {
      for (const it of d.items) {
        const key = `${it.productName} (${it.unit})`;
        totals.set(key, (totals.get(key) || 0) + (it.expectedQty || 0));
      }
    }

    const rows = list
      .map(
        (d) => `
        <tr>
          <td>
            <b>${d.customerName}</b><br/>
            <small>${d.address} — ${d.neighborhood}, ${d.city}</small><br/>
            <small>Turno: ${d.shift === 'manha' ? 'Manhã' : 'Tarde'} · Vasilhames: ${d.cratesDelivered}</small>
          </td>
          <td>
            ${(d.items || []).map((it) => `${it.expectedQty} ${it.unit} — ${it.productName}`).join('<br/>')}
          </td>
        </tr>`
      )
      .join('');

    const totalRows = Array.from(totals.entries())
      .map(([k, v]) => `<li><b>${v}</b> — ${k}</li>`)
      .join('');

    const html = `
      <html>
        <head>
          <title>Lista de Separação — ${driver}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; }
            h1 { font-size: 16px; margin: 0 0 2px; }
            h2 { font-size: 13px; margin: 16px 0 6px; border-bottom: 1px solid #999; padding-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #bbb; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #eee; }
            small { color: #444; }
            ul { margin: 4px 0; padding-left: 18px; }
            .meta { color: #555; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>Lista de Separação — ${driver}</h1>
          <p class="meta">
            Emitida em ${new Date().toLocaleString('pt-BR')} ·
            ${list.length} entrega(s) · ${Array.from(totals.keys()).length} produto(s) diferente(s)
          </p>

          <h2>Totais para conferência no galpão</h2>
          <ul>${totalRows || '<li>—</li>'}</ul>

          <h2>Entregas na ordem</h2>
          <table>
            <thead>
              <tr><th style="width:45%">Cliente / Endereço</th><th>Itens</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="2">Nenhuma entrega pendente.</td></tr>'}</tbody>
          </table>

          <p style="margin-top:18px">
            Conferido por: ______________________________&nbsp;&nbsp;&nbsp;
            Conferido por: ______________________________
          </p>
        </body>
      </html>`;

    const w = window.open('', '_blank', 'width=820,height=900');
    if (!w) {
      alert('Permita as janelas pop-up para gerar a lista de separação.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600" />
            Entregas & Gestão de Rotas
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Organização por motoristas, veículos, bairros e status da expedição
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreateDriver && (
            <button
              onClick={() => {
                setDrvMsg(null);
                setIsDriverModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
              title="Criar conta de acesso para um novo entregador"
            >
              <UserPlus className="h-4 w-4" />
              <span>Cadastrar Entregador</span>
            </button>
          )}
          <button
            onClick={() => setCurrentTab('driver-app')}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
          >
            <Smartphone className="h-4 w-4" />
            <span>Abrir Visão do Motorista (Mobile)</span>
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Total Programado</span>
          <p className="text-lg font-black text-gray-900">{deliveries.length} entregas</p>
          <span className="text-[11px] text-gray-500">Hoje e próximos dias</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">A Preparar / Separado</span>
          <p className="text-lg font-black text-blue-700">
            {deliveries.filter((d) => d.status === 'a_preparar' || d.status === 'separado').length}
          </p>
          <span className="text-[11px] text-gray-500">No galpão</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Em Rota (Caminhão)</span>
          <p className="text-lg font-black text-amber-700">
            {deliveries.filter((d) => d.status === 'em_rota').length}
          </p>
          <span className="text-[11px] text-gray-500">Com os motoristas</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Concluídas</span>
          <p className="text-lg font-black text-emerald-700">
            {deliveries.filter((d) => d.status === 'entregue').length}
          </p>
          <span className="text-[11px] text-gray-500">Entregues com sucesso</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, pedido ou bairro..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 focus:bg-white focus:outline-hidden"
          >
            <option value="all">Todos os Status</option>
            <option value="a_preparar">A Preparar</option>
            <option value="separado">Separado</option>
            <option value="em_rota">Em Rota</option>
            <option value="entregue">Entregue</option>
            <option value="problema">Com Ocorrência</option>
          </select>

          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-semibold text-gray-700 focus:bg-white focus:outline-hidden"
          >
            <option value="all">Todos os Motoristas</option>
            {uniqueDrivers.map((driver) => (
              <option key={driver} value={driver}>
                {driver}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Separação por entregador */}
      {driversWithPending.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-2xs">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
            <Printer className="h-4 w-4" />
            Lista de Separação por Entregador
          </p>
          <p className="text-[11px] text-amber-700 mb-3">
            Gera a lista para imprimir (ou salvar em PDF): totais consolidados por produto para o
            galpão + cliente, endereço e itens de cada entrega na ordem.
          </p>
          <div className="flex flex-wrap gap-2">
            {driversWithPending.map((drv) => {
              const count = pendingByDriver.filter((d) => (d.driverName || 'Não delegadas') === drv).length;
              return (
                <button
                  key={drv}
                  onClick={() => handlePrintSeparation(drv)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {drv}
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Deliveries Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDeliveries.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-gray-500 bg-white rounded-2xl border border-gray-200">
            Nenhuma entrega encontrada com os filtros selecionados.
          </div>
        ) : (
          filteredDeliveries.map((del) => {
            const badge = getDeliveryStatusBadge(del.status);
            return (
              <div
                key={del.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <div className="space-y-3">
                  {/* Top status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-gray-500">
                        {del.orderNumber}
                      </span>
                      <h3 className="text-sm font-black text-gray-900 leading-tight">
                        {del.customerName}
                      </h3>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800">{del.address}</p>
                      <p className="text-[11px] text-gray-500">
                        {del.neighborhood}, {del.city}
                      </p>
                    </div>
                  </div>

                  {/* Driver and Vehicle */}
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-400">Data / Turno:</span>
                      <span className="font-semibold">{formatDate(del.date)} ({del.shift === 'manha' ? 'Manhã' : 'Tarde'})</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-400">Motorista:</span>
                      <span className="font-bold text-gray-800">{del.driverName}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-400">Veículo:</span>
                      <span className="text-[11px]">{del.vehicle}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="text-gray-400">Vasilhames:</span>
                      <span className="font-bold text-blue-700">{del.cratesDelivered} caixas</span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="border-t border-gray-100 pt-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                      Carga ({del.items.length} itens):
                    </span>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {del.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-gray-700">
                          <span>{it.productName}</span>
                          <span className="font-bold">{it.expectedQty} {it.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tare / Net weight if recorded */}
                  {del.netWeight !== undefined && (
                    <div className="rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-800 flex justify-between">
                      <span>Peso Líquido Aferido:</span>
                      <span>{del.netWeight.toFixed(2)} kg</span>
                    </div>
                  )}

                  {del.issueReport && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-800">
                      <span className="font-bold block">Ocorrência:</span>
                      {del.issueReport}
                    </div>
                  )}
                </div>

                {/* Delegar entregador */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-400">
                    <UserCog className="h-3 w-3" /> Delegar para entregador
                  </label>
                  <select
                    value={del.assignedDriverId || ''}
                    onChange={(e) => {
                      const selected = driverProfiles.find((p) => p.id === e.target.value);
                      if (selected) {
                        setDeliveryAssignment(del.id, selected.id, selected.driver_name || selected.full_name || 'Entregador');
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-800 focus:outline-hidden"
                  >
                    <option value="">— Sem entregador designado —</option>
                    {driverProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.driver_name || p.full_name || p.id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Switcher Actions */}
                <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Mudar Status:</span>
                  <select
                    value={del.status}
                    onChange={(e) => updateDeliveryStatus(del.id, e.target.value as DeliveryStatus)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-800 focus:outline-hidden"
                  >
                    <option value="a_preparar">A Preparar</option>
                    <option value="separado">Separado</option>
                    <option value="em_rota">Em Rota</option>
                    <option value="entregue">Entregue</option>
                    <option value="problema">Problema</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Novo Entregador */}
      {isDriverModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsDriverModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                <UserPlus className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">Cadastrar Entregador</h2>
                <p className="text-[11px] text-gray-500">
                  Cria o login que dá acesso ao App do Motorista
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700">
                  Nome do entregador *
                </label>
                <input
                  type="text"
                  value={drvName}
                  onChange={(e) => setDrvName(e.target.value)}
                  placeholder="Ex.: João da entrega"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700">
                  E-mail de acesso *
                </label>
                <input
                  type="email"
                  value={drvEmail}
                  onChange={(e) => setDrvEmail(e.target.value)}
                  placeholder="entregador@email.com"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700">
                  Senha * <span className="font-normal text-gray-400">(mínimo 6 caracteres)</span>
                </label>
                <input
                  type="text"
                  value={drvPass}
                  onChange={(e) => setDrvPass(e.target.value)}
                  placeholder="Senha inicial de acesso"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {drvMsg && (
                <div
                  className={`rounded-xl p-2.5 text-[11px] font-semibold ${
                    drvMsg.ok
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {drvMsg.text}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={drvSaving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {drvSaving ? 'Criando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
