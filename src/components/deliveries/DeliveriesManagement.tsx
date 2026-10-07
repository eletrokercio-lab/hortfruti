import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Delivery, DeliveryStatus } from '../../types';
import { formatDate, getDeliveryStatusBadge } from '../../utils/formatters';

export const DeliveriesManagement: React.FC = () => {
  const { deliveries, updateDeliveryStatus, setCurrentTab } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');

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

        <button
          onClick={() => setCurrentTab('driver-app')}
          className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
        >
          <Smartphone className="h-4 w-4" />
          <span>Abrir Visão do Motorista (Mobile)</span>
        </button>
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

                {/* Status Switcher Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
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
    </div>
  );
};
