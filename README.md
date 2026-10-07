# HortiGestão (v3.0) — Sistema de Gestão para Distribuidoras de Hortifruti

Sistema web completo e automatizado para distribuidoras de hortifruti, construído com foco em **simplicidade operacional**, controle de cadeia de suprimentos e assistência inteligente com IA (Gemini).

---

## 🚀 Principais Módulos

- **Dashboard Orientado à Ação**: Responde *"O que está acontecendo hoje?"* com compras urgentes, colheitas, entregas e cobranças.
- **Perfis de Usuário**: Proprietário (Administrador), Operador diário, Motorista (Mobile-First) e Contador.
- **Gestão de Clientes**: Ficha do cliente com 6 abas (Resumo, Pedidos, Financeiro, Preços Individuais, Promoções e Vasilhames).
- **Preços e Promoções Personalizados**: Preço exclusivo por cliente e promoções com intervalo de datas aplicados automaticamente.
- **Pedidos Rápidos com IA**: Criação de pedidos com suporte a digitação em linguagem natural ("Pedido do Bom Preço: 20 cx tomate, 10 cebola").
- **Planejamento de Necessidades & Colheita**: Cálculo dinâmico do que precisa ser comprado ou colhido.
- **App do Motorista & Pesagem com Tara**: Cálculo de tara `Peso Líquido = Peso Bruto - Tara` e controle de vasilhames devolvidos.
- **Controle de Vasilhames**: Saldo em tempo real de caixas plásticas K e engradados em poder do cliente.
- **Financeiro & Fluxo de Caixa**: Contas a receber, contas a pagar, despesas operacionais e extrato de caixa.
- **Central do Contador**: Demonstrativo consolidado, fechamento de períodos e exportação de relatórios em CSV.
- **Assistente IA**: Integração com Gemini 3.8 Flash para consultas de dados reais e sugestões com confirmação de segurança.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend**: Node.js, Express, @google/genai (Gemini 3.8 Flash)
- **Banco de Dados**: Supabase (PostgreSQL) com `@supabase/supabase-js`
- **Build & Dev**: Vite, TSX

---

## 📦 Como Instalar e Rodar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/eletrokercio-lab/hortfrut.git
   cd hortfrut
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   Preencha:
   - `GEMINI_API_KEY`: Chave da API do Google Gemini
   - `VITE_SUPABASE_URL`: URL do seu projeto no Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave pública anon do Supabase

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse em: `http://localhost:3000`

---

## 🗄️ Configuração do Banco de Dados no Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Abra o **SQL Editor** no painel do Supabase.
3. Copie o conteúdo do arquivo `supabase_schema.sql` e execute (**Run**).
4. No menu **Project Settings > API**, copie a **URL** e a **chave anon** para o seu `.env`.

---

## 📄 Licença
Licenciado sob a Apache License 2.0.
