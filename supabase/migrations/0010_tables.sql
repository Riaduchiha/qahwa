create table if not exists tables (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table tables enable row level security;

create policy "Lecture publique des tables" on tables
  for select using (true);

create policy "Personnel gère les tables" on tables
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into tables (number)
select generate_series(1, 22)
on conflict (number) do nothing;
