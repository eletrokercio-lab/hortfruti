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
import { exportExcel, exportPDF, ReportTable, fmtBRLForReport } from '../../utils/reportExporters';

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

  // Resultado de caixa do mês: entradas reais - saídas reais do caixa
  const monthCashOut = cashMovements
    .filter((m) => m.date.startsWith(month) && m.type === 'saida')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netMonthResult = monthCashReceived - monthCashOut;

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

  // ===== Tabelas dos relatórios (dados reais do mês) =====
  // 1. Vendas
  const buildSalesTable = (): ReportTable => ({
    name: 'Relatório de Vendas',
    columns: ['Pedido', 'Cliente', 'Emissão', 'Entrega', 'Status', 'Pagamento', 'Condição', 'Total (R$)'],
    rows: monthOrders.map((o) => [
      o.orderNumber,
      o.customerName,
      formatDate(o.date),
      formatDate(o.deliveryDate),
      o.status,
      o.paymentMethod.toUpperCase(),
      o.paymentTerm,
      o.total.toFixed(2).replace('.', ','),
    ]),
  });

  // 2. Compras (custo de mercadoria)
  const buildPurchasesTable = (): ReportTable => ({
    name: 'Relatório de Compras (CMV)',
    columns: ['Compra', 'Fornecedor', 'Data', 'Vencimento', 'Status', 'Total (R$)'],
    rows: purchases
      .filter((p) => p.date.startsWith(month))
      .map((p) => [
        p.purchaseNumber,
        p.supplierName,
        formatDate(p.date),
        formatDate(p.dueDate),
        p.status,
        p.total.toFixed(2).replace('.', ','),
      ]),
  });

  // 3. Despesas
  const buildExpensesTable = (): ReportTable => ({
    name: 'Relatório de Despesas',
    columns: ['Data', 'Categoria', 'Descrição', 'Pagamento', 'Comprovante', 'Valor (R$)'],
    rows: expenses
      .filter((e) => e.date.startsWith(month))
      .map((e) => [
        formatDate(e.date),
        e.category.replace('_', ' '),
        e.description,
        e.paymentMethod.toUpperCase(),
        e.receiptRef || '-',
        e.amount.toFixed(2).replace('.', ','),
      ]),
  });

  // 4. Extrato de caixa
  const buildCashTable = (): ReportTable => ({
    name: 'Extrato de Caixa do Mês',
    columns: ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)'],
    rows: cashMovements
      .filter((m) => m.date.startsWith(month))
      .map((m) => [
        formatDate(m.date),
        m.type === 'entrada' ? 'Entrada' : 'Saída',
        m.category.replace('_', ' '),
        m.description,
        `${m.type === 'entrada' ? '+' : '-'} ${m.amount.toFixed(2).replace('.', ',')}`,
      ]),
  });

  // Resumo contábil do mês
  const buildSummaryTable = (): ReportTable => ({
    name: 'Demonstrativo de Fechamento',
    columns: ['Indicador Contábil', 'Valor (R$)'],
    rows: [
      ['Mês de referência', formatMonthLabel(month)],
      ['Faturamento bruto de vendas (pedidos emitidos)', grossRevenue.toFixed(2).replace('.', ',')],
      ['Recebimentos efetivados no caixa', monthCashReceived.toFixed(2).replace('.', ',')],
      ['Compras de mercadorias registradas (CMV)', monthPurchases.toFixed(2).replace('.', ',')],
      ['Despesas operacionais registradas', monthExpenses.toFixed(2).replace('.', ',')],
      ['Saídas efetivadas no caixa', monthCashOut.toFixed(2).replace('.', ',')],
      ['Contas a receber em aberto (vencimento no mês)', openRec.toFixed(2).replace('.', ',')],
      ['Contas a pagar em aberto (vencimento no mês)', openPay.toFixed(2).replace('.', ',')],
      ['Resultado de caixa do período (entradas - saídas)', netMonthResult.toFixed(2).replace('.', ',')],
      ['Situação do período', isClosed ? 'Fechado e conciliado' : 'Aberto (em andamento)'],
    ],
  });

  const accountantNote =
    'Compras e despesas refletem lançamentos registrados no sistema; o resultado apresentado é de caixa (recebimentos menos pagamentos do mês), não lucro contábil.';

  // ===== Exportação por tipo (CSV / Excel / PDF) =====
  const REPORT_BUILDERS: Record<string, () => ReportTable> = {
    vendas: buildSalesTable,
    compras: buildPurchasesTable,
    despesas: buildExpensesTable,
    caixa: buildCashTable,
  };

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

  const handleExportReportCsv = (kind: string) => {
    const t = REPORT_BUILDERS[kind]();
    downloadCsv(`${kind}_${month}.csv`, [t.columns, ...t.rows]);
  };

  const handleExportSummaryCsv = () => {
    const t = buildSummaryTable();
    downloadCsv(`fechamento_contabil_${month}.csv`, t.rows);
  };

  const handleExportReportExcel = (kind: string) => {
    const t = REPORT_BUILDERS[kind]();
    exportExcel(`${kind}_${month}`, [t], `Relatório ${t.name} — ${formatMonthLabel(month)}`);
  };

  const handleExportReportPdf = (kind: string) => {
    const t = REPORT_BUILDERS[kind]();
    exportPDF({
      title: t.name,
      subtitle: 'Sistema G. Less Hortifruti',
      periodLabel: formatMonthLabel(month),
      tables: [{ ...t, note: accountantNote }],
      summary: [
        { label: 'Faturamento bruto (vendas do mês)', value: fmtBRLForReport(grossRevenue) },
        { label: 'Recebimentos no caixa', value: fmtBRLForReport(monthCashReceived) },
        { label: 'Saídas do caixa', value: fmtBRLForReport(monthCashOut) },
        { label: 'Resultado de caixa do período', value: fmtBRLForReport(netMonthResult) },
      ],
    });
  };

  // Pacote completo (uma planilha com todas as abas / um PDF com todas as seções)
  const ALL_REPORTS = ['vendas', 'compras', 'despesas', 'caixa'] as const;

  const handleExportPackageExcel = () => {
    exportExcel(
      `pacote_contabil_${month}`,
      [buildSummaryTable(), ...ALL_REPORTS.map((k) => REPORT_BUILDERS[k]())],
      `Pacote Contábil — ${formatMonthLabel(month)}`
    );
  };

  const handleExportPackagePdf = () => {
    exportPDF({
      title: 'Pacote Contábil Mensal',
      subtitle: 'Sistema G. Less Hortifruti',
      periodLabel: formatMonthLabel(month),
      tables: [
        { ...buildSummaryTable(), note: accountantNote },
        ...ALL_REPORTS.map((k) => REPORT_BUILDERS[k]()),
      ],
    });
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
            <span className="text-xs font-bold text-purple-900 block">Resultado de Caixa do Período:</span>
            <span className={`text-xl font-black ${netMonthResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatBRL(netMonthResult)}
            </span>
            <p className="text-[10px] text-purple-700 mt-1">
              Entradas - saídas do caixa no mês (não é lucro contábil)
            </p>
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
            {ALL_REPORTS.map((kind, idx) => (
              <div
                key={kind}
                className="flex items-center rounded-lg bg-white border border-purple-200 overflow-hidden"
              >
                <span className="px-2.5 py-1.5 text-xs font-bold text-purple-900">
                  {idx + 1}. {kind.charAt(0).toUpperCase() + kind.slice(1)}
                </span>
                <button
                  onClick={() => handleExportReportCsv(kind)}
                  title="Baixar em CSV"
                  className="border-l border-purple-100 px-2 py-1.5 text-[10px] font-bold text-purple-700 hover:bg-purple-50"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExportReportExcel(kind)}
                  title="Baixar em Excel (.xlsx)"
                  className="border-l border-purple-100 px-2 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </button>
                <button
                  onClick={() => handleExportReportPdf(kind)}
                  title="Baixar em PDF"
                  className="border-l border-purple-100 px-2 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" /> PDF
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-100">
            <button
              onClick={handleExportPackageExcel}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Baixar Pacote Completo (Excel com todas as abas)
            </button>
            <button
              onClick={handleExportPackagePdf}
              className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4" />
              Baixar Pacote Completo (PDF)
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
