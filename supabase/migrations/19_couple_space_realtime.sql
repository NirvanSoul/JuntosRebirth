-- Publica cambios financieros de Juntos para que el otro miembro reciba el
-- evento inmediatamente. El RPC de la migración 18 sigue siendo la única vía
-- de escritura; Realtime solo dispara una nueva lectura autorizada por RLS.

alter table public.categories replica identity full;
alter table public.recurring_transaction_series replica identity full;
alter table public.transactions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'supabase_realtime publication is required';
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'recurring_transaction_series'
  ) then
    alter publication supabase_realtime
      add table public.recurring_transaction_series;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end;
$$;
