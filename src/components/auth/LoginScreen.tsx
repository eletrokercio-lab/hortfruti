import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone, Building2, User, ArrowLeft, Sparkles } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signIn, signUpComprador, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'cadastro' | 'recuperar' | 'bootstrap'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    const res = await signIn(email, password);
    if (res.error) setError(res.error);
    setBusy(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!fullName || password.length < 6) {
      setError('Preencha nome e senha. A senha precisa de no mínimo 6 caracteres.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      setError('Informe o telefone com DDD (ex.: 47 99999-0000).');
      return;
    }
    setBusy(true);
    const res = await signUpComprador({ name: fullName, phone, password });
    if (res.error) {
      setError(res.error);
    } else if (res.needsEmailConfirm) {
      setInfo('Conta criada! Se o login não funcionar de primeira, chame o suporte para ativar.');
      setMode('login');
    } else {
      setInfo('Conta criada! Faça login com seu telefone e senha.');
      setMode('login');
    }
    setBusy(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    const res = await resetPassword(email);
    if (res.error) setError(res.error);
    else setInfo('Enviamos um link de recuperação para o seu e-mail.');
    setBusy(false);
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email || password.length < 6) {
      setError('Informe e-mail e senha (mínimo 6 caracteres).');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName: fullName || 'Master' }),
      });
      const json = await res.json();
      if (json.success) {
        setInfo(json.message + ' Use o formulário de login.');
        setMode('login');
      } else {
        setError(json.error || 'Falha ao criar a conta Master.');
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    }
    setBusy(false);
  };

  const inputClass =
    'w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="G. Less Hortifruti" className="h-24 w-auto drop-shadow-lg" />
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white">HortiGestão</h1>
          <p className="text-sm text-emerald-200">Distribuidora Inteligente de Hortifruti</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
          {mode === 'bootstrap' && (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Primeiro acesso — conta Master</h2>
                <p className="text-xs text-gray-500">
                  Cria a conta de administrador (você). Só funciona enquanto nenhuma conta Master existir.
                </p>
              </div>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className={inputClass} />
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha (mín. 6 caracteres)" className={inputClass} />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
              )}
              {info && (
                <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700">{info}</p>
              )}

              <button type="submit" disabled={busy} className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60">
                {busy ? 'Criando...' : 'Criar conta Master'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="flex w-full items-center justify-center gap-1 text-xs text-gray-500 hover:text-emerald-700">
                <ArrowLeft className="h-3 w-3" /> Voltar para o login
              </button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Entrar no sistema</h2>
                <p className="text-xs text-gray-500">Comprador: telefone com DDD e senha. Equipe: e-mail e senha.</p>
              </div>

              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Telefone (47 99999-0000) ou e-mail"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
              )}
              {info && (
                <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700">{info}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => { setMode('recuperar'); setError(''); setInfo(''); }} className="text-gray-500 hover:text-emerald-700">
                  Esqueci minha senha
                </button>
                <button type="button" onClick={() => { setMode('cadastro'); setError(''); setInfo(''); }} className="font-bold text-emerald-700 hover:text-emerald-800">
                  Sou comprador — criar conta
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setMode('bootstrap'); setError(''); setInfo(''); }}
                className="w-full pt-1 text-center text-[10px] text-gray-300 hover:text-gray-500"
                title="Acesso do criador do sistema"
              >
                Primeiro acesso do criador (Master)
              </button>
            </form>
          )}

          {mode === 'cadastro' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Criar conta de comprador</h2>
                <p className="text-xs text-gray-500">Para supermercados, mercadinhos e comerciantes. Veja o catálogo e faça seus pedidos.</p>
              </div>

              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do mercado ou empresa" className={inputClass} />
              </div>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone com DDD (47 99999-0000)" className={inputClass} />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crie uma senha (mín. 6 caracteres)" className={inputClass} />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
              )}
              {info && (
                <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700">{info}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? 'Criando conta...' : 'Criar minha conta'}
              </button>

              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="flex w-full items-center justify-center gap-1 text-xs text-gray-500 hover:text-emerald-700">
                <ArrowLeft className="h-3 w-3" /> Voltar para o login
              </button>
            </form>
          )}

          {mode === 'recuperar' && (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recuperar senha</h2>
                <p className="text-xs text-gray-500">
                  Enviaremos um link de recuperação para seu e-mail (equipe). Comprador que entrou por
                  telefone: fale com o suporte para redefinir a senha.
                </p>
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
              )}
              {info && (
                <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700">{info}</p>
              )}

              <button type="submit" disabled={busy} className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                {busy ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="flex w-full items-center justify-center gap-1 text-xs text-gray-500 hover:text-emerald-700">
                <ArrowLeft className="h-3 w-3" /> Voltar para o login
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-emerald-200/80">
          <Sparkles className="h-3 w-3" />
          Gestão de pedidos, entregas e colheita com IA
        </p>
      </div>
    </div>
  );
};
