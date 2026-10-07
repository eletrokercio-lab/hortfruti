import { getSupabaseClient, isSupabaseConfigured, getStoredSupabaseUrl } from '../lib/supabase';
import { Customer, Product, Order, Delivery, AccountsReceivable } from '../types';

export const supabaseService = {
  isAvailable: () => isSupabaseConfigured() && getSupabaseClient() !== null,

  // Test connection to Supabase
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured()) {
      const url = getStoredSupabaseUrl();
      if (!url) {
        return {
          success: false,
          message: 'Falta informar a URL do Projeto Supabase (ex: https://xyz.supabase.co). Digite a URL acima e clique em "Salvar e Conectar".',
        };
      }
      return {
        success: false,
        message: 'Configuração incompleta. Verifique a URL do Projeto e a Chave API.',
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        message: 'Não foi possível instanciar o cliente Supabase. Verifique a formatação da URL e da Chave.',
      };
    }

    try {
      const { error } = await client.from('products').select('count', { count: 'exact', head: true });
      if (error) {
        if (error.code === 'PGRST204' || error.message?.includes('relation "public.products" does not exist') || error.message?.includes('not find the table')) {
          return {
            success: false,
            message: 'Conectou ao Supabase, mas a tabela "products" ainda não existe! Abra o "SQL Editor" no Supabase e execute o script supabase_schema.sql.',
          };
        }
        return {
          success: false,
          message: `Erro ao consultar Supabase: ${error.message} (Código: ${error.code || 'N/A'}).`,
        };
      }
      return {
        success: true,
        message: 'Conexão com o Supabase estabelecida com sucesso! Tabelas acessíveis.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha de conexão: ${err.message}`,
      };
    }
  },

  // Upload current local state to Supabase
  uploadCurrentDataToSupabase: async (data: {
    customers: Customer[];
    products: Product[];
    orders: Order[];
  }): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient();
    if (!isSupabaseConfigured() || !client) {
      return { success: false, message: 'Supabase não configurado. Forneça a URL do Projeto e a chave API.' };
    }

    try {
      // 1. Upload Customers
      if (data.customers.length > 0) {
        const mappedCustomers = data.customers.map((c) => ({
          id: c.id,
          name: c.name,
          trade_name: c.tradeName || null,
          document: c.document,
          phone: c.phone,
          whatsapp: c.whatsapp,
          street: c.address.street,
          number: c.address.number,
          neighborhood: c.address.neighborhood,
          city: c.address.city,
          state: c.address.state,
          zip_code: c.address.zipCode,
          reference: c.address.reference || null,
          status: c.status,
          payment_method: c.paymentMethod,
          payment_term: c.paymentTerm,
          credit_limit: c.creditLimit,
          commercial_condition: c.commercialCondition,
          notes: c.notes || null,
        }));

        const { error: custErr } = await client.from('customers').upsert(mappedCustomers);
        if (custErr) throw new Error(`Erro em clientes: ${custErr.message}`);
      }

      // 2. Upload Products
      if (data.products.length > 0) {
        const mappedProducts = data.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          sales_type: p.salesType,
          default_price: p.defaultPrice,
          avg_cost: p.avgCost,
          origin: p.origin,
          notes: p.notes || null,
          status: p.status,
        }));

        const { error: prodErr } = await client.from('products').upsert(mappedProducts);
        if (prodErr) throw new Error(`Erro em produtos: ${prodErr.message}`);
      }

      return {
        success: true,
        message: 'Dados sincronizados com o banco de dados Supabase com sucesso!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message,
      };
    }
  },
};
