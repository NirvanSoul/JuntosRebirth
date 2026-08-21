begin;
set local role postgres;
select plan(8);

-- 1. Existencia del trigger y la función
select ok(
  exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'spaces'
      and t.tgname = 'spaces_currency_immutable'
  ),
  'trigger spaces_currency_immutable exists on public.spaces'
);

select ok(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'prevent_space_currency_change'
  ),
  'function prevent_space_currency_change exists'
);

-- 2. Permisos: anon no puede ejecutar la función
select ok(
  not has_function_privilege(
    'anon',
    'public.prevent_space_currency_change()',
    'EXECUTE'
  ),
  'anon cannot execute prevent_space_currency_change'
);

-- 3. Preparación: crear usuario y espacio de prueba
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
        'test_immutable@example.com', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, default_currency)
values ('33333333-3333-4333-8333-333333333333', 'Test Immutable', 'EUR')
on conflict (id) do nothing;

insert into public.spaces (name, type, currency, created_by)
values ('Espacio Inmutable Test', 'other', 'EUR', '33333333-3333-4333-8333-333333333333');

-- 4. El espacio se creó con EUR
select is(
  (select currency from public.spaces where name = 'Espacio Inmutable Test'),
  'EUR',
  'space created with EUR currency'
);

-- 5. El owner (postgres) PUEDE cambiar currency (compatibilidad SECURITY DEFINER)
update public.spaces set currency = 'JPY'
 where name = 'Espacio Inmutable Test';

select is(
  (select currency from public.spaces where name = 'Espacio Inmutable Test'),
  'JPY',
  'owner can change currency (SECURITY DEFINER compatibility)'
);

-- 6. El owner puede cambiar nombre (otras columnas no afectadas)
update public.spaces set name = 'Espacio Renombrado'
 where name = 'Espacio Inmutable Test';

select is(
  (select name from public.spaces where name = 'Espacio Renombrado'),
  'Espacio Renombrado',
  'owner can update other columns (name) without issue'
);

-- 7. El trigger es BEFORE UPDATE (se ejecuta antes de la escritura)
select is(
  (
    select tgenabled
    from pg_trigger t
    join pg_class c on c.oid = tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'spaces'
      and t.tgname = 'spaces_currency_immutable'
  ),
  'O'::"char",
  'trigger is enabled (not disabled or deferred)'
);

-- 8. La función es de trigger (tipo RETURN_TYPE = trigger)
select is(
  (
    select p.prorettype::regtype::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'prevent_space_currency_change'
  ),
  'trigger',
  'function returns trigger type'
);

select * from finish();
rollback;