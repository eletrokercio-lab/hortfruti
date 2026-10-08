-- ============================================================
-- FOTOS DOS PRODUTOS — rode este script no SQL Editor do Supabase
-- Adiciona a coluna de imagem na tabela products.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_url text;

-- RLS: produtos já são legíveis por todos os perfis autenticados,
-- e editáveis pelo staff (operador/master). Nenhuma política nova
-- é necessária — a coluna herda as permissões da tabela.

-- Confirmação:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'image_url';
