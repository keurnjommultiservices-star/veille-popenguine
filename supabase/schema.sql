-- Plateforme de veille - Popenguine et environs
-- À exécuter dans Supabase : SQL Editor > New query > Run

create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  kind        text not null check (kind in ('alerte','remarque','suggestion')),
  domain      text not null check (domain in ('sante','securite','education','eau_environnement_routes')),
  locality    text not null,
  title       text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 10 and 2000),
  urgency     text not null default 'normale' check (urgency in ('normale','urgente')),
  contact     text check (contact is null or char_length(contact) <= 120),
  status      text not null default 'nouveau' check (status in ('nouveau','en_cours','resolu','rejete')),
  published   boolean not null default false,
  admin_note  text check (admin_note is null or char_length(admin_note) <= 1000)
);

create index if not exists reports_published_idx on public.reports (published, created_at desc);
create index if not exists reports_domain_idx on public.reports (domain);

-- Photos jointes aux alertes (adresses publiques des images)
alter table public.reports add column if not exists photos text[] not null default '{}';

-- Dossier de stockage des photos (lecture publique par adresse aléatoire, écriture par l'API uniquement)
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

-- Sécurité : aucune politique = aucun accès direct depuis le navigateur.
-- Seules les fonctions Vercel (clé service_role) lisent et écrivent.
alter table public.reports enable row level security;
