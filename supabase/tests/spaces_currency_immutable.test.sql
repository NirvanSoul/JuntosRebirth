begin;
set local role postgres;
select plan(9);

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

-- 2. anon y authenticated no pueden ejecutar directamente la función del trigger
select ok(
  not has_function_privilege(
    'anon',
    'public.prevent_space_currency_change()',
    'EXECUTE'
  ),
  'anon cannot execute prevent_space_currency_change directly'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.prevent_space_currency_change()',
    'EXECUTE'
  ),
  'authenticated cannot execute prevent_space_currency_change directly'
);

-- 3. Preparación: owner autenticado con membresía activa
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated',
        'owner-immutable@example.com', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, default_currency)
values ('44444444-4444-4444-8444-444444444444', 'Owner Inmutable', 'EUR')
on conflict (id) do nothing;

insert into public.spaces (id, name, type, currency, created_by)
values ('55555555-5555-4555-8555-555555555555', 'Espacio Inmutable',
        'other', 'EUR', '44444444-4444-4444-8444-444444444444');

insert into public.space_members (space_id, user_id, role, status, space_type)
values ('55555555-5555-4555-8555-555555555555',
        '44444444-4444-4444-8444-444444444444', 'owner', 'active', 'other');

select set_config('request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444', true);

-- 4. El owner autenticado puede cambiar name
do $$
begin
  set local role authenticated;
  update public.spaces set name = 'Espacio Renombrado'
   where id = '55555555-5555-4555-8555-555555555555';
  reset role;
end;
$$;

select is(
  (select name from public.spaces where id = '55555555-5555-4555-8555-555555555555'),
  'Espacio Renombrado',
  'authenticated owner can update name'
);

-- 5. El mismo owner no puede cambiar currency (trigger lo bloquea)
do $$
declare
  err_msg text := 'no error';
begin
  set local role authenticated;
  begin
    update public.spaces set currency = 'JPY'
     where id = '55555555-5555-4555-8555-555555555555';
  exception when others then
    err_msg := sqlerrm;
  end;
  reset role;
  perform set_config('test.currency_err', err_msg, true);
end;
$$;

select ok(
  position('inmutable' in coalesce(current_setting('test.currency_err', true), '')) > 0,
  'currency update is blocked with expected message'
);

-- 6. La currency permanece intacta tras el fallo
select is(
  (select currency from public.spaces where id = '55555555-5555-4555-8555-555555555555'),
  'EUR',
  'currency remains EUR after blocked update'
);

-- 7. Un usuario ajeno no puede actualizar el espacio
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated',
        'foreign-immutable@example.com', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, default_currency)
values ('66666666-6666-4666-8666-666666666666', 'Foreign', 'EUR')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666', true);

do $$
declare
  affected int := -1;
begin
  set local role authenticated;
  update public.spaces set name = 'Intruso'
   where id = '55555555-5555-4555-8555-555555555555';
  get diagnostics affected = row_count;
  reset role;
  perform set_config('test.foreign_affected', affected::text, true);
end;
$$;

select is(
  current_setting('test.foreign_affected', true),
  '0',
  'foreign authenticated user cannot update the space'
);

select is(
  (select name from public.spaces where id = '55555555-5555-4555-8555-555555555555'),
  'Espacio Renombrado',
  'space name remains unchanged after foreign update attempt'
);

select * from finish();
rollback;
