import React, { useState } from 'react';
import {
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  Wallet,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBRL, formatDate, getFinancialStatusBadge } from '../../utils/formatters';
import { exportExcel, exportPDF, ReportTable, fmtBRLForReport } from '../../utils/reportExporters';
import { PaymentMethod, PayableCategory } from '../../types';

export const FinanceView: React.FC = () => {
  const {
    receivables,
    payables,
    expenses,
    cashMovements,
    receivePayment,
    payBill,
    createExpense,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'receivables' | 'payables' | 'expenses' | 'cash'>('receivables');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedReceivableId, setSelectedReceivableId] = useState('');
  const [receiveAmount, setReceiveAmount] = useState<number>(0);
  const [receiveMethod, setReceiveMethod] = useState<PaymentMethod>('pix');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseCat, setExpenseCat] = useState<PayableCategory>('combustivel');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(100);
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>('pix');
  const [expenseReceipt, setExpenseReceipt] = useState('');

  // ===== Fluxo de Caixa: período, saldo acumulado e exportação =====
  const [cashPeriod, setCashPeriod] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );

  const cashMonths = React.useMemo(() => {
    const months = new Set<string>();
    cashMovements.forEach((m) => months.add(String(m.date).slice(0, 7)));
    months.add(new Date().toISOString().slice(0, 7));
    return Array.from(months).sort().reverse();
  }, [cashMovements]);

  const formatMonthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${names[parseInt(mo, 10) - 1] || mo} / ${y}`;
  };

  const periodMovements = cashMovements.filter(
    (m) => cashPeriod === 'todos' || m.date.startsWith(cashPeriod)
  );

  // Saldo acumulado na ordem cronológica
  const periodSortedAsc = [...periodMovements].sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? -1 : 1
  );
  let runningBalance = 0;
  const movementBalance = new Map<string, number>();
  for (const m of periodSortedAsc) {
    runningBalance += m.type === 'entrada' ? m.amount : -m.amount;
    movementBalance.set(m.id, runningBalance);
  }

  const periodIn = periodMovements
    .filter((m) => m.type === 'entrada')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const periodOut = periodMovements
    .filter((m) => m.type === 'saida')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const periodResult = periodIn - periodOut;

  const periodLabel =
    cashPeriod === 'todos' ? 'Todo o histórico' : formatMonthLabel(cashPeriod);

  const handleExportCashExcel = () => {
    const table: ReportTable = {
      name: 'Fluxo de Caixa',
      columns: ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Saldo Acumulado (R$)'],
      rows: periodSortedAsc.map((m) => [
        formatDate(m.date),
        m.type === 'entrada' ? 'Entrada' : 'Saída',
        m.category.replace('_', ' '),
        m.description,
        `${m.type === 'entrada' ? '+' : '-'} ${m.amount.toFixed(2).replace('.', ',')}`,
        (movementBalance.get(m.id) || 0).toFixed(2).replace('.', ','),
      ]),
    };
    exportExcel(`fluxo_de_caixa_${cashPeriod}`, [table], `Fluxo de Caixa — ${periodLabel}`);
  };

  const handleExportCashPdf = () => {
    exportPDF({
      title: 'Fluxo de Caixa',
      subtitle: 'Sistema G. Less Hortifruti',
      periodLabel,
      tables: [
        {
          name: `Movimentações (${periodMovements.length} lançamentos)`,
          columns: ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Saldo (R$)'],
          rows: periodSortedAsc.map((m) => [
            formatDate(m.date),
            m.type === 'entrada' ? 'Entrada' : 'Saída',
            m.category.replace('_', ' '),
            m.description,
            `${m.type === 'entrada' ? '+' : '-'} ${m.amount.toFixed(2).replace('.', ',')}`,
            (movementBalance.get(m.id) || 0).toFixed(2).replace('.', ','),
          ]),
          note: 'Saldo acumulado considera apenas os lançamentos do período selecionado.',
        },
      ],
      summary: [
        { label: 'Entradas do período', value: fmtBRLForReport(periodIn) },
        { label: 'Saídas do período', value: fmtBRLForReport(periodOut) },
        { label: 'Resultado do período', value: fmtBRLForReport(periodResult) },
      ],
    });
  };

  // Cash Flow Calculations (geral, independente do filtro)
  const totalIn = cashMovements
    .filter((m) => m.type === 'entrada')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOut = cashMovements
    .filter((m) => m.type === 'saida')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentBalance = totalIn - totalOut;

  // Receivables KPIs
  const totalOpenReceivables = receivables
    .filter((r) => r.status === 'aberto' || r.status === 'vencido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const overdueReceivables = receivables
    .filter((r) => r.status === 'vencido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Payables KPIs
  const totalOpenPayables = payables
    .filter((p) => p.status === 'aberto' || p.status === 'vencido')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const handleOpenReceive = (recId: string) => {
    const rec = receivables.find((r) => r.id === recId);
    if (!rec) return;
    setSelectedReceivableId(recId);
    setReceiveAmount(rec.amount - (rec.paidAmount || 0));
    setReceiveMethod(rec.paymentMethod);
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivableId || receiveAmount <= 0) return;
    receivePayment(selectedReceivableId, receiveAmount, receiveMethod);
    setIsReceiveModalOpen(false);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || expenseAmount <= 0) return;

    createExpense({
      category: expenseCat,
      description: expenseDesc,
      amount: expenseAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: expenseMethod,
      receiptRef: expenseReceipt,
    });

    setIsExpenseModalOpen(false);
    setExpenseDesc('');
    setExpenseReceipt('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CircleDollarSign className="h-6 w-6 text-emerald-600" />
            Financeiro & Gestão de Caixa
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Contas a receber, contas a pagar, despesas operacionais e movimentação de caixa
          </p>
        </div>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Lançar Nova Despesa</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Saldo Atual em Caixa</span>
          <p className="text-xl font-black text-emerald-800">{formatBRL(currentBalance)}</p>
          <span className="text-[11px] text-gray-500">Entradas - Saídas</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Total a Receber</span>
          <p className="text-lg font-black text-gray-900">{formatBRL(totalOpenReceivables)}</p>
          <span className="text-[11px] text-rose-600 font-semibold">
            {formatBRL(overdueReceivables)} em atraso
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Total a Pagar</span>
          <p className="text-lg font-black text-rose-700">{formatBRL(totalOpenPayables)}</p>
          <span className="text-[11px] text-gray-500">Fornecedores e custos</span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gray-400">Despesas Registradas</span>
          <p className="text-lg font-black text-gray-900">
            {formatBRL(expenses.reduce((acc, curr) => acc + curr.amount, 0))}
          </p>
          <span className="text-[11px] text-gray-500">{expenses.length} lançamentos</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-2">
        <button
          onClick={() => setActiveTab('receivables')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'receivables'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowDownRight className="h-4 w-4 text-emerald-600" />
          <span>Contas a Receber ({receivables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payables')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'payables'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowUpRight className="h-4 w-4 text-rose-600" />
          <span>Contas a Pagar ({payables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'expenses'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Despesas Operacionais ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cash')}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
            activeTab === 'cash'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>Fluxo de Caixa ({cashMovements.length})</span>
        </button>
      </div>

      {/* Tab 1: Contas a Receber (PRD §21) */}
      {activeTab === 'receivables' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Ref. Pedido</th>
                  <th className="py-3 px-4 text-right">Valor Título</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Forma Pagto</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receivables.map((rec) => {
                  const badge = getFinancialStatusBadge(rec.status);
                  const isPaid = rec.status === 'pago';
                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-bold text-gray-900">{rec.customerName}</td>
                      <td className="py-3 px-4 font-mono text-gray-500">{rec.orderNumber || '-'}</td>
                      <td className="py-3 px-4 text-right font-black text-gray-900">
                        {formatBRL(rec.amount)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-700">{formatDate(rec.dueDate)}</td>
                      <td className="py-3 px-4 uppercase text-gray-500">{rec.paymentMethod}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isPaid ? (
                          <button
                            onClick={() => handleOpenReceive(rec.id)}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white shadow-2xs"
                          >
                            Dar Baixa
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-semibold">Quitado em {formatDate(rec.paidDate)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Contas a Pagar (PRD §22) */}
      {activeTab === 'payables' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                  <th className="py-3 px-4">Favorecido / Fornecedor</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payables.map((pay) => {
                  const badge = getFinancialStatusBadge(pay.status);
                  const isPaid = pay.status === 'pago';
                  return (
                    <tr key={pay.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-bold text-gray-900">{pay.supplierOrPayee}</td>
                      <td className="py-3 px-4 capitalize text-gray-600">{pay.category.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-700">{pay.description}</td>
                      <td className="py-3 px-4 text-right font-black text-rose-700">
                        {formatBRL(pay.amount)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-700">{formatDate(pay.dueDate)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isPaid ? (
                          <button
                            onClick={() => payBill(pay.id, 'pix')}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1 text-[11px] font-bold text-white shadow-2xs"
                          >
                            Pagar Conta
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-semibold">Pago</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Despesas Operacionais (PRD §23) */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              + Adicionar Despesa
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Forma</th>
                    <th className="py-3 px-4">Comprovante</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 text-gray-500">{formatDate(exp.date)}</td>
                      <td className="py-3 px-4 capitalize font-semibold text-gray-700">
                        {exp.category.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-gray-800">{exp.description}</td>
                      <td className="py-3 px-4 uppercase text-gray-500">{exp.paymentMethod}</td>
                      <td className="py-3 px-4 font-mono text-gray-400">{exp.receiptRef || '-'}</td>
                      <td className="py-3 px-4 text-right font-black text-rose-700">
                        {formatBRL(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Fluxo de Caixa (PRD §24) */}
      {activeTab === 'cash' && (
        <div className="space-y-4">
          {/* Barra de período e exportação */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Período
                </label>
                <select
                  value={cashPeriod}
                  onChange={(e) => setCashPeriod(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 focus:outline-hidden"
                >
                  {cashMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                  <option value="todos">Todo o histórico</option>
                </select>
              </div>

              <div className="flex items-center gap-4 pt-2 sm:pt-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-600 block">Entradas</span>
                  <span className="text-sm font-black text-emerald-700">{formatBRL(periodIn)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-rose-600 block">Saídas</span>
                  <span className="text-sm font-black text-rose-700">{formatBRL(periodOut)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Resultado</span>
                  <span className={`text-sm font-black ${periodResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatBRL(periodResult)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCashExcel}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                Excel
              </button>
              <button
                onClick={handleExportCashPdf}
                className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
              >
                PDF
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Descrição do Lançamento</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-right">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periodMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 text-gray-500">{formatDate(mov.date)}</td>
                      <td className="py-3 px-4">
                        {mov.type === 'entrada' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <ArrowDownRight className="h-3 w-3" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            <ArrowUpRight className="h-3 w-3" /> Saída
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize text-gray-600">{mov.category.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-gray-800 font-medium">{mov.description}</td>
                      <td className="py-3 px-4 text-right font-black">
                        <span className={mov.type === 'entrada' ? 'text-emerald-700' : 'text-rose-700'}>
                          {mov.type === 'entrada' ? '+' : '-'} {formatBRL(mov.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-700">
                        {formatBRL(movementBalance.get(mov.id) || 0)}
                      </td>
                    </tr>
                  ))}
                  {periodMovements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                        Nenhuma movimentação no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Baixar Recebimento */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-gray-900 mb-1">Confirmar Recebimento de Valor</h3>
            <p className="text-xs text-gray-500 mb-4">
              Cliente: {receivables.find((r) => r.id === selectedReceivableId)?.customerName}
            </p>

            <form onSubmit={handleConfirmReceive} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Valor Recebido (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  value={receiveMethod}
                  onChange={(e) => setReceiveMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                >
                  <option value="pix">Pix</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="cash">Dinheiro em Espécie</option>
                  <option value="transfer">Transferência / TED</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lançar Nova Despesa */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-gray-900 mb-4">Lançar Despesa Operacional</h3>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Categoria de Custo</label>
                <select
                  value={expenseCat}
                  onChange={(e) => setExpenseCat(e.target.value as PayableCategory)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 capitalize"
                >
                  <option value="combustivel">Combustível / Diesel</option>
                  <option value="manutencao">Manutenção Frota</option>
                  <option value="salario">Salários / Folha</option>
                  <option value="aluguel">Aluguel do Galpão</option>
                  <option value="energia">Energia Elétrica / Câmara Fria</option>
                  <option value="embalagens">Embalagens & Fitas</option>
                  <option value="impostos">Impostos / Tributos</option>
                  <option value="outros">Outros Custos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ex: Abastecimento caminhão placa HFG-8921"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Pagto</label>
                  <select
                    value={expenseMethod}
                    onChange={(e) => setExpenseMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900"
                  >
                    <option value="pix">Pix</option>
                    <option value="cash">Dinheiro</option>
                    <option value="credit">Cartão</option>
                    <option value="boleto">Boleto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Comprovante / NF-e</label>
                <input
                  type="text"
                  value={expenseReceipt}
                  onChange={(e) => setExpenseReceipt(e.target.value)}
                  placeholder="Ex: NF-e 44829 ou Recibo Posto"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
