-- Kitchen/Barista Display System — postes de préparation + suivi par produit
-- À exécuter dans Supabase : Dashboard > SQL Editor > coller > Run

-- Chaque produit est rattaché à un poste de préparation. Par défaut tout
-- part sur "barista" ; le propriétaire pourra changer ça produit par
-- produit depuis QAHWA (Étape 7).
alter table products
  add column if not exists station text not null default 'barista'
  check (station in ('barista', 'bar', 'cuisine'));

-- Statut individuel de chaque ligne de commande, affiché/modifié sur les
-- tablettes. La commande globale (orders.status) passe automatiquement
-- en "prete" quand toutes ses lignes sont "ready" (géré côté application).
alter table order_items
  add column if not exists status text not null default 'new'
  check (status in ('new', 'preparing', 'ready'));

alter table order_items
  add column if not exists station text not null default 'barista'
  check (station in ('barista', 'bar', 'cuisine'));

create index if not exists idx_order_items_status on order_items(status);
create index if not exists idx_order_items_station on order_items(station);

-- Active le temps réel sur ces tables pour que les tablettes reçoivent
-- les nouvelles commandes et changements de statut sans recharger la page.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
