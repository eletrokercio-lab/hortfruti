import React, { useState } from 'react';
import {
  Settings,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  HelpCircle,
  Database,
  Building,
  CheckCircle2,
  AlertCircle,
  Code,
  Copy,
  ExternalLink,
  GitBranch,
  UploadCloud,
  RefreshCw,
  Download,
  FolderArchive,
  Save,
  KeyRound,
  Globe,
  FileCheck,
  Github,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  isSupabaseConfigured,
  getSupabaseStatus,
  getStoredSupabaseUrl,
  getStoredSupabaseKey,
  setSupabaseCredentials,
  DEFAULT_SUPABASE_KEY,
} from '../../lib/supabase';
import { supabaseService } from '../../services/supabaseService';

export const SettingsView: React.FC = () => {
  const { resetToInitialData, userRole, setUserRole, customers, products, orders } = useApp();

  const [inputUrl, setInputUrl] = useState(getStoredSupabaseUrl());
  const [inputKey, setInputKey] = useState(getStoredSupabaseKey());
  const [saveFeedback, setSaveFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // GitHub Integration state
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('horti_github_token') || '');
  const [githubUser, setGithubUser] = useState(() => localStorage.getItem('horti_github_user') || 'eletrokercio-lab');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('horti_github_repo') || 'hortfruti');
  const [isVerifyingGithub, setIsVerifyingGithub] = useState(false);
  const [isPushingGithub, setIsPushingGithub] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    verified?: boolean;
    avatarUrl?: string;
    name?: string;
    repoUrl?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const supabaseStatus = getSupabaseStatus();

  const handleSaveCredentials = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveFeedback(null);
    const res = setSupabaseCredentials(inputUrl, inputKey);
    setSaveFeedback(res);
    if (res.success) {
      setTimeout(() => setSaveFeedback(null), 4000);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'Deseja restaurar os dados de demonstração originais? Isso recarregará clientes, produtos, pedidos e dados fiscais de exemplo.'
      )
    ) {
      resetToInitialData();
      alert('Dados restaurados com sucesso!');
    }
  };

  const handleTestSupabase = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await supabaseService.testConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    const res = await supabaseService.uploadCurrentDataToSupabase({
      customers,
      products,
      orders,
    });
    setSyncResult(res.message);
    setIsSyncing(false);
  };

  const handleCopySqlSchema = async () => {
    try {
      const res = await fetch('/api/schema.sql');
      if (res.ok) {
        const text = await res.text();
        await navigator.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText('-- Script SQL do HortiGestão disponível no arquivo /supabase_schema.sql');
      }
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    }
  };

  const handleVerifyGithub = async () => {
    if (!githubToken.trim()) {
      setGithubStatus({
        verified: false,
        error: 'Informe seu Personal Access Token do GitHub com permissão "repo".',
      });
      return;
    }
    setIsVerifyingGithub(true);
    setGithubStatus(null);
    try {
      const res = await fetch('/api/github/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        localStorage.setItem('horti_github_token', githubToken.trim());
        localStorage.setItem('horti_github_user', data.username);
        setGithubUser(data.username);
        setGithubStatus({
          verified: true,
          avatarUrl: data.avatarUrl,
          name: data.name,
          message: `Conta @${data.username} conectada e autenticada com sucesso!`,
        });
      } else {
        setGithubStatus({
          verified: false,
          error: data.error || 'Token inválido ou sem autorização.',
        });
      }
    } catch (err: any) {
      setGithubStatus({
        verified: false,
        error: err.message || 'Erro ao conectar com a API do GitHub.',
      });
    } finally {
      setIsVerifyingGithub(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!githubToken.trim()) {
      setGithubStatus({
        verified: false,
        error: 'Insira o seu Personal Access Token do GitHub para autorizar o envio dos arquivos.',
      });
      return;
    }
    setIsPushingGithub(true);
    setGithubStatus(null);
    try {
      localStorage.setItem('horti_github_token', githubToken.trim());
      localStorage.setItem('horti_github_user', githubUser.trim());
      localStorage.setItem('horti_github_repo', githubRepo.trim());

      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          username: githubUser,
          repoName: githubRepo,
          commitMessage: 'feat: HortiGestão ERP atualizado com Supabase e IA Gemini',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGithubStatus({
          verified: true,
          repoUrl: data.repoUrl,
          message: `🎉 Projeto enviado com sucesso para ${data.repoUrl}!`,
        });
      } else {
        setGithubStatus({
          verified: false,
          error: data.error || 'Falha ao sincronizar com o GitHub.',
        });
      }
    } catch (err: any) {
      setGithubStatus({
        verified: false,
        error: err.message || 'Erro de conexão ao enviar para o GitHub.',
      });
    } finally {
      setIsPushingGithub(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-emerald-600" />
          Configurações, Supabase & Instalação Local
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Conecte seu banco de dados Supabase, baixe o projeto para seu computador e gerencie a distribuição
        </p>
      </div>

      {/* Local PC Download Card */}
      <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-xs">
              <FolderArchive className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Projeto no seu Computador (PC)</h2>
              <p className="text-xs text-gray-600">
                Instale e rode diretamente na sua pasta local:{' '}
                <code className="bg-emerald-100/70 text-emerald-900 font-mono px-1.5 py-0.5 rounded text-[11px] font-semibold">
                  C:\Users\kerci\OneDrive\Documentos\hortfrut-projeto
                </code>
              </p>
            </div>
          </div>

          <a
            href="/api/download-zip"
            download="hortfrut-projeto.zip"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Baixar Código Completo (.ZIP)</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">1</span>
              Baixe o arquivo ZIP
            </span>
            <p className="text-gray-600 text-[11px]">
              Clique no botão verde acima para baixar o arquivo <code className="text-emerald-700">hortfrut-projeto.zip</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">2</span>
              Extraia na sua pasta
            </span>
            <p className="text-gray-600 text-[11px]">
              Mova para <span className="font-mono text-[10px] text-gray-700">hortfrut-projeto</span> e use "Extrair tudo aqui" no Windows.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">3</span>
              Rode npm install & dev
            </span>
            <p className="text-gray-600 text-[11px]">
              Abra o terminal na pasta e execute <code className="bg-gray-100 px-1 rounded text-[10px]">npm install</code> e <code className="bg-gray-100 px-1 rounded text-[10px]">npm run dev</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Integration Card */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-xl shadow-xs">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Banco de Dados Supabase (PostgreSQL)</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    supabaseStatus.configured
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {supabaseStatus.configured ? 'Conectado' : 'Aguardando URL do Projeto'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Armazenamento relacional em nuvem com alta performance e persistência em tempo real
              </p>
            </div>
          </div>

          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <span>Painel do Supabase</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveCredentials} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-gray-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-emerald-600" />
              <span>Credenciais do seu Projeto Supabase</span>
            </h3>
            {supabaseStatus.configured && (
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                URL do Projeto (Project URL)
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                className="w-full text-xs font-mono px-3 py-2 border rounded-xl bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Encontre em: <strong>Project Settings → API → Project URL</strong>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                Chave da API (Publishable Key / Anon Key)
              </label>
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="sb_publishable_... ou eyJ..."
                className="w-full text-xs font-mono px-3 py-2 border rounded-xl bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-emerald-700 font-medium mt-1">
                ✓ Sua chave <code className="bg-emerald-100 px-1 rounded text-[10px]">sb_publishable_...</code> já foi configurada!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
            <div className="text-[11px] text-gray-500">
              As credenciais ficam salvas localmente no seu navegador e conectam em tempo real.
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Salvar Credenciais</span>
            </button>
          </div>

          {saveFeedback && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold border ${
                saveFeedback.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {saveFeedback.message}
            </div>
          )}
        </form>

        {/* Step by step guide to find Project URL */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-3 text-xs">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span>📍 Onde encontrar a URL do Projeto no Supabase:</span>
          </h3>

          <ol className="list-decimal list-inside space-y-2 text-gray-700 pl-1 leading-relaxed">
            <li>
              Acesse seu projeto no{' '}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">
                supabase.com/dashboard
              </a>.
            </li>
            <li>
              No menu lateral esquerdo, clique no ícone de <strong>Project Settings</strong> (ícone de engrenagem no rodapé do menu).
            </li>
            <li>
              Clique em <strong>Data API</strong> (ou <strong>API</strong>).
            </li>
            <li>
              No topo da página você verá a seção <strong>Project URL</strong> com o campo <strong>URL</strong> (exemplo: <code className="bg-white px-1.5 py-0.5 border rounded font-mono text-[11px]">https://rntpvewkdoxv.supabase.co</code>). Copie e cole no campo acima!
            </li>
            <li>
              <strong>Executar o Script SQL:</strong> Clique em <em>"SQL Editor"</em> no menu lateral do Supabase, cole o script das tabelas e clique em <strong>Run</strong>.
            </li>
          </ol>
        </div>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleTestSupabase}
            disabled={isTesting}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Testar Conexão</span>
          </button>

          <button
            onClick={handleSyncToSupabase}
            disabled={isSyncing || !supabaseStatus.configured}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs transition-colors disabled:opacity-40"
          >
            {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            <span>Sincronizar Dados Locais para o Supabase</span>
          </button>

          <button
            onClick={handleCopySqlSchema}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs"
          >
            {copiedSql ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
            <span>{copiedSql ? 'SQL Copiado para a Área de Transferência!' : 'Copiar Script SQL Completo'}</span>
          </button>

          <a
            href="/supabase_schema.sql"
            download="supabase_schema.sql"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-2xs"
          >
            <Download className="h-4 w-4 text-gray-500" />
            <span>Baixar supabase_schema.sql</span>
          </a>
        </div>

        {testResult && (
          <div
            className={`rounded-xl p-3 text-xs font-semibold border ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            {testResult.message}
          </div>
        )}

        {syncResult && (
          <div className="rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 p-3 text-xs font-semibold">
            {syncResult}
          </div>
        )}
      </div>

      {/* GitHub Repository Card */}
      <div className="rounded-2xl border-2 border-gray-900/10 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white font-black shadow-md">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Conexão com GitHub</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-900 text-white">
                  @eletrokercio-lab
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Sincronize e envie este projeto diretamente para o seu GitHub sem precisar do terminal
              </p>
            </div>
          </div>

          <a
            href="https://github.com/eletrokercio-lab"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3.5 py-2 text-xs font-bold text-gray-700 transition-colors shrink-0"
          >
            <span>Ver perfil @eletrokercio-lab</span>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
          </a>
        </div>

        {/* User Account Info Pill */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
          <div>
            <span className="text-[11px] font-medium text-gray-500 block">Conta GitHub:</span>
            <span className="font-bold text-gray-900 font-mono">eletrokercio-lab</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 block">E-mail:</span>
            <span className="font-bold text-gray-900 font-mono">eletrokercio@gmail.com</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 block">Repositório Destino:</span>
            <span className="font-bold text-emerald-700 font-mono">github.com/eletrokercio-lab/hortfruti</span>
          </div>
        </div>

        {/* Token Input Form */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-gray-700" />
                Personal Access Token do GitHub (PAT)
              </label>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=HortiGestao-Sync"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>🔑 Clique aqui para gerar o Token em 30s</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="Cole seu token aqui: ghp_xxxxxxxxxxxxxxxxxxxx ou github_pat_..."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs font-mono focus:border-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-900/10"
            />
            <p className="text-[11px] text-gray-500 leading-normal">
              O GitHub exige esse token com permissão <strong className="text-gray-800">repo</strong> para autorizar o envio automático dos arquivos. É rápido e seguro.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handlePushToGithub}
              disabled={isPushingGithub || !githubToken.trim()}
              className="flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-black px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-40"
            >
              {isPushingGithub ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Enviando arquivos para o GitHub...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 text-emerald-400" />
                  <span>🚀 Conectar e Enviar Projeto para o GitHub</span>
                </>
              )}
            </button>

            <button
              onClick={handleVerifyGithub}
              disabled={isVerifyingGithub || !githubToken.trim()}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-700 transition-colors disabled:opacity-40"
            >
              {isVerifyingGithub ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />
              )}
              <span>Verificar Token</span>
            </button>
          </div>

          {/* Status and Feedback */}
          {githubStatus && (
            <div
              className={`rounded-xl p-4 text-xs font-medium border ${
                githubStatus.verified
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                  : 'bg-rose-50 text-rose-950 border-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {githubStatus.verified ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{githubStatus.message || githubStatus.error}</p>
                  {githubStatus.repoUrl && (
                    <div className="pt-2">
                      <a
                        href={githubStatus.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 text-xs shadow-xs"
                      >
                        <span>Acessar Repositório no GitHub</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fallback / Manual Guide */}
          <details className="text-xs text-gray-600 pt-1">
            <summary className="cursor-pointer font-bold text-gray-700 hover:text-gray-900 select-none">
              Opção alternativa: Enviar manualmente via Terminal do Windows (clique para abrir)
            </summary>
            <div className="mt-3 rounded-xl bg-gray-900 p-4 font-mono text-xs text-emerald-400 space-y-1.5 overflow-x-auto shadow-inner">
              <div className="text-gray-400"># Na pasta C:\Users\kerci\OneDrive\Documentos\hortfrut-projeto:</div>
              <div>git init</div>
              <div>git add .</div>
              <div>git commit -m "feat: HortiGestão ERP com Supabase e IA"</div>
              <div>git branch -M main</div>
              <div className="text-amber-300">git remote add origin https://github.com/eletrokercio-lab/hortfrut.git</div>
              <div className="text-cyan-300">git push -u origin main</div>
            </div>
          </details>
        </div>
      </div>

      {/* Simulator / Role Selector */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Perfil de Acesso do Sistema</h3>
        <p className="text-xs text-gray-500">
          Você pode alternar o perfil para testar a experiência específica de cada operador:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <button
            onClick={() => setUserRole('admin')}
            className={`p-3 rounded-xl border text-left text-xs transition-all ${
              userRole === 'admin'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20 font-bold'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="block font-bold">1. Proprietário</span>
            <span className="text-[11px] text-gray-500 font-normal">Acesso total e relatórios</span>
          </button>

          <button
            onClick={() => setUserRole('operator')}
            className={`p-3 rounded-xl border text-left text-xs transition-all ${
              userRole === 'operator'
                ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20 font-bold'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="block font-bold">2. Operador</span>
            <span className="text-[11px] text-gray-500 font-normal">Pedidos e necessidades</span>
          </button>

          <button
            onClick={() => setUserRole('driver')}
            className={`p-3 rounded-xl border text-left text-xs transition-all ${
              userRole === 'driver'
                ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600/20 font-bold'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="block font-bold">3. Motorista</span>
            <span className="text-[11px] text-gray-500 font-normal">Foco mobile & pesagem</span>
          </button>

          <button
            onClick={() => setUserRole('accountant')}
            className={`p-3 rounded-xl border text-left text-xs transition-all ${
              userRole === 'accountant'
                ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20 font-bold'
                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="block font-bold">4. Contador</span>
            <span className="text-[11px] text-gray-500 font-normal">Fechamento fiscal</span>
          </button>
        </div>
      </div>

      {/* Reset Data */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-rose-900">Restaurar Dados de Demonstração</h3>
          <p className="text-xs text-rose-700 mt-0.5">
            Volta o sistema para o conjunto inicial oficial de produtos, clientes de exemplo, pedidos e faturas.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs shrink-0"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Restaurar Padrão</span>
        </button>
      </div>
    </div>
  );
};

