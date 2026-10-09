import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';

const execAsync = promisify(exec);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side initialization of Gemini client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper for currency formatting
const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

// API: Health / Status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!apiKey,
    timestamp: new Date().toISOString(),
  });
});

// API: Download Complete Project Zip
app.get('/api/download-zip', (_req: Request, res: Response) => {
  const zipPath = path.join(__dirname, 'hortfrut-projeto.zip');
  res.download(zipPath, 'hortfrut-projeto.zip');
});

// API: Get Supabase SQL Schema
app.get('/api/schema.sql', (_req: Request, res: Response) => {
  const sqlPath = path.join(__dirname, 'supabase_schema.sql');
  res.sendFile(sqlPath);
});

// API: Verify GitHub Account / Token
app.post('/api/github/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token de Acesso do GitHub não informado.' });
      return;
    }

    const cleanToken = token.trim();
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'HortiGestao-App',
      },
    });

    if (!ghRes.ok) {
      res.status(401).json({ error: 'Token do GitHub inválido ou sem permissão de acesso.' });
      return;
    }

    const user = await ghRes.json();
    res.json({
      valid: true,
      username: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
      publicRepos: user.public_repos,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Falha ao conectar com o GitHub.' });
  }
});

// ============================================================
// API: Administração de usuários (exclusivo do perfil MASTER)
// Usa a SUPABASE_SERVICE_ROLE_KEY (somente servidor, via Secrets)
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://trhhqnwmezzihbldqmls.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const validRoles = ['master', 'operador', 'entregador', 'comprador'];

async function requireMaster(req: Request): Promise<{ ok: boolean; error?: string; userId?: string; token?: string; role?: string }> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Adicione em My app > Secrets.' };
  }
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '').trim();
  if (!token) {
    return { ok: false, error: 'Autenticação necessária.' };
  }
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return { ok: false, error: 'Sessão inválida ou expirada.' };
    const user: any = await userRes.json();

    // 1ª tentativa: leitura com a service key
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/app_profiles?id=eq.${user.id}&select=role,status`,
      { headers: serviceHeaders }
    );
    let profiles: any = await profRes.json().catch(() => null);

    // 2ª tentativa: leitura com o próprio token do usuário (RLS permite: dono ou master)
    if (!Array.isArray(profiles) || profiles.length === 0) {
      const profRes2 = await fetch(
        `${SUPABASE_URL}/rest/v1/app_profiles?id=eq.${user.id}&select=role,status`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` } }
      );
      profiles = await profRes2.json().catch(() => null);
    }

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { ok: false, error: 'Perfil não encontrado no banco. Verifique se o SQL de segurança foi executado.' };
    }
    if (profiles[0].role !== 'master') {
      return { ok: false, error: 'Apenas o perfil Master pode administrar usuários.' };
    }
    return { ok: true, userId: user.id, token, role: profiles[0].role as string };
  } catch (err: any) {
    return { ok: false, error: 'Falha ao validar permissões: ' + err.message };
  }
}

// Staff = master (tudo) ou operador (apenas entregadores, para o fluxo de expedição)
async function requireStaff(req: Request): Promise<{ ok: boolean; error?: string; userId?: string; token?: string; role?: string }> {
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '').trim();
  if (!token) {
    return { ok: false, error: 'Autenticação necessária.' };
  }
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return { ok: false, error: 'Sessão inválida ou expirada.' };
    const user: any = await userRes.json();

    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/app_profiles?id=eq.${user.id}&select=role,status`,
      { headers: serviceHeaders }
    );
    let profiles: any = await profRes.json().catch(() => null);
    if (!Array.isArray(profiles) || profiles.length === 0) {
      const profRes2 = await fetch(
        `${SUPABASE_URL}/rest/v1/app_profiles?id=eq.${user.id}&select=role,status`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` } }
      );
      profiles = await profRes2.json().catch(() => null);
    }
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { ok: false, error: 'Perfil não encontrado no banco.' };
    }
    const role = profiles[0].role as string;
    if (role !== 'master' && role !== 'operador') {
      return { ok: false, error: 'Sem permissão para cadastrar entregadores.' };
    }
    if (profiles[0].status !== 'ativo') {
      return { ok: false, error: 'Sua conta está bloqueada. Fale com o suporte.' };
    }
    return { ok: true, userId: user.id, token, role };
  } catch (err: any) {
    return { ok: false, error: 'Falha ao validar permissões: ' + err.message };
  }
}

const serviceHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

