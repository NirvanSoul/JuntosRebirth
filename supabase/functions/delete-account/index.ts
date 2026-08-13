// Edge Function: delete-account
//
// Una función SQL normal no puede borrar filas de auth.users (solo la Admin
// API con la service role key puede). Este es el único paso del flujo de
// eliminación de cuenta que necesita ejecutarse fuera de Postgres:
//   1. Verifica la identidad de quien llama con su propio JWT.
//   2. Ejecuta `request_account_deletion()` (limpia/anonimiza los datos).
//   3. Borra la fila de auth.users con la Admin API.
//
// Desplegar con: supabase functions deploy delete-account
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Falta el encabezado Authorization' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: cleanupError } = await userClient.rpc(
    'request_account_deletion',
  );
  if (cleanupError) {
    return new Response(
      JSON.stringify({
        error: `No pudimos limpiar los datos: ${cleanupError.message}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
    user.id,
  );
  if (deleteUserError) {
    return new Response(
      JSON.stringify({
        error: `Los datos se limpiaron pero no pudimos borrar la cuenta: ${deleteUserError.message}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
