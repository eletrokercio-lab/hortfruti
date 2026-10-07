import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'horti_supabase_url';
const STORAGE_KEY_KEY = 'horti_supabase_key';

// Default project credentials configured for the user
export const DEFAULT_SUPABASE_URL = 'https://trhhqnwmezzihbldqmls.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_-lRqeEJOWadbwY0XcHddgw_3w_auOxn';

export const getStoredSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_URL);
    if (stored) return stored.trim();
  }
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  if (envUrl && !envUrl.includes('sua-url-do-projeto')) return envUrl;
  return DEFAULT_SUPABASE_URL;
};

export const getStoredSupabaseKey = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_KEY);
    if (stored) return stored.trim();
  }
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (envKey && !envKey.includes('sua-chave')) return envKey;
  return DEFAULT_SUPABASE_KEY;
};

export const isValidSupabaseUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  return clean.startsWith('https://') && clean.includes('.supabase.co') && !clean.includes('sua-url-do-projeto');
};

export const isValidSupabaseKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  const clean = key.trim();
  return (
    (clean.startsWith('sb_publishable_') || clean.startsWith('eyJ') || clean.length > 20) &&
    !clean.includes('sua-chave')
  );
};

export const isSupabaseConfigured = (): boolean => {
  const url = getStoredSupabaseUrl();
  const key = getStoredSupabaseKey();
  return isValidSupabaseUrl(url) && isValidSupabaseKey(key);
};

let currentClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    currentClient = null;
    return null;
  }

  const url = getStoredSupabaseUrl();
  const key = getStoredSupabaseKey();

  if (!currentClient) {
    try {
      currentClient = createClient(url, key);
    } catch {
      currentClient = null;
    }
  }
  return currentClient;
};

export const setSupabaseCredentials = (url: string, key: string): { success: boolean; message: string } => {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  if (!isValidSupabaseUrl(cleanUrl)) {
    return {
      success: false,
      message: 'URL inválida. A URL deve começar com https:// e terminar com .supabase.co (ex: https://xyzabc.supabase.co)',
    };
  }

  if (!isValidSupabaseKey(cleanKey)) {
    return {
      success: false,
      message: 'Chave inválida. Utilize uma chave que comece com sb_publishable_ ou a chave pública anon.',
    };
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
  }

  try {
    currentClient = createClient(cleanUrl, cleanKey);
    return {
      success: true,
      message: 'Credenciais salvas com sucesso! Conexão configurada.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao inicializar cliente: ${err.message}`,
    };
  }
};

export const clearSupabaseCredentials = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  currentClient = null;
};

// Backwards-compatible export proxy
export const supabase = {
  get from() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not configured. Configure Project URL in Settings.');
    }
    return client.from.bind(client);
  },
};

export interface SupabaseConfigStatus {
  configured: boolean;
  url: string;
  hasKey: boolean;
  keyPreview: string;
}

export const getSupabaseStatus = (): SupabaseConfigStatus => {
  const url = getStoredSupabaseUrl();
  const key = getStoredSupabaseKey();
  const keyPreview = key ? `${key.substring(0, 15)}...${key.substring(key.length - 4)}` : '';

  return {
    configured: isSupabaseConfigured(),
    url: url || '',
    hasKey: isValidSupabaseKey(key),
    keyPreview,
  };
};