// POST /api/admin/bootstrap — cria a PRIMEIRA conta Master do sistema.
// Só funciona enquanto nenhuma conta Master existir (uso único).
app.post('/api/admin/bootstrap', async (_req: Request, res: Response) => {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor (My app > Secrets).' });
    return;
  }
  try {
    // Verifica se já existe master
    const check = await fetch(
      `${SUPABASE_URL}/rest/v1/app_profiles?role=eq.master&select=id&limit=1`,
      { headers: serviceHeaders }
    );
    const existing = await check.json();
    if (Array.isArray(existing) && existing.length > 0) {
      res.status(403).json({ error: 'Já existe uma conta Master. Use o Painel Master para criar outras contas.' });
      return;
    }

    const { email, password, fullName } = _req.body || {};
    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: 'Informe e-mail e senha (mínimo 6 caracteres).' });
      return;
    }

    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || 'Master', role: 'master' },
      }),
    });
    if (!createRes.ok) {
      const err: any = await createRes.json().catch(() => ({}));
      res.status(400).json({ error: err.msg || err.message || 'Falha ao criar usuário no Supabase Auth.' });
      return;
    }
    const created: any = await createRes.json();

    await fetch(`${SUPABASE_URL}/rest/v1/app_profiles?id=eq.${created.id}`, {
      method: 'PATCH',
      headers: serviceHeaders,
      body: JSON.stringify({ role: 'master', full_name: fullName || 'Master', status: 'ativo' }),
    });

    res.json({ success: true, message: `Conta Master criada para ${created.email}. Faça login no app.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro no bootstrap: ' + err.message });
  }
});

// GET /api/admin/users — lista todos os perfis
app.get('/api/admin/users', async (req: Request, res: Response) => {
  const gate = await requireMaster(req);
  if (!gate.ok) {
    res.status(403).json({ error: gate.error });
    return;
  }
  try {
    // 1ª tentativa: service key; 2ª: token do Master (RLS permite master ler todos)
    let listRes = await fetch(
      `${SUPABASE_URL}/rest/v1/app_profiles?select=*&order=created_at.desc`,
      { headers: serviceHeaders }
    );
    let profiles: any = await listRes.json().catch(() => null);
    if (!Array.isArray(profiles)) {
      listRes = await fetch(
        `${SUPABASE_URL}/rest/v1/app_profiles?select=*&order=created_at.desc`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${gate.token}` } }
      );
      profiles = await listRes.json().catch(() => null);
    }
    res.json({ success: true, profiles: Array.isArray(profiles) ? profiles : [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar usuários: ' + err.message });
  }
});

// POST /api/admin/users — cria conta (master: todas; operador: somente entregador)
app.post('/api/admin/users', async (req: Request, res: Response) => {
  const gate = await requireStaff(req);
  if (!gate.ok) {
    res.status(403).json({ error: gate.error });
    return;
  }
  try {
    const { email, password, fullName, phone, role, customerId, driverName } = req.body;

    // Operador pode cadastrar APENAS entregadores (fluxo de expedição)
    if (gate.role === 'operador' && role !== 'entregador') {
      res.status(403).json({ error: 'Operador só pode cadastrar contas de entregador.' });
      return;
    }

    if (!email || !password || !role || !validRoles.includes(role)) {
      res.status(400).json({ error: 'Informe e-mail, senha e um papel válido (master, operador, entregador ou comprador).' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    // 1. Cria o usuário no Auth (confirmado, sem convite por e-mail)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || '', phone: phone || '', role },
      }),
    });

    if (!createRes.ok) {
      const createErr: any = await createRes.json().catch(() => ({}));
      const msg = createErr.msg || createErr.message || 'Falha ao criar usuário no Supabase Auth.';
      res.status(400).json({ error: msg });
      return;
    }
    const createdUser: any = await createRes.json();

    // Atualiza o perfil com o token do Master (RLS: master gerencia perfis)
    const profilePatch: Record<string, any> = {
      role,
      full_name: fullName || '',
      status: 'ativo',
    };
    if (customerId) profilePatch.customer_id = customerId;
    if (driverName) profilePatch.driver_name = driverName;
    if (phone) profilePatch.phone = phone;

    // Comprador sem vínculo: cria o cadastro de cliente via service_role
    // (garante o vínculo mesmo se o trigger de auto-vínculo não estiver aplicado)
    if (role === 'comprador' && !customerId) {
      try {
        const newCustId = 'cust-' + String(createdUser.id).replace(/-/g, '').slice(0, 8).toUpperCase();
        const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: 'POST',
          headers: { ...serviceHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({
            id: newCustId,
            name: fullName || createdUser.email,
            document: '',
            phone: '',
            street: 'A informar',
            number: 'S/N',
            neighborhood: 'A informar',
            city: 'A informar',
            status: 'active',
            payment_method: 'pix',
            payment_term: 'vista',
            commercial_condition: 'Auto-cadastro pelo app',
            notes: 'Cadastro criado automaticamente na criação da conta.',
          }),
        });
        if (custRes.ok) profilePatch.customer_id = newCustId;
      } catch {
        // best-effort: o trigger/backfill cobre depois
      }
    }

    await fetch(`${SUPABASE_URL}/rest/v1/app_profiles?id=eq.${createdUser.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${gate.token}` },
      body: JSON.stringify(profilePatch),
    });

    res.json({
      success: true,
      userId: createdUser.id,
      email: createdUser.email,
      role,
      message: `Conta de ${role} criada com sucesso para ${createdUser.email}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao criar usuário: ' + err.message });
  }
});

// PATCH /api/admin/users — aprovar (pendente->ativo), bloquear ou reativar
app.patch('/api/admin/users', async (req: Request, res: Response) => {
  const gate = await requireMaster(req);
  if (!gate.ok) {
    res.status(403).json({ error: gate.error });
    return;
  }
  try {
    const { userId, status } = req.body;
    if (!userId || !['ativo', 'pendente', 'bloqueado'].includes(status)) {
      res.status(400).json({ error: 'Informe userId e status válido (ativo, pendente ou bloqueado).' });
      return;
    }
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/app_profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${gate.token}` },
      body: JSON.stringify({ status }),
    });
    if (!patchRes.ok) {
      res.status(400).json({ error: 'Falha ao atualizar o perfil do usuário.' });
      return;
    }

    // Bloquear também impede o login no Auth
    if (status === 'bloqueado') {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: serviceHeaders,
        body: JSON.stringify({ ban_duration: '876000h' }),
      });
    } else {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: serviceHeaders,
        body: JSON.stringify({ ban_duration: 'none' }),
      });
    }

    res.json({ success: true, message: `Usuário atualizado para "${status}".` });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar usuário: ' + err.message });
  }
});

