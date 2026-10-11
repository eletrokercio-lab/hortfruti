import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Bell,
  Menu,
  Check,
  ChevronDown,
  Trash2,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onOpenSearch }) => {
  const {
    setIsAssistantOpen,
    notifications,
    dismissNotification,
    clearAllNotifications,
    setCurrentTab,
  } = useApp();
  const { profile, signOut } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const isMaster = profile?.role === 'master';

  const roleBadge: Record<string, { title: string; color: string }> = {
    master: { title: 'Master · Suporte', color: 'bg-gray-900 text-white' },
    operador: { title: 'Cliente Master · Operação', color: 'bg-emerald-600 text-white' },
    entregador: { title: 'Entregador', color: 'bg-amber-600 text-white' },
    comprador: { title: 'Comprador', color: 'bg-blue-600 text-white' },
  };
  const badge = roleBadge[profile?.role || 'operador'] || roleBadge.operador;

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 shadow-xs">
      {/* Left: Mobile hamburger + Brand Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          title="Abrir Menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
          <img src={logo} alt="G. Less Hortifruti" className="h-9 w-auto" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-gray-900">HortiGestão</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                v3.0
              </span>
            </div>
            <p className="hidden text-[11px] text-gray-500 sm:block leading-none">G. Less Hortifruti · Distribuidora</p>
          </div>
        </div>
      </div>

      {/* Center: Global Search Trigger */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-500 hover:border-emerald-300 hover:bg-white hover:text-gray-700 transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <span>Buscar cliente, produto, pedido, entrega...</span>
          </div>
          <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Search Mobile, Notifications, AI Assistant, Role Switcher */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile Search Icon */}
        <button
          onClick={onOpenSearch}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          title="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* AI Assistant Button (PRD §30) */}
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-all shadow-2xs active:scale-95"
          title="Abrir Assistente com IA"
        >
          <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
          <span className="hidden sm:inline">Assistente</span>
          <span className="rounded-xs bg-emerald-200/80 px-1 text-[10px] text-emerald-900 font-bold">IA</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Notificações"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl border border-gray-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <div>
                  <span className="font-semibold text-sm text-gray-800">
                    Notificações ({unreadNotifications.length} novas)
                  </span>
                  <p className="text-[10px] text-gray-400">Clique em uma notificação para resolvê-la e removê-la</p>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAllNotifications()}
                    className="text-xs text-gray-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Limpar todas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 py-1">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-xs text-gray-500">Nenhuma notificação no momento.</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        // Lida = some da lista (e do banco)
                        dismissNotification(notif.id);
                        if (notif.actionTab) setCurrentTab(notif.actionTab);
                        setShowNotifications(false);
                      }}
                      className={`flex flex-col gap-1 p-2.5 rounded-lg cursor-pointer transition-colors ${
                        notif.read ? 'hover:bg-gray-50 opacity-75' : 'bg-emerald-50/50 hover:bg-emerald-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-900">
                        <span>{notif.title}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{notif.date}</span>
                      </div>
                      <p className="text-xs text-gray-600">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Usuário autenticado + Sair */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1.5">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${badge.color}`}
          >
            {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-xs font-bold leading-tight text-gray-900">
              {profile?.full_name || profile?.email}
            </p>
            <p className="text-[10px] text-gray-500 leading-tight">{badge.title}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-rose-600"
            title="Sair da conta"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
