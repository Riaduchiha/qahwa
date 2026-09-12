-- Rattrapage : réinsère UNIQUEMENT les produits manquants (vérifie
-- l'existence par nom + catégorie avant chaque insertion → aucun risque
-- de doublon même en relançant ce script plusieurs fois).

-- QAHWA CLASSICS ---------------------------------------------------------
insert into products (category_id, name, price, display_order)
select c.id, v.name, 0, v.ord
from categories c
cross join (values
  ('Espresso', 1), ('Double', 2), ('Americano', 3), ('Latte', 4),
  ('Cappuccino', 5), ('Flat White', 6), ('Mocha', 7), ('Cortado', 8),
  ('Drip (V60)', 9), ('Spanish Latte', 10)
) as v(name, ord)
where c.slug = 'qahwa-classics'
  and not exists (
    select 1 from products p where p.category_id = c.id and p.name = v.name
  );

-- MATCHA ---------------------------------------------------------------------
insert into products (category_id, name, price, display_order)
select c.id, v.name, 0, v.ord
from categories c
cross join (values
  ('Matcha Latte', 10), ('Vanilla Matcha', 11), ('Strawberry Matcha', 12),
  ('Rose Matcha', 13), ('Signature Pistachio Matcha', 14),
  ('Jasmin Matcha', 15), ('Affogato Matcha', 16),
  ('Iced Sparkling Yuzu Matcha', 17), ('White Chocolate Matcha', 18),
  ('Maple or Agave Matcha', 19), ('Iced Tropical Matcha', 20),
  ('Cloud Matcha', 21), ('Dirty Matcha', 22),
  ('Iced Raspberry or Blueberry Matcha', 23)
) as v(name, ord)
where c.slug = 'matcha'
  and not exists (
    select 1 from products p where p.category_id = c.id and p.name = v.name
  );

-- NON-COFFEE ---------------------------------------------------------------
insert into products (category_id, name, description, price, display_order)
select c.id, v.name, v.description, 0, v.ord
from categories c
cross join (values
  ('Organic Ube Latte', null, 1), ('Hot Chocolate', null, 2),
  ('Chai Latte', null, 3), ('Sri Lanka Black Tea', null, 4),
  ('Organic Infusions', null, 5), ('Dirty Chai Latte', null, 6),
  ('Iced Teas', 'Peach / Berry / Tropical', 7),
  ('Classic Mojito', null, 8), ('Strawberry Mojito', null, 9),
  ('Banana Milkshake', null, 10),
  ('Chocolate or Strawberry Milkshake', null, 11),
  ('Sodas', 'Rose / Lytchee / Berry / Peach', 12)
) as v(name, description, ord)
where c.slug = 'non-coffee'
  and not exists (
    select 1 from products p where p.category_id = c.id and p.name = v.name
  );

-- SIGNATURE BY QAHWA -------------------------------------------------------
insert into products (category_id, name, price, display_order)
select c.id, v.name, 0, v.ord
from categories c
cross join (values
  ('Pistachio Spanish Latte', 1), ('Salted Caramel Latte', 2),
  ('Iced Mint Chocolate', 3), ('Honey Rosemary Latte', 4),
  ('Tiramisu Latte', 5), ('Orange Espresso Tonic', 6),
  ('White Chocolate Mocha', 7), ('Tonka Latte', 8),
  ('Qahwa Affogato', 9), ('Speculos Latte', 10),
  ('Vanilla Maple Latte', 11), ('Cookie Cinnamon Latte', 12),
  ('Black Sesame Latte', 13), ('Peanut Mocha', 14),
  ('Vanilla Black Sesame Latte', 15)
) as v(name, ord)
where c.slug = 'signature-by-qahwa'
  and not exists (
    select 1 from products p where p.category_id = c.id and p.name = v.name
  );

-- HOJICHA -------------------------------------------------------------------
insert into products (category_id, name, price, display_order)
select c.id, v.name, 0, v.ord
from categories c
cross join (values
  ('Hojicha Latte', 1), ('Vanilla Hojicha', 2), ('Strawberry Hojicha', 3),
  ('Sparkling Yuzu Hojicha', 4), ('Iced Tropical Hojicha', 5),
  ('Affogato Hojicha', 6), ('Black Sesame Hojicha', 7)
) as v(name, ord)
where c.slug = 'hojicha'
  and not exists (
    select 1 from products p where p.category_id = c.id and p.name = v.name
  );

-- FRESH JUICES ---------------------------------------------------------------
insert into products (category_id, name, description, price, display_order)
select c.id, v.name, v.description, 0, v.ord
from categories c
cross join (values
  ('Qahwa Glow', 'Orange, Carrot, Ginger', 1),
  ('Back-To-Root', 'Beetroot, Lemon, Apple', 2),
  ('Green Detox', 'Cucumber, Celery, Lemon', 3),
  ('Qahwa Clean', 'Apple, Lemon, Cinnamon', 4),
  ('Citrus Burst', 'Banana, Orange, Lemon', 5),
  ('Seasonal Juice', null, 6)
) as v(name, description, ord)
where c.slug = 'fresh-juices'
  and not exists (
    select 1 from products p where p.category_id = c.id and p.name = v.name
  );

-- SMOOTHIES & WELLNESS SHOTS --------------------------------------------------
insert into products (category_id, name, description, price, display_order)
select c.id, v.name, v.description, 0, v.ord
from categories c
cross join (values
  ('Mango Matcha Boost', 'Matcha, Mango, Banana', 1),
  ('Peanut Espresso', 'Espresso, Banana', 2),
  ('Drink Your Salad', 'Spinach, Lemon, Apple, Mint', 3),
  ('Blueberry', 'Banana, Blueberry', 4),
  ('Strawberry Oat', 'Strawberry, Oat, Banana', 5),
  ('Cinnamon Hibiscus', null, 6),
  ('Lemon Ginger Shot', null, 7),
  ('Beetroot Shot', null, 8),
  ('Green Shot', null, 9)
) as v(name, description, ord)
where c.slug = 'smoothies-wellness'
  and not exists (
    select 1 from products p where p.category_id = c.id and p.name = v.name
  );
