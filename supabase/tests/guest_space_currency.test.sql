begin;
select plan(17);

-- 1. Existencia de la función y permisos
select has_function(
  'public',
  'migrate_guest_data',
  array['uuid', 'text', 'jsonb', 'jsonb', 'jsonb', 'jsonb'],
  'migrate_guest_data exists with expected signature'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.migrate_guest_data(uuid,text,jsonb,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated user can execute migrate_guest_data'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.migrate_guest_data(uuid,text,jsonb,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'anon cannot execute migrate_guest_data'
);

-- 2. Propiedades de seguridad del procedimiento
select is(
  (
    select prosecdef
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'migrate_guest_data'
  ),
  true,
  'migrate_guest_data is SECURITY DEFINER'
);

select is(
  (
    select proconfig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'migrate_guest_data'
  ),
  array['search_path=""'],
  'migrate_guest_data configures search_path to empty string'
);

-- 3. Preparar usuario en auth.users y profile
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('11111111-1111-4111-8111-111111111111'::uuid, 'authenticated', 'authenticated', 'test_user@example.com', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, default_currency)
values ('11111111-1111-4111-8111-111111111111'::uuid, 'Usuario Prueba', 'EUR')
on conflict (id) do nothing;

-- 4. Ejecución de casos de prueba
do $$
declare
  test_user_id uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  batch_1 uuid := '22222222-2222-4222-8222-222222222221'::uuid;
  batch_2 uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  batch_3 uuid := '22222222-2222-4222-8222-222222222223'::uuid;
  batch_4 uuid := '22222222-2222-4222-8222-222222222224'::uuid;
  batch_5 uuid := '22222222-2222-4222-8222-222222222225'::uuid;
  batch_6 uuid := '22222222-2222-4222-8222-222222222226'::uuid;
  batch_idempotent uuid := '22222222-2222-4222-8222-222222222299'::uuid;
  res jsonb;
begin
  -- Configurar auth.uid() para la sesión de prueba
  perform set_config('request.jwt.claim.sub', test_user_id::text, true);

  -- Caso 1: Inserción de espacio nuevo con VES
  res := public.migrate_guest_data(
    batch_1,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-ves-1', 'name', 'Viajes', 'type', 'other', 'currency', 'VES')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Caso 2: Inserción heredada sin currency -> EUR
  res := public.migrate_guest_data(
    batch_2,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-legacy-1', 'name', 'Ahorros', 'type', 'other')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Caso 3: Inserción de un espacio en EUR que luego se actualizará a VES
  res := public.migrate_guest_data(
    batch_3,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-eur-to-ves', 'name', 'Gastos Casa', 'type', 'other', 'currency', 'EUR')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Caso 4: Actualización explícita de EUR a VES
  res := public.migrate_guest_data(
    batch_4,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-eur-to-ves', 'name', 'Gastos Casa Venezuela', 'type', 'other', 'currency', 'VES')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Caso 5: Actualización desde cliente antiguo sin currency sobre sp-ves-1 -> conserva VES
  res := public.migrate_guest_data(
    batch_5,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-ves-1', 'name', 'Viajes Actualizado', 'type', 'other')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Caso 6: Degradación de couple a other con moneda USD
  res := public.migrate_guest_data(
    batch_6,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-couple-guest-1', 'name', 'Pareja Falsa', 'type', 'couple', 'currency', 'USD')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Caso 7: Primera ejecución del lote de prueba de idempotencia
  res := public.migrate_guest_data(
    batch_idempotent,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-idempotent-1', 'name', 'Nombre Original Inmutable', 'type', 'other', 'currency', 'VES')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );

  -- Caso 8: Segunda ejecución con el MISMO batch_id pero payload DELIBERADAMENTE DIFERENTE
  -- Si la rama de idempotencia funciona (retorno temprano), este payload modificado no se aplicará.
  res := public.migrate_guest_data(
    batch_idempotent,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-idempotent-1', 'name', 'NOMBRE MUTADO FRAUDULENTO', 'type', 'other', 'currency', 'USD')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );
end;
$$;

-- 5. Aserciones de verificación de estado

-- Inserción con VES
select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-ves-1' and sls.installation_id = 'install-test-1'),
  'VES',
  'new space migrated with VES stores currency = VES'
);

-- Inserción sin currency -> EUR
select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-legacy-1' and sls.installation_id = 'install-test-1'),
  'EUR',
  'legacy space migrated without currency falls back to EUR'
);

-- Actualización explícita de EUR a VES
select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-eur-to-ves' and sls.installation_id = 'install-test-1'),
  'VES',
  'explicit update of space currency from EUR to VES succeeds'
);

select is(
  (select s.name from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-eur-to-ves' and sls.installation_id = 'install-test-1'),
  'Gastos Casa Venezuela',
  'updated space name was applied'
);

-- Actualización desde cliente antiguo sin currency conserva VES
select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-ves-1' and sls.installation_id = 'install-test-1'),
  'VES',
  'space update from legacy client without currency preserves existing VES currency'
);

select is(
  (select s.name from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-ves-1' and sls.installation_id = 'install-test-1'),
  'Viajes Actualizado',
  'space name was updated successfully'
);

-- Degradación de couple a other conservando USD
select is(
  (select s.type from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-couple-guest-1' and sls.installation_id = 'install-test-1'),
  'other',
  'guest couple space is downgraded to other upon migration'
);

select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-couple-guest-1' and sls.installation_id = 'install-test-1'),
  'USD',
  'downgraded space preserves USD currency'
);

-- 6. Verificación discriminante de idempotencia
select is(
  (select s.name from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-idempotent-1' and sls.installation_id = 'install-test-1'),
  'Nombre Original Inmutable',
  'idempotent replay with different payload does not overwrite space name'
);

select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-idempotent-1' and sls.installation_id = 'install-test-1'),
  'VES',
  'idempotent replay with different payload does not overwrite space currency'
);

select is(
  (select count(*) from public.space_local_sources where local_id = 'sp-idempotent-1' and installation_id = 'install-test-1'),
  1::bigint,
  'idempotent batch execution does not create duplicate links'
);

select is(
  (select status from public.guest_migration_batches where id = '22222222-2222-4222-8222-222222222299'::uuid),
  'completed',
  'idempotent batch record remains completed'
);

select * from finish();
rollback;
