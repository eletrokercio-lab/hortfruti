import React from 'react';
import {
  Home,
  ShoppingBag,
  Truck,
  CalendarCheck,
  ShoppingCart,
  Users,
  Box,
  Layers,
  CircleDollarSign,
  FileSpreadsheet,
  FileCheck2,
  Sparkles,
  Settings,
  Smartphone,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  supportMode?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile, supportMode }) => {
  const { currentTab, setCurrentTab, userRole, setIsAssistantOpen } = useApp();
  const { profile } = useAuth();
  const isMaster = profile?.role === 'master' && !supportMode;

  const handleNav = (tabId: string) => {
    setCurrentTab(tabId);
    onCloseMobile();
  };

  const navItemClass = (tabId: string) => {
    const isActive = currentTab === tabId;
    return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
      isActive
        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;
  };

  // If driver mode is active, show simplified menu tailored for delivery driver
  if (userRole === 'driver') {
    return (
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Smartphone className="h-4 w-4 text-amber-700" />
                Modo Motorista
              </div>
              <p className="text-[11px] text-amber-700 mt-1">Interface simplificada para celular e entregas diárias.</p>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => handleNav('driver-app')}
                className={navItemClass('driver-app')}
              >
                <Truck className="h-4 w-4" />
                <span>Minhas Entregas de Hoje</span>
              </button>

              <button
                onClick={() => handleNav('crates')}
                className={navItemClass('crates')}
              >
                <Layers className="h-4 w-4" />
                <span>Controle de Vasilhames</span>
              </button>
            </nav>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="flex w-full items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Assistente Entregas</span>
              </div>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // If accountant mode is active, focus on accounting tools
  if (userRole === 'accountant') {
    return (
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <div className="space-y-4">
            <div className="rounded-lg bg-purple-50 p-3 border border-purple-200 text-purple-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileCheck2 className="h-4 w-4 text-purple-700" />
                Portal do Contador
              </div>
              <p className="text-[11px] text-purple-700 mt-1">Acesso focado em faturamento, despesas e fechamento.</p>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => handleNav('accountant')}
                className={navItemClass('accountant')}
              >
                <FileCheck2 className="h-4 w-4" />
                <span>Central do Contador & Fechamento</span>
              </button>

              <button
                onClick={() => handleNav('finance')}
                className={navItemClass('finance')}
              >
                <CircleDollarSign className="h-4 w-4" />
                <span>Extrato & Contas a Pagar/Receber</span>
              </button>

              <button
                onClick={() => handleNav('reports')}
                className={navItemClass('reports')}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Relatórios Fiscais & Vendas</span>
              </button>
            </nav>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="flex w-full items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Resumo IA p/ Contador</span>
              </div>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Admin and Operator Full Menu
  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white transition-transform lg:static lg:translate-x-0 overflow-y-auto ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between p-3.5">
          <div className="space-y-5">
            {/* Top link: Início */}
            <div>
              <button
                onClick={() => handleNav('dashboard')}
                className={navItemClass('dashboard')}
              >
                <Home className="h-4 w-4" />
                <span>Início (Visão Geral)</span>
              </button>
            </div>

            {/* Painel Master: Usuários & Acessos */}
            {isMaster && (
              <div>
                <button
                  onClick={() => handleNav('users')}
                  className={navItemClass('users')}
                >
                  <ShieldCheck className="h-4 w-4 text-gray-900" />
                  <span>Usuários & Acessos (Master)</span>
                </button>
              </div>
            )}

            {/* Operação */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Operação</p>
              <button
                onClick={() => handleNav('orders')}
                className={navItemClass('orders')}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Pedidos de Venda</span>
              </button>

              <button
                onClick={() => handleNav('deliveries')}
                className={navItemClass('deliveries')}
              >
                <Truck className="h-4 w-4" />
                <span>Entregas & Rotas</span>
              </button>

              <button
                onClick={() => handleNav('planning')}
                className={navItemClass('planning')}
              >
                <CalendarCheck className="h-4 w-4" />
                <span>Planejamento & Colheita</span>
              </button>
            </div>

            {/* Abastecimento */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Abastecimento</p>

              <button
                onClick={() => handleNav('suppliers')}
                className={navItemClass('suppliers')}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Fornecedores & Compras</span>
              </button>

              <button
                onClick={() => handleNav('crates')}
                className={navItemClass('crates')}
              >
                <Layers className="h-4 w-4 text-blue-500" />
                <span>Controle de Vasilhames</span>
              </button>
            </div>

            {/* Cadastros */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Cadastros</p>
              <button
                onClick={() => handleNav('customers')}
                className={navItemClass('customers')}
              >
                <Users className="h-4 w-4" />
                <span>Clientes & Preços Próprios</span>
              </button>

              <button
                onClick={() => handleNav('products')}
                className={navItemClass('products')}
              >
                <Box className="h-4 w-4" />
                <span>Produtos & Tabela Base</span>
              </button>
            </div>

            {/* Financeiro */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Financeiro</p>
              <button
                onClick={() => handleNav('finance')}
                className={navItemClass('finance')}
              >
                <CircleDollarSign className="h-4 w-4" />
                <span>Contas & Fluxo de Caixa</span>
              </button>
            </div>

            {/* Gestão & Contabilidade (somente Master) */}
            {isMaster && (
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Contábil & Relatórios</p>
                <button
                  onClick={() => handleNav('accountant')}
                  className={navItemClass('accountant')}
                >
                  <FileCheck2 className="h-4 w-4 text-purple-600" />
                  <span>Central do Contador</span>
                </button>

                <button
                  onClick={() => handleNav('reports')}
                  className={navItemClass('reports')}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Relatórios Gerenciais</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Actions: AI & Settings */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="flex w-full items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>Assistente com IA</span>
              </div>
              <ChevronRight className="h-3 w-3" />
            </button>

            {isMaster && (
              <button
                onClick={() => handleNav('settings')}
                className={navItemClass('settings')}
              >
                <Settings className="h-4 w-4" />
                <span>Configurações & Backup</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
