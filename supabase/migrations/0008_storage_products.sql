-- Espace de stockage pour les photos de produits.
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Lecture publique des photos (nécessaire pour les afficher sur le site).
create policy "Lecture publique des photos produits"
  on storage.objects for select
  using (bucket_id = 'products');

-- Seul le personnel connecté peut ajouter/modifier/supprimer des photos.
create policy "Personnel gère les photos produits"
  on storage.objects for all
  using (bucket_id = 'products' and auth.role() = 'authenticated')
  with check (bucket_id = 'products' and auth.role() = 'authenticated');