// API: Sync and Push Code directly to GitHub repository
app.post('/api/github/push', async (req: Request, res: Response) => {
  try {
    const { token, username = 'eletrokercio-lab', repoName = 'hortfruti', commitMessage } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Personal Access Token do GitHub é obrigatório para autenticar o envio.' });
      return;
    }

    const cleanToken = token.trim();
    const cleanUser = username.trim();
    const cleanRepo = repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '') || 'hortfruti';

    // 1. Verify token with GitHub
    const authCheck = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'HortiGestao-App',
      },
    });

    if (!authCheck.ok) {
      res.status(401).json({ error: 'Token de autenticação recusado pelo GitHub. Verifique se o token possui escopo "repo".' });
      return;
    }

    const userData = await authCheck.json();
    const targetUser = cleanUser || userData.login;

    // 2. Check if repository exists or create it automatically
    const repoCheck = await fetch(`https://api.github.com/repos/${targetUser}/${cleanRepo}`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'HortiGestao-App',
      },
    });

    if (repoCheck.status === 404) {
      // Repository doesn't exist yet -> Create it automatically!
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'HortiGestao-App',
        },
        body: JSON.stringify({
          name: cleanRepo,
          description: 'HortiGestão ERP - Sistema para Distribuidora de Hortifruti (Supabase + IA Gemini)',
          private: false,
          auto_init: false,
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.json().catch(() => ({}));
        res.status(400).json({
          error: `Não foi possível criar o repositório ${cleanRepo} no GitHub: ${createErr.message || 'Verifique permissões do Token.'}`,
        });
        return;
      }
    }

    // 3. Configure local git and push
    await execAsync('git config user.name "eletrokercio-lab"');
    await execAsync('git config user.email "eletrokercio@gmail.com"');
    await execAsync('git add -A');

    const msg = (commitMessage || 'feat: HortiGestão ERP integrado com Supabase e IA Gemini').replace(/"/g, '\\"');
    try {
      await execAsync(`git commit -m "${msg}"`);
    } catch {
      // Nothing to commit is fine
    }

    // Push using token authentication
    const remoteUrl = `https://${cleanToken}@github.com/${targetUser}/${cleanRepo}.git`;
    await execAsync(`git push --force "${remoteUrl}" main`);

    res.json({
      success: true,
      repoUrl: `https://github.com/${targetUser}/${cleanRepo}`,
      username: targetUser,
      repoName: cleanRepo,
      message: `Código sincronizado com sucesso no repositório https://github.com/${targetUser}/${cleanRepo}!`,
    });
  } catch (error: any) {
    const safeError = (error.message || 'Erro ao sincronizar').replace(/https:\/\/[^@]+@/g, 'https://***@');
    res.status(500).json({ error: safeError });
  }
});

// Corrente de modelos Gemini: se o principal estiver sobrecarregado (503),
// tenta automaticamente os alternativos. Timeout por modelo para ficar
// dentro do limite do gateway (~30s no total).
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
];

