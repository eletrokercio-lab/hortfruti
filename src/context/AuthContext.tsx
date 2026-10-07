import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import type { AppProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  profile: AppProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUpComprador: (data: {
    email: string;
    password: string;
    fullName: string;
    company: string;
    phone: string;
  }) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  // Modo suporte (apenas master): operar como um cliente master ou comprador
  supportCustomer: { id: string; name: string; asBuyer?: boolean; customerId?: string } | null;
  enterSupportMode: (customer: { id: string; name: string; asBuyer?: boolean; customerId?: string }) => void;
  exitSupportMode: () => void;
}

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

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase não configurado neste dispositivo.' };
    const { error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: traduzErro(error.message) };
    return {};
  };

  const signUpComprador = async (data: {
    email: string;
    password: string;
    fullName: string;
    company: string;
    phone: string;
  }): Promise<{ error?: string; needsEmailConfirm?: boolean }> => {
    const client = getSupabaseClient();
    if (!client) return { error: 'Supabase não configurado neste dispositivo.' };
    const { data: result, error } = await client.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          company: data.company,
          phone: data.phone,
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
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique a caixa de entrada).';
  if (m.includes('user already registered')) return 'Este e-mail já possui conta. Faça login.';
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
