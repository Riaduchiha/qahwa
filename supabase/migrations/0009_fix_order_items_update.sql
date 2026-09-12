-- Corrige le bouton "Marquer prêt" du Barista Display : il manquait
-- la permission pour que le personnel connecté puisse modifier le
-- statut d'une ligne de commande (order_items). Seules les permissions
-- d'insertion et de lecture avaient été créées jusqu'ici.

create policy "Personnel met à jour les lignes de commande" on order_items
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
