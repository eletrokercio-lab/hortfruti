-- ============================================================
-- PROMOÇÃO NO BANNER (rodar uma vez no Supabase SQL Editor)
-- Adiciona ao banner o preço promocional e a data final da promoção.
-- ============================================================

alter table public.banners add column if not exists promo_price numeric;
alter table public.banners add column if not exists promo_until date;
