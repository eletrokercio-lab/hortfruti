/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { AIAssistantDrawer } from './components/assistant/AIAssistantDrawer';

// Main views
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

const MainLayout: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    selectedCustomerId,
    setSelectedCustomerId,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [orderInitialDraft, setOrderInitialDraft] = useState<any>(null);

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
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <Dashboard
              onOpenNewOrder={() => handleOpenNewOrder()}
              onOpenNewCustomer={() => setCurrentTab('customers')}
            />
          )}

          {currentTab === 'orders' && (
            <OrdersList onOpenNewOrder={() => handleOpenNewOrder()} />
          )}

          {currentTab === 'deliveries' && <DeliveriesManagement />}

          {currentTab === 'driver-app' && <DriverAppView />}

          {currentTab === 'planning' && <PlanningView />}

          {currentTab === 'customers' && (
            <CustomersView
              onSelectCustomer={handleSelectCustomer}
              onOpenNewOrderForCustomer={handleNewOrderForCustomer}
            />
          )}

          {currentTab === 'customer-detail' && selectedCustomerId && (
            <CustomerDetailView
              customerId={selectedCustomerId}
              onBack={() => setCurrentTab('customers')}
              onNewOrderForCustomer={handleNewOrderForCustomer}
            />
          )}

          {currentTab === 'products' && <ProductsView />}

          {currentTab === 'crates' && <CratesManagement />}

          {currentTab === 'suppliers' && <SuppliersView />}

          {currentTab === 'finance' && <FinanceView />}

          {currentTab === 'accountant' && <AccountantCenter />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'settings' && <SettingsView />}
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

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
