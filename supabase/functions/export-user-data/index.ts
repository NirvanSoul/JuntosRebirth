// Edge Function: export-user-data
//
// Agrega los datos remotos del usuario autenticado (perfil, espacios,
// categorías, movimientos y series recurrentes) usando su propio JWT, de
// forma que RLS limite el resultado exactamente a lo que ya puede ver. No
// usa la service role: no hace falta, y así se evita exponer más de lo que
// las políticas ya permiten.
//
// Desplegar con: supabase functions deploy export-user-data
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

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

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

  const [profile, spaces, categories, transactions, recurringSeries] =
    await Promise.all([
      userClient.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      userClient.from('spaces').select('*'),
      userClient.from('categories').select('*'),
      userClient.from('transactions').select('*'),
      userClient.from('recurring_transaction_series').select('*'),
    ]);

  const firstError = [
    profile.error,
    spaces.error,
    categories.error,
    transactions.error,
    recurringSeries.error,
  ].find(Boolean);
  if (firstError) {
    return new Response(
      JSON.stringify({
        error: `No pudimos reunir tus datos: ${firstError.message}`,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      profile: profile.data,
      spaces: spaces.data,
      categories: categories.data,
      transactions: transactions.data,
      recurringSeries: recurringSeries.data,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
