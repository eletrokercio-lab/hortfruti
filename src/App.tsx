/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { BuyerPortal } from './components/buyer/BuyerPortal';
import { ShieldAlert, LogOut } from 'lucide-react';
import logo from './assets/logo.png';

// Main views
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { AIAssistantDrawer } from './components/assistant/AIAssistantDrawer';
import { Dashboard } from './components/dashboard/Dashboard';
import { OrdersList } from './components/orders/OrdersList';
import { NewOrderModal } from './components/orders/NewOrderModal';
import { DeliveriesManagement } from './components/deliveries/DeliveriesManagement';
import { DriverAppView } from './components/deliveries/DriverAppView';
import { PlanningView } from './components/planning/PlanningView';
import { CustomersView } from './components/customers/CustomersView';
import { CustomerDetailView } from './components/customers/CustomerDetailView';
import { ProductsView } from './components/products/ProductsView';
import { CratesManagement } from './components/crates/CratesManagement';
import { SuppliersView } from './components/suppliers/SuppliersView';
import { FinanceView } from './components/finance/FinanceView';
import { AccountantCenter } from './components/accountant/AccountantCenter';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { MasterUsers } from './components/master/MasterUsers';

/** Barra de aviso do modo suporte (Master operando como outro perfil) */
const SupportBanner: React.FC = () => {
  const { supportCustomer, exitSupportMode, signOut } = useAuth();
  if (!supportCustomer) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-900 px-4 py-2 text-white">
      <p className="text-xs font-semibold">
        🛠️ Modo Suporte — você está operando como{' '}
        <span className="font-black text-emerald-300">{supportCustomer.name}</span>. Tudo o que fizer aqui aparece como se fosse a tela dessa pessoa.
      </p>
      <div className="flex gap-2">
        <button
          onClick={exitSupportMode}
          className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold hover:bg-emerald-700"
        >
          Voltar ao Painel Master
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1 text-[11px] font-bold hover:bg-white/20"
        >
          <LogOut className="h-3 w-3" /> Sair
        </button>
      </div>
    </div>
  );
};

