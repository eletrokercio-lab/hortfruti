import React, { useState } from 'react';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Scale,
  Layers,
  Phone,
  Navigation,
  MessageCircle,
  FileText,
  ChevronRight,
  X,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Delivery } from '../../types';
import { formatBRL, formatUnit, getDeliveryStatusBadge } from '../../utils/formatters';

interface DriverAppViewProps {
  // Definido apenas quando um master/operador abre a visão do motorista
  // (o entregador autenticado não recebe — para ele não existe "voltar")
  onBack?: () => void;
}

export const DriverAppView: React.FC<DriverAppViewProps> = ({ onBack }) => {
  const { deliveries, updateDeliveryStatus, confirmDelivery, customers } = useApp();
  const { profile, supportCustomer, signOut } = useAuth();

  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Delivery confirmation form state
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [tareWeight, setTareWeight] = useState<string>('');
  const [cratesReturned, setCratesReturned] = useState<number>(0);
  const [driverNotes, setDriverNotes] = useState<string>('');
  const [issueReport, setIssueReport] = useState<string>('');
  const [deliveredQtys, setDeliveredQtys] = useState<Record<string, number>>({});

  const todayStr = new Date().toISOString().split('T')[0];

  // Entregador autenticado vê apenas as entregas delegadas a ele
  const isDriverProfile = profile?.role === 'entregador' && !supportCustomer;

  // Active driver deliveries (show all active, prioritized by today)
  const driverDeliveries = deliveries.filter((d) => {
    if (d.status === 'entregue') return false;
    if (!isDriverProfile) return true;
    return (
      d.assignedDriverId === profile?.id ||
      (!!profile?.driver_name && d.driverName === profile.driver_name)
    );
  });
  const finishedToday = deliveries.filter((d) => {
    if (d.status !== 'entregue') return false;
    if (!isDriverProfile) return true;
    return (
      d.assignedDriverId === profile?.id ||
      (!!profile?.driver_name && d.driverName === profile.driver_name)
    );
  });

  // Automatic Net Weight Calculation: Peso Líquido = Peso Bruto - Tara (PRD §20)
  const numGross = parseFloat(grossWeight) || 0;
  const numTare = parseFloat(tareWeight) || 0;
  const netWeight = Math.max(0, numGross - numTare);

  const handleStartDelivery = (del: Delivery) => {
    updateDeliveryStatus(del.id, 'em_rota');
  };

  const handleOpenConfirm = (del: Delivery) => {
    setActiveDelivery(del);
    // Initialize item counts
    const initialQtys: Record<string, number> = {};
    del.items.forEach((it) => {
      initialQtys[it.productId] = it.expectedQty;
    });
    setDeliveredQtys(initialQtys);
    setCratesReturned(del.cratesDelivered || 0); // Suggest returning same count
    setGrossWeight('');
    setTareWeight('');
    setDriverNotes('');
    setIssueReport('');
    setIsConfirmModalOpen(true);
  };

  const handleSubmitConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery) return;

    const itemsPayload = activeDelivery.items.map((it) => ({
      productId: it.productId,
      deliveredQty: deliveredQtys[it.productId] !== undefined ? deliveredQtys[it.productId] : it.expectedQty,
    }));

    confirmDelivery(activeDelivery.id, {
      deliveredItems: itemsPayload,
      grossWeight: numGross > 0 ? numGross : undefined,
      tareWeight: numTare > 0 ? numTare : undefined,
      cratesDelivered: activeDelivery.cratesDelivered,
      cratesReturned,
      driverNotes,
      issueReport: issueReport.trim() || undefined,
    });

    setIsConfirmModalOpen(false);
    setActiveDelivery(null);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-16">
      {/* Driver Mobile Header */}
      <div className="rounded-2xl bg-amber-600 p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack ? (
              <button
                onClick={onBack}
                className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="Voltar para Entregas"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (window.confirm('Sair da conta e voltar para a tela de login?')) signOut();
                }}
                className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="Sair da conta"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </button>
            )}
            <Truck className="h-6 w-6 text-white" />
            <div>
              <h1 className="text-base font-black tracking-tight leading-tight">App do Motorista</h1>
              <p className="text-xs text-amber-100">Veículo: Caminhão Iveco Daily • Rota 01</p>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
              {driverDeliveries.length} pendente{driverDeliveries.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Driver Tabs / Quick Progress */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500 font-semibold">
        <span>ENTREGAS A REALIZAR ({driverDeliveries.length})</span>
        <span className="text-emerald-600 font-bold">{finishedToday.length} concluídas hoje</span>
      </div>

      {/* Deliveries Feed */}
      <div className="space-y-3">
        {driverDeliveries.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-2xs">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-gray-900">Parabéns! Todas as entregas concluídas!</h3>
            <p className="text-xs text-gray-500 mt-1">
              Nenhuma entrega pendente no caminhão neste momento.
            </p>
          </div>
        ) : (
          driverDeliveries.map((del, index) => {
            const customer = customers.find((c) => c.id === del.customerId);
            const isEmRota = del.status === 'em_rota';
            const badge = getDeliveryStatusBadge(del.status);

            return (
              <div
                key={del.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                  isEmRota ? 'border-amber-400 ring-2 ring-amber-300/40' : 'border-gray-200'
                }`}
              >
                {/* Header row: Index & Client */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h2 className="text-sm font-black text-gray-900 leading-tight">
                        {del.customerName}
                      </h2>
                      <p className="text-[11px] font-mono font-semibold text-gray-500 mt-0.5">
                        {del.orderNumber}
                      </p>
                    </div>
                  </div>

                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Address with Click to Map */}
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-gray-50 p-2.5 text-xs text-gray-700">
                  <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{del.address}</p>
                    <p className="text-[11px] text-gray-500">{del.neighborhood}, {del.city}</p>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${del.address}, ${del.neighborhood}, ${del.city}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shrink-0"
                  >
                    <Navigation className="h-3 w-3" /> GPS
                  </a>
                </div>

                {/* Items preview */}
                <div className="mt-3 border-t border-gray-100 pt-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    Produtos ({del.items.length} itens • {del.cratesDelivered} caixas):
                  </span>
                  <div className="space-y-1">
                    {del.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-gray-700">
                        <span>• {it.productName}</span>
                        <span className="font-bold">{it.expectedQty} {it.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WhatsApp & Phone quick buttons */}
                {customer && (
                  <div className="mt-3 flex items-center gap-2">
                    {customer.whatsapp && (
                      <a
                        href={`https://wa.me/55${customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sou o motorista da HortiGestão com sua entrega (${del.orderNumber}). Estou a caminho!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {customer.phone && (
                      <a
                        href={`tel:${customer.phone.replace(/\D/g, '')}`}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <Phone className="h-3.5 w-3.5 text-gray-600" />
                        <span>Ligar</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Big Action Buttons (PRD §18) */}
                <div className="mt-4 pt-2 border-t border-gray-100">
                  {!isEmRota ? (
                    <button
                      onClick={() => handleStartDelivery(del)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md active:scale-98 transition-all"
                    >
                      <Truck className="h-4 w-4" />
                      <span>INICIAR ENTREGA</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenConfirm(del)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg active:scale-98 transition-all animate-pulse"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>CONFIRMAR ENTREGA NO CLIENTE</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Finished deliveries history */}
      {finishedToday.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Entregas Concluídas Hoje ({finishedToday.length})
          </p>
          <div className="space-y-2">
            {finishedToday.map((del) => (
              <div
                key={del.id}
                className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs"
              >
                <div>
                  <p className="font-bold text-gray-800">{del.customerName}</p>
                  <p className="text-[11px] text-gray-500">
                    {del.orderNumber} • {del.cratesReturned} caixas recolhidas
                  </p>
                </div>
                <span className="font-bold text-emerald-700 text-xs flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Entregue
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Confirm Delivery with Tare, Weights, Crate Return and Issues (PRD §18, §19, §20) */}
      {isConfirmModalOpen && activeDelivery && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-gray-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 bg-emerald-600 text-white rounded-t-3xl sm:rounded-t-2xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <h3 className="font-black text-sm">Confirmar Entrega</h3>
                  <p className="text-xs text-emerald-100">{activeDelivery.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitConfirm} className="p-5 space-y-4">
              {/* 1. Tara e Pesagem Líquida (PRD §20) */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Scale className="h-4 w-4 text-blue-700" />
                  <span>Pesagem e Tara (Opcional)</span>
                </div>
                <p className="text-[11px] text-blue-700">
                  O sistema calcula o peso líquido automaticamente: Peso Líquido = Peso Bruto - Tara
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Peso Bruto (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 185.0"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Tara dos Vasilhames (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 15.0"
                      value={tareWeight}
                      onChange={(e) => setTareWeight(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                {numGross > 0 && (
                  <div className="rounded-lg bg-blue-100/70 p-2 text-center text-xs font-black text-blue-900">
                    Peso Líquido Calculado: {netWeight.toFixed(2)} kg
                  </div>
                )}
              </div>

              {/* 2. Vasilhames / Caixas Devolvidas (PRD §19) */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Layers className="h-4 w-4 text-amber-700" />
                    <span>Controle de Vasilhames (Caixas K)</span>
                  </div>
                  <span className="text-xs text-amber-800 font-bold">
                    Entregues: {activeDelivery.cratesDelivered}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-700">Quantas caixas vazias recolheu do cliente?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCratesReturned(Math.max(0, cratesReturned - 1))}
                      className="h-8 w-8 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={cratesReturned}
                      onChange={(e) => setCratesReturned(parseInt(e.target.value, 10) || 0)}
                      className="w-16 rounded-lg border border-gray-300 bg-white py-1 text-center text-xs font-black text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setCratesReturned(cratesReturned + 1)}
                      className="h-8 w-8 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Items confirmation */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                  Conferência de Quantidades Entregues
                </label>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {activeDelivery.items.map((it) => (
                    <div key={it.productId} className="flex items-center justify-between p-2 text-xs">
                      <div>
                        <span className="font-bold text-gray-900">{it.productName}</span>
                        <span className="text-gray-400 block text-[10px]">
                          Esperado: {it.expectedQty} {it.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={deliveredQtys[it.productId] ?? it.expectedQty}
                          onChange={(e) =>
                            setDeliveredQtys({
                              ...deliveredQtys,
                              [it.productId]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-16 rounded-md border border-gray-300 px-2 py-1 text-right text-xs font-bold text-gray-900"
                        />
                        <span className="text-[10px] text-gray-500 font-semibold">{it.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Ocorrência / Recusa */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Houve alguma recusa ou ocorrência? (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cliente recusou 2 cx de tomate por maturação excessiva"
                  value={issueReport}
                  onChange={(e) => setIssueReport(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* 5. Driver Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Observações do Motorista
                </label>
                <input
                  type="text"
                  placeholder="Ex: Recebido e assinado por Paulo"
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black text-white shadow-md active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Finalizar Entrega</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
