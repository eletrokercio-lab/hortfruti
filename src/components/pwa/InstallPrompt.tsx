import React, { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'horti_install_dismissed_at';
const DISMISS_DAYS = 7;

/**
 * Banner de instalação do app (PWA).
 * Android/Chrome: usa o evento beforeinstallprompt com botão "Instalar".
 * iPhone/Safari: mostra as instruções (Adicionar à Tela de Início).
 * Não aparece quando o app já está instalado ou foi dispensado recentemente.
 */
export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const dismissedRecently =
      dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    if (dismissedRecently) return;

    // Já instalado? Não mostra nada.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', () => setVisible(false));

    // iPhone/iPad (Safari não dispara beforeinstallprompt)
    const isIos =
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);
    if (isIos) {
      const t = setTimeout(() => setShowIosHint(true), 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowIosHint(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferred(null);
  };

  if (!visible && !showIosHint) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-sm rounded-2xl border border-emerald-200 bg-white p-3 shadow-2xl md:right-6 md:left-auto">
      {deferred ? (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <Download className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900">Instalar o HortiGestão</p>
            <p className="truncate text-[11px] text-gray-500">
              Acesse direto pela tela inicial do celular.
            </p>
          </div>
          <button
            onClick={install}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            Instalar
          </button>
          <button
            onClick={dismiss}
            aria-label="Dispensar"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <Share2 className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gray-900">Instalar o HortiGestão no iPhone</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
              Toque no botão <strong>Compartilhar</strong> do Safari e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dispensar"
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
