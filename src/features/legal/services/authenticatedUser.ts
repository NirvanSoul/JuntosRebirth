import { supabaseEnvironment } from '@/app/config/environment';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

/**
 * `null` cuando no hay Supabase configurado o no hay sesión (modo invitado,
 * el único caso hoy porque todavía no existe pantalla de registro).
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  if (!supabaseEnvironment) return null;

  const client = getConfiguredSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
