import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import type { AppProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  profile: AppProfile | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error?: string }>;
  signUpComprador: (data: {
    name: string;
    phone: string;
    password: string;
  }) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  // Modo suporte (apenas master): operar como um cliente master ou comprador
  supportCustomer: { id: string; name: string; asBuyer?: boolean; customerId?: string } | null;
  enterSupportMode: (customer: { id: string; name: string; asBuyer?: boolean; customerId?: string }) => void;
  exitSupportMode: () => void;
}

// Domínio interno: o comprador entra com telefone, o Supabase autentica
// com um e-mail sintético derivado dele (invisível para o usuário)
const BUYER_EMAIL_DOMAIN = 'comprador.hortigestao.com';

export const normalizePhoneDigits = (phone: string): string => {
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
};

export const phoneToSyntheticEmail = (phone: string): string | null => {
  const d = normalizePhoneDigits(phone);
  if (d.length < 10 || d.length > 11) return null;
  return `${d}@${BUYER_EMAIL_DOMAIN}`;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supportCustomer, setSupportCustomer] = useState<{ id: string; name: string; asBuyer?: boolean; customerId?: string } | null>(null);

  const loadProfile = async (userId: string): Promise<AppProfile | null> => {
    const client = getSupabaseClient();
    if (!client) return null;
    const { data } = await client
      .from('app_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return (data as AppProfile) || null;
  };

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession().then(async ({ data: { session: current } }) => {
      setSession(current);
      if (current?.user) {
        setProfile(await loadProfile(current.user.id));
      }
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setProfile(await loadProfile(newSession.user.id));
      } else {
        setProfile(null);
        setSupportCustomer(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Aceita e-mail (staff e contas antigas) OU telefone do comprador (gera e-mail sintético)
  const signIn = async (identifier: string, password: string): Promise<{ error?: string }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase não configurado neste dispositivo.' };
    const value = identifier.trim();
    let email = value.toLowerCase();
    if (!email.includes('@')) {
      const synthetic = phoneToSyntheticEmail(value);
      if (!synthetic) {
        return {
          error:
            'Telefone inválido. Informe com DDD (ex.: 47 99999-0000) ou entre com seu e-mail.',
        };
      }
      email = synthetic;
    }
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: traduzErro(error.message) };
    return {};
  };

  // Cadastro simplificado: nome + telefone + senha (e-mail sintético derivado do telefone)
  const signUpComprador = async (data: {
    name: string;
    phone: string;
    password: string;
  }): Promise<{ error?: string; needsEmailConfirm?: boolean }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase não configurado neste dispositivo.' };
    const email = phoneToSyntheticEmail(data.phone);
    if (!email) {
      return { error: 'Telefone inválido. Informe com DDD (ex.: 47 99999-0000).' };
    }
    const name = data.name.trim();
    const { data: result, error } = await client.auth.signUp({
      email,
      password: data.password,
      options: {
        data: {
          full_name: name,
          company: name,
          phone: normalizePhoneDigits(data.phone),
          role: 'comprador',
        },
      },
    });
    if (error) return { error: traduzErro(error.message) };
    // Se o projeto exigir confirmação de e-mail, session vem vazia
    if (!result.session) return { needsEmailConfirm: true };
    return {};
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    setProfile(null);
    setSession(null);
    setSupportCustomer(null);
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase não configurado neste dispositivo.' };
    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) return { error: traduzErro(error.message) };
    return {};
  };

  const enterSupportMode = (customer: { id: string; name: string }) => setSupportCustomer(customer);
  const exitSupportMode = () => setSupportCustomer(null);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signIn,
        signUpComprador,
        signOut,
        resetPassword,
        supportCustomer,
        enterSupportMode,
        exitSupportMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Telefone/e-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))
    return 'Conta ainda não confirmada. Se cadastrou por telefone, chame o suporte para ativar.';
  if (m.includes('user already registered')) return 'Este telefone/e-mail já possui conta. Faça login.';
  if (m.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (m.includes('unable to validate email')) return 'E-mail inválido. Verifique e tente novamente.';
  return msg;
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
