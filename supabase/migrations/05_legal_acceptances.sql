-- Evidencia de aceptación de términos/política (Legal/JUNTOSS_LEGAL_PRIVACY_SYSTEM.md
-- §34). Todavía no existe pantalla de registro que escriba aquí: la tabla
-- queda lista para cuando exista, sin bloquear el resto del sistema legal.
create table public.legal_acceptances (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('privacy-policy', 'terms-of-service')),
  document_version text not null,
  app_version text not null,
  locale text not null,
  source text not null,
  accepted_at timestamptz not null default now()
);

create index legal_acceptances_user_idx
  on public.legal_acceptances(user_id, document_type, accepted_at desc);

alter table public.legal_acceptances enable row level security;

create policy legal_acceptances_select_own on public.legal_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy legal_acceptances_insert_own on public.legal_acceptances
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.legal_acceptances from anon;
grant select, insert on public.legal_acceptances to authenticated;
