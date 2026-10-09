import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  History,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AIAuditLog } from '../../types';
import { getSupabaseClient } from '../../lib/supabase';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: string;
    label: string;
    tab?: string;
    data?: any;
  } | null;
  confirmed?: boolean;
}

export const AIAssistantDrawer: React.FC = () => {
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    assistantInitialPrompt,
    setAssistantInitialPrompt,
    userRole,
    orders,
    deliveries,
    receivables,
    payables,
    products,
    customers,
    suppliers,
    calculateProductNeeds,
    harvestPlans,
    logAIAudit,
    executeAISuggestion,
    aiLogs,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Sou o Assistente Inteligente do HortiGestão. Além de responder perguntas, eu EXECUTO tarefas para você: adicionar pedidos prontos que você me enviar (ex.: do WhatsApp), delegar entregas ao entregador, criar pedido de colheita, mudar status de pedido, ajustar preços e registrar pagamentos — sempre pedindo sua confirmação antes. Como posso ajudar?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  // Fornecedor escolhido pelo usuário para cada ação de colheita (por mensagem)
  const [harvestSupplierChoice, setHarvestSupplierChoice] = useState<Record<string, string>>({});

  // Entregadores cadastrados (para a IA poder delegar entregas)
  useEffect(() => {
    if (!isAssistantOpen) return;
    (async () => {
      const client = getSupabaseClient();
      if (!client) return;
      const { data } = await client
        .from('app_profiles')
        .select('id, full_name, driver_name')
        .eq('role', 'entregador')
        .eq('status', 'ativo');
      if (data)
        setDrivers(
          (data as any[]).map((d) => ({
            id: d.id,
            name: d.driver_name || d.full_name || 'Entregador',
          }))
        );
    })();
  }, [isAssistantOpen]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAssistantOpen) {
      scrollToBottom();
      if (assistantInitialPrompt) {
        handleSendMessage(assistantInitialPrompt);
        setAssistantInitialPrompt('');
      }
    }
  }, [isAssistantOpen, assistantInitialPrompt]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isAssistantOpen) return null;

  const quickPrompts = [
    'Envie as entregas pendentes para o entregador',
    'Faça o pedido de colheita do que está faltando',
    'O que preciso comprar hoje?',
    'Quem está devendo?',
    'Como estão as vendas do dia?',
    'Quais entregas faltam?',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Build real operational context snapshot (PRD §39, §51)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter((o) => o.date === todayStr);
    const salesToday = todayOrders.reduce((acc, curr) => acc + curr.total, 0);
    const ordersPending = orders.filter((o) => o.status === 'pendente' || o.status === 'em_separacao').length;
    const deliveriesPending = deliveries.filter((d) => d.status !== 'entregue').length;

    const overdueRecs = receivables.filter((r) => r.status === 'vencido');
    const overdueTotal = overdueRecs.reduce((acc, curr) => acc + curr.amount, 0);

    const needs = calculateProductNeeds();
    const purchaseNeeds = needs.filter((n) => n.status === 'comprar');
    const harvestNeeds = needs.filter((n) => n.status === 'colher');

    const systemContext = {
      userRole,
      todayDate: todayStr,
      salesToday,
      ordersPending,
      deliveriesPending,
      overdueCount: overdueRecs.length,
      overdueTotal,
      overdueCustomers: overdueRecs.map((r) => ({ customer: r.customerName, amount: r.amount, due: r.dueDate })),
      purchaseNeeds: purchaseNeeds.map((p) => ({
        productName: p.productName,
        neededQty: p.neededQty,
        availableQty: p.availableQty,
        deficit: p.deficit,
        unit: p.unit,
      })),
      harvestNeeds: harvestNeeds.map((h) => ({
        productId: h.productId,
        productName: h.productName,
        neededQty: h.neededQty,
        unit: h.unit,
        harvestQty: h.deficit,
      })),
      activeDeliveriesList: deliveries
        .filter((d) => d.status !== 'entregue')
        .map((d) => ({ order: d.orderNumber, customer: d.customerName, status: d.status, driver: d.driverName })),
      // Dados com IDs para a IA montar ações executáveis
      pendingDeliveries: deliveries
        .filter((d) => d.status !== 'entregue')
        .map((d) => ({
          deliveryId: d.id,
          orderNumber: d.orderNumber,
          customer: d.customerName,
          status: d.status,
          driverName: d.driverName || null,
          shift: d.shift,
          date: d.date,
        })),
      drivers,
      ordersList: orders.slice(0, 40).map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        customer: o.customerName,
        status: o.status,
        total: o.total,
      })),
      receivablesList: receivables
        .filter((r) => r.status !== 'pago')
        .slice(0, 40)
        .map((r) => ({ receivableId: r.id, customer: r.customerName, amount: r.amount, due: r.dueDate, status: r.status })),
      productsList: products
        .filter((p) => p.status === 'active')
        .map((p) => ({ productId: p.id, name: p.name, unit: p.unit, category: p.category, defaultPrice: p.defaultPrice })),
      customersList: customers.map((c) => ({ customerId: c.id, name: c.name })),
      suppliersList: suppliers.map((s) => ({
        supplierId: s.id,
        name: s.name,
        phone: s.phone || null,
        whatsapp: s.whatsapp || null,
      })),
    };

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          userRole,
          systemContext,
        }),
      });

      const data = await response.json();

      const assistantMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'Não consegui obter uma resposta para essa pergunta.',
        suggestedAction: data.suggestedAction || null,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Log into AI audit history (PRD §41)
      logAIAudit({
        userRole,
        question: textToSend,
        response: assistantMsg.text,
        suggestedAction: data.suggestedAction || null,
        status: data.suggestedAction ? 'consulted' : 'auto_answered',
      });
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Desculpe, ocorreu uma instabilidade ao conectar ao servidor de inteligência: ' + err.message,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = (msgId: string, action: any) => {
    // Colheita: injeta o fornecedor escolhido no seletor da mensagem
    if (action?.type === 'EXECUTE_CREATE_HARVEST') {
      const choiceId = harvestSupplierChoice[msgId] || '';
      const supplier = suppliers.find((s) => s.id === choiceId);
      action = {
        ...action,
        data: {
          ...(action.data || {}),
          supplierId: supplier?.id,
          supplierName: supplier?.name,
        },
      };
    }
    executeAISuggestion(action);
    const isExecute = typeof action?.type === 'string' && action.type.startsWith('EXECUTE_');
    setMessages((prev) => [
      ...prev.map((m) => (m.id === msgId ? { ...m, confirmed: true } : m)),
      {
        id: `done-${Date.now()}`,
        sender: 'assistant' as const,
        text: isExecute
          ? `✅ Pronto! Ação executada: ${action.label}. Você já pode conferir na tela — ela foi aberta para você.`
          : `Tela aberta: ${action.label}.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    if (!isExecute) setIsAssistantOpen(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-emerald-700 px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Sparkles className="h-5 w-5 text-emerald-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black tracking-tight">Assistente HortiGestão</h2>
              <span className="rounded-xs bg-emerald-500/50 px-1 text-[9px] font-bold">IA</span>
            </div>
            <p className="text-[11px] text-emerald-100">
              Copiloto Operacional • Perfil: {userRole}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAssistantOpen(false)}
          className="rounded-lg p-1.5 text-white/80 hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs: Conversa vs Histórico & Auditoria (PRD §41) */}
      <div className="flex border-b border-gray-100 bg-gray-50 text-xs">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-center font-bold transition-colors ${
            activeTab === 'chat'
              ? 'border-b-2 border-emerald-600 bg-white text-emerald-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Conversa Operacional
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-center font-bold transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-emerald-600 bg-white text-emerald-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Histórico & Auditoria ({aiLogs.length})
        </button>
      </div>

      {/* Tab: Chat */}
      {activeTab === 'chat' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Quick Prompts Chips (PRD §30) */}
          <div className="border-b border-gray-100 bg-gray-50/70 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Sugestões Rápidas:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-tr-xs'
                      : 'bg-gray-100 text-gray-800 rounded-tl-xs border border-gray-200/60'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* PRD §29 & §40: Suggested Action Card with confirmation requirement */}
                  {msg.suggestedAction && (
                    <div className="mt-2 rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 text-emerald-950">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-900 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        <span>
                          {msg.suggestedAction.type?.startsWith('EXECUTE_')
                            ? 'Posso executar isto para você:'
                            : 'Ação Operacional Sugerida:'}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mb-2">
                        {msg.suggestedAction.label}
                      </p>

                      {/* Colheita: escolha do fornecedor/produtor antes de executar */}
                      {msg.suggestedAction.type === 'EXECUTE_CREATE_HARVEST' && !msg.confirmed && (
                        <div className="mb-2">
                          <label className="block text-[10px] font-bold text-emerald-900 uppercase mb-1">
                            Fornecedor / Produtor:
                          </label>
                          <select
                            value={harvestSupplierChoice[msg.id] || ''}
                            onChange={(e) =>
                              setHarvestSupplierChoice((prev) => ({
                                ...prev,
                                [msg.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-[11px] text-gray-900"
                          >
                            <option value="">— Sem fornecedor vinculado —</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}{s.whatsapp || s.phone ? ` · ${s.whatsapp || s.phone}` : ''}
                              </option>
                            ))}
                          </select>
                          {suppliers.length === 0 && (
                            <p className="mt-1 text-[10px] text-emerald-800/70">
                              Nenhum fornecedor cadastrado — a ordem será criada sem vínculo.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pedido: resumo dos itens antes de executar */}
                      {msg.suggestedAction.type === 'EXECUTE_CREATE_ORDER' && !msg.confirmed && (() => {
                        const d = msg.suggestedAction.data || {};
                        const cust = customers.find((c) => c.id === d.customerId);
                        const lines = (Array.isArray(d.items) ? d.items : []).map((it: any) => {
                          const p = products.find((pp) => pp.id === it?.productId);
                          const unitPrice = Number(it?.unitPrice) > 0 ? Number(it.unitPrice) : p?.defaultPrice || 0;
                          const qty = Number(it?.quantity) || 0;
                          return { name: p?.name || 'Produto não encontrado', qty, unit: p?.unit || 'un', unitPrice, total: qty * unitPrice };
                        });
                        const total = lines.reduce((acc: number, l: { total: number }) => acc + l.total, 0);
                        const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
                        return (
                          <div className="mb-2 rounded-lg border border-emerald-200 bg-white p-2">
                            <p className="text-[10px] font-bold uppercase text-gray-700">
                              Pedido de {cust ? cust.name : 'cliente não encontrado'}
                              {!cust && <span className="ml-1 font-normal text-red-600">(não executável)</span>}
                            </p>
                            <ul className="mt-1 space-y-0.5 text-[10px] text-gray-600">
                              {lines.map((l: { name: string; qty: number; unit: string; unitPrice: number; total: number }, i: number) => (
                                <li key={i} className="flex justify-between gap-2">
                                  <span>{l.qty} {l.unit} · {l.name}{l.unitPrice > 0 && Number(d.items[i]?.unitPrice) > 0 ? ` a ${fmt(l.unitPrice)}` : ''}</span>
                                  <span className="font-semibold text-gray-800">{fmt(l.total)}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-1 flex justify-between border-t border-emerald-100 pt-1 text-[11px] font-bold text-gray-900">
                              <span>Total estimado:</span>
                              <span>{fmt(total)}</span>
                            </p>
                            <p className="mt-1 text-[9px] text-emerald-700">
                              Preço especial/promoção do cliente é aplicado automaticamente nos itens sem preço citado.
                            </p>
                          </div>
                        );
                      })()}

                      {!msg.confirmed ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmAction(msg.id, msg.suggestedAction)}
                            className="flex-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 py-1.5 px-3 text-[11px] font-bold text-white shadow-2xs transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              {msg.suggestedAction.type?.startsWith('EXECUTE_')
                                ? 'Confirmar e Executar'
                                : 'Confirmar e Abrir'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ação executada pelo usuário
                        </span>
                      )}
                    </div>
                  )}

                  <span
                    className={`block text-[9px] text-right ${
                      msg.sender === 'user' ? 'text-emerald-200' : 'text-gray-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-2xl w-fit">
                <Sparkles className="h-4 w-4 animate-spin text-emerald-600" />
                <span>Consultando informações reais da distribuidora...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-gray-200 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Pergunte ao Assistente (ex: quem está devendo?)..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="rounded-xl bg-emerald-600 p-2.5 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-xs"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Histórico & Auditoria (PRD §41) */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600 inline mr-1.5" />
            Todas as consultas à IA e sugestões operacionais são auditadas para garantir governança e conformidade.
          </div>

          {aiLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">Nenhum registro de auditoria ainda.</p>
          ) : (
            aiLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-gray-200 bg-white p-3 text-xs space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="font-semibold uppercase text-gray-600">Perfil: {log.userRole}</span>
                  <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                <p className="font-bold text-gray-900">"{log.question}"</p>
                <p className="text-gray-600 line-clamp-2">{log.response}</p>
                {log.suggestedAction && (
                  <span className="inline-block rounded bg-emerald-50 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    Ação: {log.suggestedAction.label}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
