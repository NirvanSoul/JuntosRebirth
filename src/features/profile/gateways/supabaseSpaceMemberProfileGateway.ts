import type { SupabaseClient } from '@supabase/supabase-js';

import type { SpaceMemberProfile } from '@/features/profile/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

/**
 * Censo de un espacio compartido con el nombre de cada miembro activo.
 *
 * Son dos consultas y no un `select` anidado a propósito: `space_members` y
 * `profiles` apuntan las dos a `auth.users`, pero no existe clave ajena entre
 * ellas, así que PostgREST no puede inferir la relación para incrustarla.
 *
 * La lectura de `profiles` depende de la política `profiles_select_space_member`
 * (migración 24). Contra un proyecto sin esa migración la consulta no falla:
 * devuelve solo la fila propia, y los demás miembros se quedan sin nombre.
 */
export async function fetchSpaceMemberProfiles(
  spaceId: string,
  client: SupabaseClient = getConfiguredSupabaseClient(),
): Promise<SpaceMemberProfile[]> {
  const { data: members, error: membersError } = await client
    .from('space_members')
    .select('user_id')
    .eq('space_id', spaceId)
    .eq('status', 'active');
  if (membersError || !members) {
    throw new Error('No pudimos recuperar los miembros del espacio');
  }

  const userIds = members.map((member) => member.user_id as string);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  if (profilesError || !profiles) {
    throw new Error('No pudimos recuperar los perfiles del espacio');
  }

  // Los campos de avatar se rellenan cuando exista la migración 25: hasta
  // entonces `profiles` no tiene ni `avatar_path` ni `avatar_updated_at`, y
  // pedirlos haría fallar la consulta entera, también la del nombre.
  return profiles.map((profile) => ({
    userId: profile.id as string,
    displayName:
      typeof profile.display_name === 'string' && profile.display_name.trim()
        ? profile.display_name
        : null,
    avatarPath: null,
    avatarUpdatedAt: null,
    avatarUri: null,
  }));
}
