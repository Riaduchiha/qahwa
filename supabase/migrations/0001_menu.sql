-- Étape 3 — Menu dynamique
-- À exécuter dans Supabase : Dashboard > SQL Editor > coller > Run
-- (ou via `supabase db push` si tu utilises la CLI Supabase en local)

create extension if not exists "pgcrypto";

-- CATÉGORIES ---------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- PRODUITS -------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  description text,
  price integer not null, -- en DA (dinars), pas de centimes
  image_url text,
  is_available boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- GROUPES D'OPTIONS (ex: "Taille", "Lait", "Suppléments") -------------------
create table if not exists product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  is_required boolean not null default false,
  allow_multiple boolean not null default false,
  display_order integer not null default 0
);

-- CHOIX DANS UN GROUPE (ex: "Petit", "Moyen", "Grand") -----------------------
create table if not exists product_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references product_option_groups(id) on delete cascade,
  label text not null,
  price_delta integer not null default 0, -- supplément en DA, peut être négatif
  is_default boolean not null default false,
  display_order integer not null default 0
);

-- INDEX -----------------------------------------------------------------------
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_option_groups_product on product_option_groups(product_id);
create index if not exists idx_options_group on product_options(group_id);

-- SÉCURITÉ (RLS) ---------------------------------------------------------------
-- Lecture publique des catégories/produits actifs (site client).
-- Écriture réservée aux utilisateurs authentifiés (personnel QAHWA) —
-- affiné avec de vrais rôles client/personnel/administrateur à l'Étape 6/12.
alter table categories enable row level security;
alter table products enable row level security;
alter table product_option_groups enable row level security;
alter table product_options enable row level security;

create policy "Lecture publique catégories actives" on categories
  for select using (is_active = true);

create policy "Lecture publique produits disponibles" on products
  for select using (is_available = true);

create policy "Lecture publique options" on product_option_groups
  for select using (true);

create policy "Lecture publique choix" on product_options
  for select using (true);

create policy "Personnel gère les catégories" on categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Personnel gère les produits" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Personnel gère les groupes d'options" on product_option_groups
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Personnel gère les options" on product_options
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- DONNÉES DE DÉMO (à supprimer une fois le vrai menu saisi depuis QAHWA) -----
insert into categories (name, slug, display_order) values
  ('Coffee', 'coffee', 1),
  ('Matcha', 'matcha', 2),
  ('Cold Drinks', 'cold-drinks', 3)
on conflict (slug) do nothing;

insert into products (category_id, name, description, price, display_order)
select id, 'Matcha Framboise', 'Matcha glacé, purée de framboise maison, lait au choix', 650, 1
from categories where slug = 'matcha'
on conflict do nothing;

insert into products (category_id, name, description, price, display_order)
select id, 'Matcha Figues', 'Matcha glacé, figues fraîches de saison', 650, 2
from categories where slug = 'matcha'
on conflict do nothing;
