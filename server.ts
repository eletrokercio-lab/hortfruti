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
    const systemInstruction = `
Você é o Assistente Inteligente Oficial do HortiGestão (v3.0), um copiloto operacional especialista para distribuidoras de hortifruti.
Regras inegociáveis de comportamento (PRD):
1. SIMPLICIDADE E OBJETIVIDADE: Linguagem prática, direta e profissional em Português do Brasil.
2. DADOS REAIS: Utilize ESTRITAMENTE as informações enviadas no contexto operacional. NUNCA invente estoques, pedidos ou clientes que não existem no banco. Se não souber, diga: "Não encontrei essa informação cadastrada."
3. SEGURANÇA E CONFIRMAÇÃO: A IA NUNCA executa ações críticas automaticamente (alterar preços, fechar contabilidade, criar pedidos direto). Você SUGERE a ação estruturada para que o usuário confirme no sistema.
4. PERMISSÕES: Usuário atual com papel: "${role}".
5. RESPOSTA ESTRUTURADA: Responda em texto claro e, se for aplicável sugerir uma ação operacional (como criar pedido, planejar colheita ou resolver compras), indique no formato de ação sugerida.

Contexto operacional atual da distribuidora fornecido pelo sistema:
${JSON.stringify(systemContext || {}, null, 2)}
`;

    if (ai) {
      try {
        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: question,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.2,
          },
        });

        // 6-second timeout fallback to ensure snappy responsiveness
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de resposta da API')), 6000)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        const answerText = response.text || 'Não consegui processar a resposta.';

        // Detect if action can be suggested from the prompt or context
        let suggestedAction = null;
        const qLower = question.toLowerCase();

        if (qLower.includes('comprar') || qLower.includes('necessidade de compra')) {
          suggestedAction = {
            type: 'NAVIGATE_PLANNING_PURCHASE',
            label: 'Ver Necessidades e Resolver Compras',
            tab: 'planning',
          };
        } else if (qLower.includes('colheita') || qLower.includes('colher')) {
          suggestedAction = {
            type: 'NAVIGATE_PLANNING_HARVEST',
            label: 'Ver Planejamento de Colheita',
            tab: 'planning',
          };
        } else if (qLower.includes('devedor') || qLower.includes('atrasado') || qLower.includes('devendo')) {
          suggestedAction = {
            type: 'NAVIGATE_RECEIVABLES_OVERDUE',
            label: 'Abrir Contas a Receber Vencidas',
            tab: 'finance',
          };
        } else if (qLower.includes('entrega') && (qLower.includes('falta') || qLower.includes('hoje'))) {
          suggestedAction = {
            type: 'NAVIGATE_DELIVERIES',
            label: 'Acompanhar Entregas de Hoje',
            tab: 'deliveries',
          };
        }

        res.json({
          answer: answerText,
          suggestedAction,
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
      fallbackAnswer = `Olá! Como posso ajudar na operação hoje?\nVocê pode me perguntar:\n• "O que preciso comprar hoje?"\n• "O que preciso colher?"\n• "Quem está devendo?"\n• "Quais entregas faltam?"\n• "Como estão as vendas do dia?"`;
    }

    res.json({
      answer: fallbackAnswer,
      suggestedAction,
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

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: parsePrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de parsing da API')), 6000)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

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
