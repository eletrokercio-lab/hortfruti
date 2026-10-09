import React, { useState } from 'react';
import {
  FileCheck2,
  FileSpreadsheet,
  Download,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  Printer,
  Sparkles,
  FileText,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate } from '../../utils/formatters';

export const AccountantCenter: React.FC = () => {
  const {
    monthlyClosures,
    closeMonthPeriod,
    reopenMonthPeriod,
    orders,
    purchases,
    expenses,
    receivables,
    payables,
    cashMovements,
    setIsAssistantOpen,
    setAssistantInitialPrompt,
  } = useApp();

  // Meses disponíveis derivados dos dados reais (pedidos, compras, despesas, caixa)
  const [selectedMonth, setSelectedMonth] = useState('');
  const monthOptions = React.useMemo(() => {
    const months = new Set<string>();
    [
      ...orders.map((o) => o.date),
      ...purchases.map((p) => p.date),
      ...expenses.map((e) => e.date),
      ...cashMovements.map((m) => m.date),
    ].forEach((d) => {
      if (d) months.add(String(d).slice(0, 7));
    });
    months.add(new Date().toISOString().slice(0, 7)); // mês corrente sempre presente
    return Array.from(months).sort().reverse();
  }, [orders, purchases, expenses, cashMovements]);

  const month = selectedMonth || monthOptions[0] || new Date().toISOString().slice(0, 7);

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${names[parseInt(mo, 10) - 1] || mo} / ${y}`;
  };

  const [closureNotes, setClosureNotes] = useState('');

  // Find closure record for selected month
  const closure = monthlyClosures.find((c) => c.month === month);
  const isClosed = closure?.status === 'fechado';

  // Calculate live numbers for selected month
  const monthOrders = orders.filter((o) => o.date.startsWith(month));
  const grossRevenue = monthOrders.reduce((acc, curr) => acc + curr.total, 0);

  const monthCashReceived = cashMovements
    .filter((m) => m.date.startsWith(month) && m.type === 'entrada')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthPurchases = purchases
    .filter((p) => p.date.startsWith(month))
    .reduce((acc, curr) => acc + curr.total, 0);

  const monthExpenses = expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const openRec = receivables
    .filter((r) => r.dueDate.startsWith(month) && r.status !== 'pago')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const openPay = payables
    .filter((p) => p.dueDate.startsWith(month) && p.status !== 'pago')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netMonthResult = monthCashReceived - (monthPurchases + monthExpenses);

  const handleToggleClose = () => {
    if (isClosed) {
      if (confirm(`Tem certeza que deseja reabrir o período ${month}?`)) {
        reopenMonthPeriod(month);
      }
    } else {
      closeMonthPeriod(month, closureNotes);
    }
  };

  const handleAskAIAccountant = () => {
    setAssistantInitialPrompt(
      `Prepare um relatório analítico para o contador do período ${month}, consolidando faturamento, recebimentos, compras, despesas e resultado contábil.`
    );
    setIsAssistantOpen(true);
  };

  // Export genérico (CSV ; separado, com escape)
  const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((r) => r.map(esc).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Vendas do mês: pedido a pedido
  const handleExportSalesCsv = () => {
    downloadCsv(`vendas_${month}.csv`, [
      ['Pedido', 'Cliente', 'Emissao', 'Entrega', 'Status', 'Pagamento', 'Condicao', 'Total (R$)'],
      ...monthOrders.map((o) => [
        o.orderNumber,
        o.customerName,
        o.date,
        o.deliveryDate,
        o.status,
        o.paymentMethod,
        o.paymentTerm,
        o.total.toFixed(2),
      ]),
    ]);
  };

  // 2. Compras do mês
  const handleExportPurchasesCsv = () => {
    downloadCsv(`compras_${month}.csv`, [
      ['Compra', 'Fornecedor', 'Data', 'Vencimento', 'Status', 'Total (R$)'],
      ...purchases
        .filter((p) => p.date.startsWith(month))
        .map((p) => [
          p.purchaseNumber,
          p.supplierName,
          p.date,
          p.dueDate,
          p.status,
          p.total.toFixed(2),
        ]),
    ]);
  };

  // 3. Despesas do mês
  const handleExportExpensesCsv = () => {
    downloadCsv(`despesas_${month}.csv`, [
      ['Data', 'Categoria', 'Descricao', 'Pagamento', 'Valor (R$)'],
      ...expenses
        .filter((e) => e.date.startsWith(month))
        .map((e) => [
          e.date,
          e.category,
          e.description,
          e.paymentMethod,
          e.amount.toFixed(2),
        ]),
    ]);
  };

  // 4. Extrato de caixa do mês
  const handleExportCashCsv = () => {
    downloadCsv(`caixa_${month}.csv`, [
      ['Data', 'Tipo', 'Categoria', 'Descricao', 'Valor (R$)'],
      ...cashMovements
        .filter((m) => m.date.startsWith(month))
        .map((m) => [
          m.date,
          m.type,
          m.category,
          m.description,
          m.amount.toFixed(2),
        ]),
    ]);
  };

  // Resumo geral (mantido para o botão principal)
  const handleExportSummaryCsv = () => {
    downloadCsv(`fechamento_contabil_${month}.csv`, [
      ['Indicador Contabil', 'Valor (R$)'],
      ['Mes', month],
      ['Faturamento Bruto de Vendas', grossRevenue.toFixed(2)],
      ['Recebimentos Realizados no Mes', monthCashReceived.toFixed(2)],
      ['Compras de Mercadorias (Hortifruti)', monthPurchases.toFixed(2)],
      ['Despesas Operacionais Pagas', monthExpenses.toFixed(2)],
      ['Contas a Receber em Aberto (Final do Mes)', openRec.toFixed(2)],
      ['Contas a Pagar em Aberto (Final do Mes)', openPay.toFixed(2)],
      ['Resultado Financeiro Liquido', netMonthResult.toFixed(2)],
    ]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-purple-600" />
            Central do Contador & Fechamento Fiscal
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Demonstrativos contábeis mensais, conciliação e geração do pacote fiscal
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAskAIAccountant}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-300 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>Gerar Parecer IA p/ Contador</span>
          </button>

          <button
            onClick={handleExportSummaryCsv}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs"
          >
            <Download className="h-4 w-4 text-gray-600" />
            <span>Exportar Resumo (CSV)</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir Pacote Mensal</span>
          </button>
        </div>
      </div>

      {/* Month Selection Bar (PRD §26) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-purple-600" />
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Mês de Referência
            </label>
            <select
              value={month}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-hidden"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                isClosed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {isClosed ? 'Período Fechado & Conciliado' : 'Período Aberto (Em Andamento)'}
            </span>
            {closure?.closedAt && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Fechado em: {formatDate(closure.closedAt)} por {closure.closedBy}
              </p>
            )}
          </div>

          <button
            onClick={handleToggleClose}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs ${
              isClosed
                ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isClosed ? (
              <>
                <Unlock className="h-4 w-4" />
                <span>Reabrir Período</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Fechar Período Contábil</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PRD §26: Financial Summary for Accountant */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-black text-gray-900">
            Demonstrativo de Fechamento — {formatMonthLabel(month)}
          </h2>
          <p className="text-xs text-gray-500">
            Valores apurados automaticamente das operações de vendas, compras e contas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Faturamento */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Faturamento Bruto (Vendas)</span>
            <span className="text-xl font-black text-gray-900">{formatBRL(grossRevenue)}</span>
            <p className="text-[11px] text-gray-500 mt-1">{monthOrders.length} pedidos emitidos no mês</p>
          </div>

          {/* Recebimentos */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Recebimentos Efetivos</span>
            <span className="text-xl font-black text-emerald-800">{formatBRL(monthCashReceived)}</span>
            <p className="text-[11px] text-emerald-600 mt-1">Valores liquidados no caixa/banco</p>
          </div>

          {/* Compras */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
            <span className="text-[10px] uppercase font-bold text-rose-800 block">Compras de Hortifruti</span>
            <span className="text-xl font-black text-rose-800">{formatBRL(monthPurchases)}</span>
            <p className="text-[11px] text-rose-600 mt-1">Custo direto de mercadorias (CMV)</p>
          </div>

          {/* Despesas */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
            <span className="text-[10px] uppercase font-bold text-orange-800 block">Despesas Operacionais</span>
            <span className="text-xl font-black text-orange-800">{formatBRL(monthExpenses)}</span>
            <p className="text-[11px] text-orange-600 mt-1">Combustível, manutenção, salários</p>
          </div>
        </div>

        {/* Second Row: Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-xs text-gray-500 block">Contas a Receber em Aberto:</span>
            <span className="text-lg font-bold text-gray-800">{formatBRL(openRec)}</span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-xs text-gray-500 block">Contas a Pagar em Aberto:</span>
            <span className="text-lg font-bold text-gray-800">{formatBRL(openPay)}</span>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
            <span className="text-xs font-bold text-purple-900 block">Resultado Líquido do Período:</span>
            <span className={`text-xl font-black ${netMonthResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatBRL(netMonthResult)}
            </span>
          </div>
        </div>

        {/* PRD §27: Package Export Options */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-700" />
            <h3 className="font-bold text-xs text-purple-900 uppercase tracking-wider">
              Arquivos do Pacote Mensal para o Contador
            </h3>
          </div>
          <p className="text-xs text-purple-800">
            Você pode exportar cada relatório individualmente ou baixar a pasta completa com os demonstrativos fiscais.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleExportSalesCsv}
              className="rounded-lg bg-white border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> 1. Relatório de Vendas (CSV)
            </button>
            <button
              onClick={handleExportPurchasesCsv}
              className="rounded-lg bg-white border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> 2. Relatório de Compras (CSV)
            </button>
            <button
              onClick={handleExportExpensesCsv}
              className="rounded-lg bg-white border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> 3. Relatório de Despesas (CSV)
            </button>
            <button
              onClick={handleExportCashCsv}
              className="rounded-lg bg-white border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> 4. Extrato Bancário / Caixa (CSV)
            </button>
          </div>
        </div>

        {/* Important note */}
        <p className="text-[11px] text-gray-400 italic">
          * Conforme PRD §38: A inteligência artificial e as rotinas do sistema consolidam os dados operacionais, mas não substituem a análise do profissional de contabilidade habilitado.
        </p>
      </div>
    </div>
  );
};
