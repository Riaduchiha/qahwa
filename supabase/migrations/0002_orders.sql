-- Étape 5 — Formulaire de commande + création des commandes
-- À exécuter dans Supabase : Dashboard > SQL Editor > coller > Run

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,

  customer_name text not null,
  customer_phone text not null,

  order_type text not null check (order_type in ('livraison', 'emporter', 'sur_place')),

  -- Livraison
  delivery_wilaya text,
  delivery_commune text,
  delivery_address text,
  delivery_notes text,

  -- À emporter
  pickup_time text,

  -- Sur place
  table_number text,

  subtotal integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null default 0,

  status text not null default 'recue'
    check (status in ('recue', 'preparation', 'prete', 'livraison', 'livree')),

  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null, -- copie du nom au moment de la commande
  unit_price integer not null,
  quantity integer not null,
  line_total integer not null
);

create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at desc);

-- SÉCURITÉ (RLS) ---------------------------------------------------------------
alter table orders enable row level security;
alter table order_items enable row level security;

-- N'importe quel client (même non connecté) peut créer une commande.
create policy "Création publique de commande" on orders
  for insert with check (true);

create policy "Création publique de lignes de commande" on order_items
  for insert with check (true);

-- Lecture publique pour l'instant (page de confirmation par ID) — à
-- restreindre par utilisateur/session une fois l'authentification client
-- ajoutée. Le personnel authentifié voit tout, pour la gestion (Étape 14).
create policy "Lecture publique par ID" on orders
  for select using (true);

create policy "Lecture publique par ID" on order_items
  for select using (true);

create policy "Personnel met à jour les commandes" on orders
  for update using (auth.role() = 'authenticated');