/** Layout operacional (master, operador e entregador) */
const MainLayout: React.FC<{ blocked?: boolean }> = ({ blocked }) => {
  const {
    currentTab,
    setCurrentTab,
    selectedCustomerId,
    setSelectedCustomerId,
    setUserRole,
  } = useApp();
  const { profile, supportCustomer } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [orderInitialDraft, setOrderInitialDraft] = useState<any>(null);

  // Sincroniza o papel interno do sistema com o perfil autenticado
  useEffect(() => {
    if (!profile) return;
    if (profile.role === 'master' || profile.role === 'operador') setUserRole('admin');
    if (profile.role === 'entregador') setUserRole('driver');
    // Cada perfil cai direto na sua tela principal
    if (profile.role === 'entregador' && !supportCustomer) setCurrentTab('driver-app');
  }, [profile, supportCustomer, setUserRole, setCurrentTab]);

  const handleOpenNewOrder = (draft?: any) => {
    setOrderInitialDraft(draft || null);
    setIsNewOrderModalOpen(true);
  };

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setCurrentTab('customer-detail');
  };

  const handleNewOrderForCustomer = (id: string) => {
    setOrderInitialDraft({ customerId: id });
    setIsNewOrderModalOpen(true);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-gray-50 text-gray-900 font-sans antialiased overflow-hidden">
      <SupportBanner />

      {/* Top Header */}
      <Header
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          supportMode={!!supportCustomer}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {blocked && (
            <div className="mx-auto mt-10 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
              <h2 className="mt-2 text-lg font-black text-amber-900">Conta aguardando liberação</h2>
              <p className="mt-1 text-sm text-amber-700">
                Seu acesso foi criado, mas ainda não foi liberado pela distribuidora. Fale com o suporte.
              </p>
            </div>
          )}

          {!blocked && currentTab === 'dashboard' && (
            <Dashboard
              onOpenNewOrder={() => handleOpenNewOrder()}
              onOpenNewCustomer={() => setCurrentTab('customers')}
            />
          )}

          {!blocked && currentTab === 'users' && <MasterUsers />}

          {!blocked && currentTab === 'orders' && (
            <OrdersList onOpenNewOrder={() => handleOpenNewOrder()} />
          )}

          {!blocked && currentTab === 'deliveries' && <DeliveriesManagement />}

          {!blocked && currentTab === 'driver-app' && <DriverAppView />}

          {!blocked && currentTab === 'planning' && <PlanningView />}

          {!blocked && currentTab === 'customers' && (
            <CustomersView
              onSelectCustomer={handleSelectCustomer}
              onOpenNewOrderForCustomer={handleNewOrderForCustomer}
            />
          )}

          {!blocked && currentTab === 'customer-detail' && selectedCustomerId && (
            <CustomerDetailView
              customerId={selectedCustomerId}
              onBack={() => setCurrentTab('customers')}
              onNewOrderForCustomer={handleNewOrderForCustomer}
            />
          )}

          {!blocked && currentTab === 'products' && <ProductsView />}

          {!blocked && currentTab === 'crates' && <CratesManagement />}

          {!blocked && currentTab === 'suppliers' && <SuppliersView />}

          {!blocked && currentTab === 'finance' && <FinanceView />}

          {!blocked && currentTab === 'accountant' && <AccountantCenter />}

          {!blocked && currentTab === 'reports' && <ReportsView />}

          {!blocked && currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        initialDraft={orderInitialDraft}
      />

      {/* Sliding AI Assistant Drawer */}
      <AIAssistantDrawer />
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { session, profile, loading, supportCustomer, signOut, exitSupportMode } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-gray-900">
        <div className="text-center">
          <img src={logo} alt="G. Less Hortifruti" className="mx-auto h-24 w-auto drop-shadow-lg" />
          <p className="mt-3 text-sm font-bold text-emerald-100">Carregando HortiGestão...</p>
          <div className="mx-auto mt-3.5 h-7 w-7 animate-spin rounded-full border-[3px] border-emerald-300/25 border-t-emerald-400" />
        </div>
      </div>
    );
  }

  // Sem sessão: tela de login / cadastro
  if (!session || !profile) {
    return <LoginScreen />;
  }

  // Conta bloqueada
  if (profile.status === 'bloqueado') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-900 p-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
          <h2 className="mt-2 text-lg font-black text-gray-900">Acesso bloqueado</h2>
          <p className="mt-1 text-sm text-gray-600">
            Sua conta está bloqueada. Entre em contato com a distribuidora.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  // Comprador (ou Master em modo suporte a comprador)
  const buyerCustomerId =
    profile.role === 'master' && supportCustomer?.asBuyer
      ? supportCustomer.customerId
      : profile.role === 'comprador'
        ? profile.customer_id
        : null;

  if (profile.role === 'comprador' || (profile.role === 'master' && supportCustomer?.asBuyer)) {
    if (!buyerCustomerId) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="mt-2 text-lg font-black text-amber-900">Cadastro comercial em análise</h2>
            <p className="mt-1 text-sm text-amber-700">
              Este acesso ainda não está vinculado a um cadastro de cliente pela distribuidora.
              Enquanto isso não é possível finalizar pedidos. Fale com o suporte.
            </p>
            <button
              onClick={() => (profile.role === 'master' ? exitSupportMode() : signOut())}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black"
            >
              {profile.role === 'master' ? 'Voltar ao Painel Master' : 'Sair'}
            </button>
          </div>
        </div>
      );
    }
    return (
      <AppProvider key={buyerCustomerId}>
        <BuyerPortalBridge customerId={buyerCustomerId} />
      </AppProvider>
    );
  }

  // Master / Operador / Entregador usam o layout operacional
  return (
    <AppProvider key={profile.id + (supportCustomer?.id || '')}>
      <MainLayout />
    </AppProvider>
  );
};

/** Ponte para o BuyerPortal (usa contexto limpo por cliente) */
const BuyerPortalBridge: React.FC<{ customerId: string }> = ({ customerId }) => {
  const { profile, supportCustomer, signOut, exitSupportMode } = useAuth();
  const inSupport = !!supportCustomer?.asBuyer;
  const name =
    (supportCustomer?.asBuyer && supportCustomer.name) ||
    profile?.full_name ||
    profile?.email ||
    'Comprador';
  return (
    <BuyerPortal
      customerId={customerId}
      buyerName={name}
      onSignOut={() => (inSupport ? exitSupportMode() : signOut())}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
}
