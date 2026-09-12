-- Ajout du statut "refusée" (brief §14 : accepter / refuser une commande)
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('recue', 'preparation', 'prete', 'livraison', 'livree', 'refusee'));