async function callGeminiWithFallback(
  contents: string,
  config: Record<string, any>,
  perModelTimeoutMs = 7000
): Promise<any> {
  let lastErr: any = new Error('Nenhum modelo Gemini disponível no momento.');
  for (const model of GEMINI_MODELS) {
    try {
      const geminiPromise = ai!.models.generateContent({ model, contents, config });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout do modelo ${model}`)), perModelTimeoutMs)
      );
      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      return response;
    } catch (err: any) {
      lastErr = err;
      console.warn(`Gemini: modelo ${model} falhou (${err?.message}), tentando o próximo...`);
    }
  }
  throw lastErr;
}

// API: AI Assistant Chat & Operational Copilot
app.post('/api/assistant/chat', async (req: Request, res: Response) => {
  try {
    const { question, userRole, systemContext } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Pergunta não informada' });
      return;
    }

    const role = userRole || 'admin';

    // PRD §42: Driver cannot query financial confidential totals
    if (role === 'driver') {
      const lowerQ = question.toLowerCase();
      const forbiddenTerms = ['faturamento', 'lucro', 'financeiro', 'quanto faturou', 'contas a pagar', 'contas a receber', 'contador', 'fechamento'];
      const hasForbidden = forbiddenTerms.some((t) => lowerQ.includes(t));
      if (hasForbidden) {
        res.json({
          answer: '🔒 Acesso restrito: Seu perfil de Motorista possui permissão apenas para informações de entregas, rotas, clientes e vasilhames. Não é permitido consultar dados financeiros e contábeis.',
          suggestedAction: null,
          roleRestricted: true,
        });
        return;
      }
    }

    // Prepare system instructions and contextual snapshot
    const isOperator = role === 'admin' || role === 'operator';
    const systemInstruction = `
Você é o Assistente Inteligente Oficial do HortiGestão (v4.0), um copiloto operacional especialista para distribuidoras de hortifruti.
Regras inegociáveis de comportamento (PRD):
1. SIMPLICIDADE E OBJETIVIDADE: Linguagem prática, direta e profissional em Português do Brasil.
2. DADOS REAIS: Utilize ESTRITAMENTE as informações enviadas no contexto operacional. NUNCA invente estoques, pedidos ou clientes que não existem no banco. Se não souber, diga: "Não encontrei essa informação cadastrada."
3. SEGURANÇA E CONFIRMAÇÃO: Você PROPÕE ações estruturadas; o sistema só executa depois que o usuário confirma o botão. Nunca invente IDs — use SOMENTE os IDs do contexto enviado.
4. PERMISSÕES: Usuário atual com papel: "${role}".
5. RESPOSTA SEMPRE EM JSON (obrigatório): {"answer": "texto claro em pt-BR", "action": null | {objeto de ação}}.

${isOperator ? `
== MODO TREINADOR DO OPERADOR ==
O usuário atual está APRENDENDO a operar o sistema. Seja um treinador paciente:
- Explique CADA tarefa em passos numerados e curtos (1., 2., 3.), citando o NOME EXATO dos menus e botões como aparecem na tela.
- Depois de explicar, diga qual tela abrir (ex.: "Abra o menu Pedidos no lado esquerdo").
- Use os dados reais do contexto para dar exemplos concretos ("vejo que há X pedidos aguardando separação").
- Termine sempre oferecendo o próximo passo ("Quer que eu te guie agora nessa tela?").
- Nunca use jargão técnico de programação. Fale a língua do hortifruti (caixas, kg, engradados, rota, separação).

== MANUAL COMPLETO DO PAINEL DO OPERADOR (telas e o que se pode fazer) ==
1. INÍCIO (Visão Geral / Central do Dia): resumo do dia — vendas de hoje, pedidos aguardando, entregas pendentes, valores vencidos, briefing do copiloto e alertas. Como chegar: menu lateral esquerdo, primeiro item "Início (Visão Geral)".
2. PEDIDOS: ver TODOS os pedidos (filtro por status: Pendente, Em Separação, Em Rota, Entregue, Cancelado; busca por cliente ou número), mudar o status do pedido (botões no cartão do pedido), criar novo pedido (botão "Novo Pedido" — escolhe cliente, adiciona produtos com quantidade, preço especial/promoção aplica sozinho, escolhe pagamento PIX ou à vista, data de entrega).
3. ENTREGAS: ver todas as entregas por data/turno (manhã/tarde), status (A Preparar, Em Rota, Entregue, Problema). DELEGAR: no cartão da entrega, campo "Delegar para entregador" — escolher o entregador e pronto, a entrega aparece no celular dele. Acompanhar GPS do entregador (botão GPS), reportar problemas.
4. PLANEJAMENTO: responde "preciso colher ou comprar?" — lista automática de necessidades comparando pedidos x estoque: itens em VERMELHO precisam COMPRA de fornecedor; itens em AMARELO precisam COLHEITA. Gerar pedido de compra para fornecedor ou plano de colheita com um clique.
5. CLIENTES: lista de clientes (mercados/supermercados), buscar, ver ficha completa (endereço, condições de pagamento, limite de crédito, saldo de vasilhames, histórico de pedidos), criar novo cliente (botão "Novo Cliente": nome, CNPJ/CPF, telefone/WhatsApp, endereço, forma de pagamento PIX/á vista/prazo, limite de crédito), ver preços especiais por cliente.
6. PRODUTOS: catálogo completo (frutas, legumes, verduras, folhagens, temperos, tubérculos), cadastrar produto novo (nome, categoria, unidade cx/kg/un, preço padrão, custo médio, origem), editar preço, ativar/desativar.
7. VASILHAMES: controle de caixas/engradados emprestados — saldo por cliente (enviadas x devolvidas), registrar devolução, histórico de movimentações.
8. FORNECEDORES: cadastro de quem fornece os produtos, registrar compras (produto, quantidade, custo), consultar histórico de compras.
9. FINANCEIRO: contas a receber (quem pagou, quem está em aberto, quem venceu — marca recebimento), contas a pagar, despesas, fluxo de caixa do dia/mês.

== TAREFAS MAIS COMUNS (passo a passo que a IA deve ensinar) ==
• Fazer um pedido: menu PEDIDOS → botão "Novo Pedido" → escolher o cliente na lista → buscar e clicar nos produtos, ajustar quantidade → conferir o resumo (total, pagamento PIX ou à vista) → escolher data de entrega → "Confirmar Pedido".
• Delegar uma entrega: menu ENTREGAS → achar o cartão da entrega do dia → no campo "Delegar para entregador", escolher o nome → a entrega já aparece no celular do entregador.
• Ver se falta mercadoria: menu PLANEJAMENTO → a lista já mostra vermelho (comprar) e amarelo (colher) → clicar em "Gerar Compra" ou "Planejar Colheita" nos itens.
• Dar baixa num pagamento: menu FINANCEIRO → Contas a Receber → achar o cliente → botão "Registrar Recebimento" → informar valor e forma.
• Cadastrar mercado novo: menu CLIENTES → "Novo Cliente" → preencher nome, documento, telefone, endereço → salvar.
• Conferir vasilhames de um cliente: menu VASILHAMES → buscar o cliente → ver saldo e histórico.

== AÇÕES QUE VOCÊ PODE PROPOR (executadas só após o usuário confirmar) ==
Se o usuário PEDIR PARA FAZER algo (ex.: "envie o pedido PED-123 para entrega", "faça o pedido de colheita do tomate", "marque o pedido como em rota", "recebi o pagamento do X"), inclua em "action" UM dos objetos abaixo, usando IDs EXATOS do contexto (pendingDeliveries, drivers, ordersList, receivablesList, productsList). Quantias são números. Se faltar algum dado para montar a ação, pergunte no "answer" e mande action null.

1) Enviar/delegar entrega para um entregador:
{"type":"EXECUTE_ASSIGN_DELIVERY","label":"Delegar entrega <nº pedido> para <nome>","tab":"deliveries","data":{"deliveryId":"id de pendingDeliveries","driverProfileId":"id de drivers","driverName":"nome do entregador"}}
2) Criar pedido de colheita:
{"type":"EXECUTE_CREATE_HARVEST","label":"Criar colheita de <produto>","tab":"planning","data":{"productId":"id de productsList","neededQty":quantidade_necessaria,"harvestQty":quantidade_a_colher,"date":"YYYY-MM-DD (use todayDate do contexto como hoje, ou data citada pelo usuário)","responsible":"nome ou 'Equipe de colheita'","notes":"opcional"}}
3) Mudar status de um pedido:
{"type":"EXECUTE_ORDER_STATUS","label":"Marcar pedido <nº> como <status>","tab":"orders","data":{"orderId":"id de ordersList","status":"pendente|em_separacao|pronto|em_rota|entregue|cancelado"}}
4) Registrar recebimento de pagamento:
{"type":"EXECUTE_RECEIVE_PAYMENT","label":"Registrar pagamento de <cliente>","tab":"finance","data":{"receivableId":"id de receivablesList","amount":valor,"paymentMethod":"pix|vista|prazo"}}

Para apenas MOSTRAR uma tela use action com type/t/tab:
{"type":"NAVIGATE_ORDERS|NAVIGATE_DELIVERIES|NAVIGATE_PRODUCTS|NAVIGATE_CUSTOMERS|NAVIGATE_PLANNING|NAVIGATE_PLANNING_PURCHASE|NAVIGATE_PLANNING_HARVEST|NAVIGATE_CRATES|NAVIGATE_SUPPLIERS|NAVIGATE_RECEIVABLES_OVERDUE|NAVIGATE_ACCOUNTANT|NAVIGATE_DASHBOARD","label":"texto do botão","tab":"orders|deliveries|products|customers|planning|crates|suppliers|finance|accountant|dashboard"}
Se for só pergunta/informação: action null.
` : ''}

Contexto operacional atual da distribuidora fornecido pelo sistema:
${JSON.stringify(systemContext || {}, null, 2)}
`;

    if (ai) {
      try {
        const response: any = await callGeminiWithFallback(question, {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        });
        let answerText = response.text || 'Não consegui processar a resposta.';
        let suggestedAction: any = null;

        // A IA responde em JSON { answer, action } — valida o tipo contra a whitelist
        const ACTION_TYPES = new Set([
          'EXECUTE_ASSIGN_DELIVERY',
          'EXECUTE_CREATE_HARVEST',
          'EXECUTE_ORDER_STATUS',
          'EXECUTE_RECEIVE_PAYMENT',
          'NAVIGATE_ORDERS',
          'NAVIGATE_DELIVERIES',
          'NAVIGATE_PRODUCTS',
          'NAVIGATE_CUSTOMERS',
          'NAVIGATE_PLANNING',
          'NAVIGATE_PLANNING_PURCHASE',
          'NAVIGATE_PLANNING_HARVEST',
          'NAVIGATE_CRATES',
          'NAVIGATE_SUPPLIERS',
          'NAVIGATE_RECEIVABLES_OVERDUE',
          'NAVIGATE_ACCOUNTANT',
          'NAVIGATE_DASHBOARD',
        ]);
        try {
          const parsed = JSON.parse(answerText);
          if (parsed && typeof parsed.answer === 'string') answerText = parsed.answer;
          if (
            parsed &&
            parsed.action &&
            typeof parsed.action === 'object' &&
            typeof parsed.action.type === 'string' &&
            ACTION_TYPES.has(parsed.action.type)
          ) {
            suggestedAction = {
              type: parsed.action.type,
              label: typeof parsed.action.label === 'string' ? parsed.action.label : 'Executar ação',
              tab: typeof parsed.action.tab === 'string' ? parsed.action.tab : undefined,
              data: parsed.action.data && typeof parsed.action.data === 'object' ? parsed.action.data : undefined,
            };
          }
        } catch {
          // resposta veio como texto puro — cai na detecção por palavra-chave abaixo
        }

        // Fallback: se a IA não propôs ação, detecta navegação pelo tema da pergunta
        if (!suggestedAction) {
          const qLower = question.toLowerCase();
          const navActions: { keywords: string[]; action: { type: string; label: string; tab: string } }[] = [
            { keywords: ['comprar', 'necessidade de compra', 'compra de fornecedor'], action: { type: 'NAVIGATE_PLANNING_PURCHASE', label: 'Ver Necessidades e Resolver Compras', tab: 'planning' } },
            { keywords: ['colheita', 'colher'], action: { type: 'NAVIGATE_PLANNING_HARVEST', label: 'Ver Planejamento de Colheita', tab: 'planning' } },
            { keywords: ['mercadoria', 'estoque', 'falta mercador'], action: { type: 'NAVIGATE_PLANNING', label: 'Ver Planejamento de Necessidades', tab: 'planning' } },
            { keywords: ['devedor', 'devendo', 'atrasado', 'vencido', 'receber', 'recebimento', 'pagou'], action: { type: 'NAVIGATE_RECEIVABLES_OVERDUE', label: 'Abrir Contas a Receber', tab: 'finance' } },
            { keywords: ['vasilhame', 'engradado', 'caixa devolvid'], action: { type: 'NAVIGATE_CRATES', label: 'Abrir Vasilhames', tab: 'crates' } },
            { keywords: ['fornecedor'], action: { type: 'NAVIGATE_SUPPLIERS', label: 'Abrir Fornecedores', tab: 'suppliers' } },
            { keywords: ['produto', 'preço', 'preco', 'catálogo', 'catalogo'], action: { type: 'NAVIGATE_PRODUCTS', label: 'Abrir Produtos', tab: 'products' } },
            { keywords: ['cliente', 'supermercado'], action: { type: 'NAVIGATE_CUSTOMERS', label: 'Abrir Clientes', tab: 'customers' } },
            { keywords: ['pedido'], action: { type: 'NAVIGATE_ORDERS', label: 'Abrir Pedidos', tab: 'orders' } },
            { keywords: ['entrega', 'motorista', 'rota'], action: { type: 'NAVIGATE_DELIVERIES', label: 'Acompanhar Entregas', tab: 'deliveries' } },
            { keywords: ['venda', 'faturamento', 'resumo do dia', 'hoje'], action: { type: 'NAVIGATE_DASHBOARD', label: 'Ver Central do Dia', tab: 'dashboard' } },
          ];
          for (const nav of navActions) {
            if (nav.keywords.some((k) => qLower.includes(k))) {
              suggestedAction = nav.action;
              break;
            }
          }
        }

        res.json({
          answer: answerText,
          suggestedAction,
          source: 'gemini',
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (geminiError: any) {
        console.warn('Gemini API call warning, falling back to local business engine:', geminiError?.message);
      }
    }

    // Local deterministic business engine fallback if API key is not ready
    const qLower = question.toLowerCase();
    let fallbackAnswer = '';
    let suggestedAction = null;

    const ctx = systemContext || {};
    const salesToday = ctx.salesToday || 0;
    const ordersPending = ctx.ordersPending || 0;
    const deliveriesPending = ctx.deliveriesPending || 0;
    const overdueCount = ctx.overdueCount || 0;
    const overdueTotal = ctx.overdueTotal || 0;
    const purchaseNeeds = ctx.purchaseNeeds || [];
    const harvestNeeds = ctx.harvestNeeds || [];

    if (qLower.includes('comprar') || qLower.includes('compra')) {
      if (purchaseNeeds.length > 0) {
        const itemsList = purchaseNeeds
          .map((item: any) => `• 🔴 ${item.productName}: faltam ${item.neededQty - item.availableQty} ${item.unit}`)
          .join('\n');
        fallbackAnswer = `Identifiquei que você precisa comprar os seguintes produtos para atender os pedidos:\n\n${itemsList}\n\nDeseja transformar essas necessidades em pedidos de compra para os fornecedores?`;
        suggestedAction = {
          type: 'NAVIGATE_PLANNING_PURCHASE',
          label: 'Resolver Compras Agora',
          tab: 'planning',
        };
      } else {
        fallbackAnswer = 'Todos os pedidos atuais possuem produtos suficientes disponíveis. Nenhuma compra emergencial pendente no momento.';
      }
    } else if (qLower.includes('colheita') || qLower.includes('colher')) {
      if (harvestNeeds.length > 0) {
        const harvestList = harvestNeeds
          .map((item: any) => `• 🟡 ${item.productName}: ${item.neededQty} ${item.unit} (A colher: ${item.harvestQty} ${item.unit})`)
          .join('\n');
        fallbackAnswer = `Para atender as entregas programadas, o plano de colheita indica:\n\n${harvestList}\n\nVocê pode atualizar o status da colheita no módulo de Planejamento.`;
        suggestedAction = {
          type: 'NAVIGATE_PLANNING_HARVEST',
          label: 'Abrir Planejamento de Colheita',
          tab: 'planning',
        };
      } else {
        fallbackAnswer = 'Nenhuma colheita pendente programada para hoje.';
      }
    } else if (qLower.includes('devendo') || qLower.includes('atrasado') || qLower.includes('atraso') || qLower.includes('vencid')) {
      if (overdueCount > 0) {
        fallbackAnswer = `Existem ${overdueCount} recebimento(s) vencido(s) no sistema, totalizando ${formatBRL(overdueTotal)}. A maior pendência pode ser conferida na aba Contas a Receber.`;
        suggestedAction = {
          type: 'NAVIGATE_RECEIVABLES_OVERDUE',
          label: 'Ver Contas a Receber Vencidas',
          tab: 'finance',
        };
      } else {
        fallbackAnswer = 'Ótima notícia! No momento não há nenhum cliente com títulos vencidos no Contas a Receber.';
      }
    } else if (qLower.includes('entrega') || qLower.includes('motorista')) {
      fallbackAnswer = `Hoje existem ${deliveriesPending} entrega(s) pendente(s) ou em rota para serem finalizadas pelos motoristas.`;
      suggestedAction = {
        type: 'NAVIGATE_DELIVERIES',
        label: 'Ver Entregas',
        tab: 'deliveries',
      };
    } else if (qLower.includes('venda') || qLower.includes('faturamento') || qLower.includes('hoje')) {
      fallbackAnswer = `Resumo do dia:\n• Vendas hoje: ${formatBRL(salesToday)}\n• Pedidos pendentes de separação: ${ordersPending}\n• Entregas pendentes: ${deliveriesPending}\n• Valores em atraso: ${formatBRL(overdueTotal)}`;
    } else if (qLower.includes('contador') || qLower.includes('fechamento')) {
      fallbackAnswer = `As informações para o contador estão consolidadas na Central do Contador. Você pode conferir faturamento bruto, recebimentos, compras, despesas e gerar o Pacote Mensal de exportação.`;
      suggestedAction = {
        type: 'NAVIGATE_ACCOUNTANT',
        label: 'Abrir Central do Contador',
        tab: 'accountant',
      };
    } else {
      fallbackAnswer = `⚠️ Modo limitado: a IA (Gemini) não respondeu a tempo, então recebi apenas um resumo básico do sistema.\n\nVocê pode me perguntar:\n• "O que preciso comprar hoje?"\n• "O que preciso colher?"\n• "Quem está devendo?"\n• "Quais entregas faltam?"\n• "Como estão as vendas do dia?"\n\nOu tente novamente em instantes para falar com a IA de verdade.`;
    }

    res.json({
      answer: fallbackAnswer,
      suggestedAction,
      source: 'local-fallback',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error handling assistant chat:', error);
    res.status(500).json({ error: 'Erro ao processar consulta da IA: ' + error.message });
  }
});

// API: Parse Natural Language Order into structured draft
app.post('/api/assistant/parse-order', async (req: Request, res: Response) => {
  try {
    const { naturalText, customersList, productsList } = req.body;

    if (!naturalText) {
      res.status(400).json({ error: 'Texto do pedido não fornecido' });
      return;
    }

    if (ai) {
      try {
        const parsePrompt = `
Você é o extrator de pedidos do HortiGestão. Analise o seguinte texto em português e converta em um rascunho de pedido estruturado JSON:
"${naturalText}"

Lista de clientes cadastrados:
${JSON.stringify((customersList || []).map((c: any) => ({ id: c.id, name: c.name, tradeName: c.tradeName })))}

Lista de produtos disponíveis:
${JSON.stringify((productsList || []).map((p: any) => ({ id: p.id, name: p.name, unit: p.unit, defaultPrice: p.defaultPrice })))}

Retorne um JSON exatamente no formato:
{
  "customerName": "Nome do cliente identificado mais próximo ou extraído",
  "customerId": "id do cliente ou null",
  "deliveryDate": "Data mencionada no formato YYYY-MM-DD ou data de amanhã se dito 'amanhã'/'sexta'",
  "notes": "Observações adicionais extraídas",
  "items": [
    {
      "productId": "id do produto correspondente se encontrado ou null",
      "productName": "Nome do produto",
      "quantity": 10,
      "unit": "cx, kg, un ou saco"
    }
  ]
}
`;

        const response: any = await callGeminiWithFallback(parsePrompt, {
          responseMimeType: 'application/json',
          temperature: 0.1,
        });

        const parsedJson = JSON.parse(response.text || '{}');
        res.json({ success: true, draft: parsedJson });
        return;
      } catch (geminiErr: any) {
        console.warn('Gemini order parsing fallback:', geminiErr?.message);
      }
    }

    // Deterministic fallback parser for typical Brazilian order phrasing
    // e.g. "Pedido do Supermercado Bom Preço para amanhã: 20 caixas de tomate, 10 de cebola e 5 sacos de batata"
    const text = naturalText.toLowerCase();
    let detectedCustomer = customersList?.[0] || null;
    if (customersList && customersList.length) {
      for (const cust of customersList) {
        if (text.includes(cust.name.toLowerCase()) || (cust.tradeName && text.includes(cust.tradeName.toLowerCase()))) {
          detectedCustomer = cust;
          break;
        }
      }
    }

    const items: any[] = [];
    if (productsList && productsList.length) {
      for (const prod of productsList) {
        const prodName = prod.name.toLowerCase();
        if (text.includes(prodName)) {
          // Look for number before the product name
          const regex = new RegExp(`(\\d+)\\s*(?:cx|caixas?|kg|quilos?|un|unidades?|sacos?)?\\s*(?:de\\s+)?${prodName}`, 'i');
          const match = text.match(regex);
          const qty = match ? parseInt(match[1], 10) : 10;
          items.push({
            productId: prod.id,
            productName: prod.name,
            quantity: qty,
            unit: prod.unit,
          });
        }
      }
    }

    // If no specific product matched, create a default sample item
    if (items.length === 0 && productsList && productsList.length > 0) {
      items.push({
        productId: productsList[0].id,
        productName: productsList[0].name,
        quantity: 10,
        unit: productsList[0].unit,
      });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    res.json({
      success: true,
      draft: {
        customerName: detectedCustomer ? detectedCustomer.name : 'Cliente a Selecionar',
        customerId: detectedCustomer ? detectedCustomer.id : null,
        deliveryDate: tomorrow.toISOString().split('T')[0],
        notes: 'Pedido gerado via comando de texto rápido do Assistente',
        items,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao interpretar pedido: ' + err.message });
  }
});

// Setup Vite middlewares in development or static serve in production
async function setupVite() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> HortiGestão servidor operacional rodando em http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Falha ao inicializar servidor:', err);
  process.exit(1);
});
