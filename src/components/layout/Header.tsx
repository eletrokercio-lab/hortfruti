import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Bell,
  Menu,
  UserCheck,
  Check,
  ChevronDown,
  Trash2,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu, onOpenSearch }) => {
  const {
    userRole,
    setUserRole,
    setIsAssistantOpen,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    setCurrentTab,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/download-zip');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hortfrut-projeto.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Falha ao baixar:', err);
      // Fallback direct link
      window.location.href = '/api/download-zip';
    } finally {
      setIsDownloading(false);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  const roleLabels: Record<UserRole, { title: string; subtitle: string; color: string }> = {
    admin: {
      title: 'Proprietário',
      subtitle: 'Acesso total',
      color: 'bg-emerald-600 text-white',
    },
    operator: {
      title: 'Operador',
      subtitle: 'Rotina diária',
      color: 'bg-blue-600 text-white',
    },
    driver: {
      title: 'Motorista',
      subtitle: 'Entregas Mobile',
      color: 'bg-amber-600 text-white',
    },
    accountant: {
      title: 'Contador',
      subtitle: 'Fiscal e Fechamento',
      color: 'bg-purple-600 text-white',
    },
  };

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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs font-black text-lg">
            🥬
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-gray-900">HortiGestão</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                v3.0
              </span>
            </div>
            <p className="hidden text-[11px] text-gray-500 sm:block leading-none">Distribuidora Inteligente</p>
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

        {/* Download Project ZIP */}
        <button
          onClick={handleDownloadZip}
          disabled={isDownloading}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
          title="Baixar arquivos do projeto (.ZIP) para seu computador"
        >
          <Download className={`h-4 w-4 text-emerald-600 ${isDownloading ? 'animate-bounce' : ''}`} />
          <span>{isDownloading ? 'Baixando...' : 'Baixar ZIP'}</span>
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
                <span className="font-semibold text-sm text-gray-800">
                  Notificações ({unreadNotifications.length} novas)
                </span>
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
                        markNotificationAsRead(notif.id);
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

        {/* Profile / Role Switcher (PRD §3) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${roleLabels[userRole].color}`}
            >
              {userRole[0].toUpperCase()}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-bold leading-tight text-gray-900">{roleLabels[userRole].title}</p>
              <p className="text-[10px] text-gray-500 leading-tight">{roleLabels[userRole].subtitle}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl z-50">
              <div className="border-b border-gray-100 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Simular Perfil de Usuário
                </p>
                <p className="text-xs text-gray-500">Alterna a interface e permissões de segurança</p>
              </div>

              <div className="space-y-1 py-1">
                {(Object.keys(roleLabels) as UserRole[]).map((roleKey) => (
                  <button
                    key={roleKey}
                    onClick={() => {
                      setUserRole(roleKey);
                      setShowRoleMenu(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      userRole === roleKey
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${roleLabels[roleKey].color}`}
                      >
                        {roleKey[0].toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div>{roleLabels[roleKey].title}</div>
                        <div className="text-[10px] text-gray-400 font-normal">
                          {roleLabels[roleKey].subtitle}
                        </div>
                      </div>
                    </div>
                    {userRole === roleKey && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
