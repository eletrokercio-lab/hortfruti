-- ============================================================
-- BANNERS DA LOJA (comprador)
-- Rodar no Supabase → SQL Editor (uma única vez)
-- ============================================================

-- 1) Tabela de banners
create table if not exists public.banners (
  id text primary key,
  image_url text not null,
  product_id text,
  title text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

-- 2) RLS
alter table public.banners enable row level security;

drop policy if exists "banners_staff_all" on public.banners;
create policy "banners_staff_all"
  on public.banners
  for all
  to authenticated
  using (
    exists (
      select 1 from public.app_profiles ap
      where ap.id = auth.uid()
        and ap.status = 'ativo'
        and ap.role in ('master', 'operador')
    )
  )
  with check (
    exists (
      select 1 from public.app_profiles ap
      where ap.id = auth.uid()
        and ap.status = 'ativo'
        and ap.role in ('master', 'operador')
    )
  );

drop policy if exists "banners_comprador_select" on public.banners;
create policy "banners_comprador_select"
  on public.banners
  for select
  to authenticated
  using (active = true);

-- 3) Bucket público de imagens de banner
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

-- Leitura pública das imagens
drop policy if exists "banners_bucket_read" on storage.objects;
create policy "banners_bucket_read"
  on storage.objects for select
  using (bucket_id = 'banners');

-- Escrita só para equipe (master/operador)
drop policy if exists "banners_bucket_write" on storage.objects;
create policy "banners_bucket_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'banners'
    and exists (
      select 1 from public.app_profiles ap
      where ap.id = auth.uid()
        and ap.status = 'ativo'
        and ap.role in ('master', 'operador')
    )
  );

drop policy if exists "banners_bucket_delete" on storage.objects;
create policy "banners_bucket_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'banners'
    and exists (
      select 1 from public.app_profiles ap
      where ap.id = auth.uid()
        and ap.status = 'ativo'
        and ap.role in ('master', 'operador')
    )
  );
