-- Nettoyage : supprime les doublons de produits (même nom + même
-- catégorie), ne garde que le plus ancien de chaque. Sûr à exécuter
-- même si tu n'es pas certain qu'il y ait des doublons — si tout est
-- déjà propre, ce script ne supprime rien.

delete from products
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by category_id, name
        order by created_at asc
      ) as rn
    from products
  ) ranked
  where rn > 1
);
