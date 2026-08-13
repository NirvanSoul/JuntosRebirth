// Edge Function: login-with-lockout
//
// Envuelve `signInWithPassword` para poder aplicar un bloqueo de cuenta
// tras intentos fallidos repetidos (Bible/ROADMAP.md Fase 7, ADR-075).
// Esto no puede vivir en una función SQL normal: el conteo de intentos
// solo es confiable si se actualiza en el mismo paso que la validación
// real de la contraseña contra GoTrue, y esa validación no pasa por
// Postgres.
//   1. Revisa `login_attempts` (service role, ignora RLS) por si el
//      correo está bloqueado.
//   2. Si no lo está, intenta `signInWithPassword` de verdad.
//   3. Éxito: limpia el contador y devuelve la sesión para que el cliente
//      la hidrate con `setSession`.
//   4. Fallo: incrementa el contador; al llegar a 9 bloquea 1 hora y
//      reinicia el contador.
//
// Desplegar con: supabase functions deploy login-with-lockout
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const maxFailedAttempts = 9;
const lockoutDurationMs = 60 * 60 * 1000;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let email: unknown;
  let password: unknown;
  try {
    const body = await req.json();
    email = body?.email;
    password = body?.password;
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email ||
    !password
  ) {
    return jsonResponse({ error: 'invalid_body' }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const adminDb = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();

  const { data: existingAttempt } = await adminDb
    .from('login_attempts')
    .select('failed_count, locked_until')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingAttempt?.locked_until) {
    const lockedUntil = new Date(existingAttempt.locked_until);
    if (lockedUntil > now) {
      return jsonResponse(
        { error: 'locked', lockedUntil: lockedUntil.toISOString() },
        423,
      );
    }
    // El bloqueo ya venció: se limpia para empezar un conteo nuevo en vez
    // de arrastrar el contador anterior.
    await adminDb.from('login_attempts').delete().eq('email', normalizedEmail);
    existingAttempt.failed_count = 0;
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await authClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    const nextCount = (existingAttempt?.failed_count ?? 0) + 1;
    if (nextCount >= maxFailedAttempts) {
      const lockedUntil = new Date(now.getTime() + lockoutDurationMs);
      await adminDb.from('login_attempts').upsert({
        email: normalizedEmail,
        failed_count: 0,
        locked_until: lockedUntil.toISOString(),
        last_attempt_at: now.toISOString(),
      });
      return jsonResponse(
        { error: 'locked', lockedUntil: lockedUntil.toISOString() },
        423,
      );
    }

    await adminDb.from('login_attempts').upsert({
      email: normalizedEmail,
      failed_count: nextCount,
      locked_until: null,
      last_attempt_at: now.toISOString(),
    });
    return jsonResponse(
      { error: 'invalid_credentials', message: error?.message ?? null },
      401,
    );
  }

  await adminDb.from('login_attempts').delete().eq('email', normalizedEmail);

  return jsonResponse(
    {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      userId: data.user.id,
    },
    200,
  );
});
