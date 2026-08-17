begin;
select plan(9);

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

-- Preparar usuario autenticado simulado
create schema if not exists tests_temp;
set local search_path = public, auth;

do $$
declare
  test_user_id uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  batch_1 uuid := '22222222-2222-4222-8222-222222222221'::uuid;
  batch_2 uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  batch_3 uuid := '22222222-2222-4222-8222-222222222223'::uuid;
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

  -- Caso 3: Actualización desde cliente antiguo sin currency sobre sp-ves-1 -> debe conservar VES
  res := public.migrate_guest_data(
    batch_3,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-ves-1', 'name', 'Viajes Actualizado', 'type', 'other')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );
end;
$$;

-- Verificar inserción con VES
select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-ves-1' and sls.installation_id = 'install-test-1'),
  'VES',
  'new space migrated with VES stores currency = VES'
);

-- Verificar inserción sin currency -> EUR
select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-legacy-1' and sls.installation_id = 'install-test-1'),
  'EUR',
  'legacy space migrated without currency falls back to EUR'
);

-- Verificar actualización desde cliente antiguo sin currency conserva VES
select is(
  (select s.currency from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-ves-1' and sls.installation_id = 'install-test-1'),
  'VES',
  'space update from legacy client without currency preserves existing VES currency'
);

-- Verificar actualización del nombre
select is(
  (select s.name from public.spaces s
    join public.space_local_sources sls on sls.space_id = s.id
   where sls.local_id = 'sp-ves-1' and sls.installation_id = 'install-test-1'),
  'Viajes Actualizado',
  'space name was updated successfully'
);

-- Verificar degradación de couple a other en migración de invitado
do $$
declare
  test_user_id uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  batch_4 uuid := '22222222-2222-4222-8222-222222222224'::uuid;
begin
  perform set_config('request.jwt.claim.sub', test_user_id::text, true);
  perform public.migrate_guest_data(
    batch_4,
    'install-test-1',
    jsonb_build_array(
      jsonb_build_object('id', 'sp-couple-guest-1', 'name', 'Pareja Falsa', 'type', 'couple', 'currency', 'USD')
    ),
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  );
end;
$$;

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

rollback;
