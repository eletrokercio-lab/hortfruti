// Utility formatters for Brazilian Hortifruti Distribution System

export const formatBRL = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr || '-';
  }
};

export const formatDateTime = (dateTimeStr: string | undefined | null): string => {
  if (!dateTimeStr) return '-';
  try {
    const d = new Date(dateTimeStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateTimeStr;
  }
};

export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export const formatUnit = (unit: string): string => {
  switch (unit) {
    case 'cx':
      return 'caixas';
    case 'kg':
      return 'kg';
    case 'un':
      return 'unidades';
    case 'saco':
      return 'sacos';
    case 'bandeja':
      return 'bandejas';
    case 'duzia':
      return 'dúzias';
    default:
      return unit;
  }
};

export const getOrderStatusBadge = (status: string) => {
  switch (status) {
    case 'pendente':
      return { label: 'Pendente', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'em_separacao':
      return { label: 'Em Separação', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'pronto':
      return { label: 'Pronto p/ Rota', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
    case 'em_rota':
      return { label: 'Em Rota', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    case 'entregue':
      return { label: 'Entregue', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'cancelado':
      return { label: 'Cancelado', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    default:
      return { label: status, bg: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
};

export const getDeliveryStatusBadge = (status: string) => {
  switch (status) {
    case 'a_preparar':
      return { label: 'A Preparar', bg: 'bg-gray-100 text-gray-800 border-gray-200' };
    case 'separado':
      return { label: 'Separado', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'em_rota':
      return { label: 'Em Rota 🚚', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'entregue':
      return { label: 'Entregue ✅', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'problema':
      return { label: 'Problema / Recusa ⚠️', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    default:
      return { label: status, bg: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
};

export const getFinancialStatusBadge = (status: string) => {
  switch (status) {
    case 'pago':
      return { label: 'Pago', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'aberto':
      return { label: 'Em Aberto', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'vencido':
      return { label: 'Vencido', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    case 'parcial':
      return { label: 'Pago Parcial', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    default:
      return { label: status, bg: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
};

export const getPaymentTermLabel = (term: string) => {
  switch (term) {
    case 'sight':
      return 'À vista';
    case '7d':
      return '7 dias';
    case '15d':
      return '15 dias';
    case '30d':
      return '30 dias';
    case 'weekly':
      return 'Semanal';
    case 'biweekly':
      return 'Quinzenal';
    case 'monthly':
      return 'Mensal';
    default:
      return term;
  }
};
