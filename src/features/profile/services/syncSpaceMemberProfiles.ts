import { fetchSpaceMemberProfiles } from '@/features/profile/gateways/supabaseSpaceMemberProfileGateway';
import { replaceSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';

/**
 * Refresca el censo local de un espacio compartido.
 *
 * Devuelve `false` sin tocar nada cuando no hay sesión: en modo invitado no hay
 * espacios compartidos que censar y `profiles` no es legible. No borra el censo
 * previo en ese caso, para no dejar sin nombre a los movimientos ya bajados si
 * la sesión caduca de forma temporal.
 */
export async function syncSpaceMemberProfiles(
  spaceId: string,
): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const profiles = await fetchSpaceMemberProfiles(spaceId);
  await replaceSpaceMemberProfiles(spaceId, profiles);
  return true;
}
