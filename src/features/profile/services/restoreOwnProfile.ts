import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  getLocalProfile,
  restoreRemoteProfileDisplayName,
  saveLocalProfileCountry,
} from '@/features/profile/repositories/localProfileRepository';
import { restoreOwnAvatar } from '@/features/profile/services/syncOwnAvatar';
import { apiClient } from '@/services/api/juntossApiClient';

type RemoteOwnProfile = {
  avatarPath?: unknown;
  avatarUpdatedAt?: unknown;
  countryCode?: unknown;
  displayName?: unknown;
};

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Copia el perfil canónico del servidor en SQLite sin pisar ediciones pendientes. */
export async function restoreOwnProfile(): Promise<string | null> {
  const response = await apiClient.get<{
    data?: { profile?: RemoteOwnProfile | null };
  }>('/v1/me');
  const profile = response.data?.profile;
  if (!profile) return null;

  if (Object.prototype.hasOwnProperty.call(profile, 'displayName')) {
    await restoreRemoteProfileDisplayName(optionalString(profile.displayName));
  }

  if (
    Object.prototype.hasOwnProperty.call(profile, 'avatarPath') &&
    Object.prototype.hasOwnProperty.call(profile, 'avatarUpdatedAt')
  ) {
    const userId = await getAuthenticatedUserId();
    if (userId) {
      await restoreOwnAvatar({
        userId,
        avatarPath: optionalString(profile.avatarPath),
        avatarUpdatedAt: optionalString(profile.avatarUpdatedAt),
      });
    }
  }

  const countryCode = profile.countryCode;
  if (typeof countryCode === 'string' && /^[A-Za-z]{2}$/.test(countryCode)) {
    const normalizedCountry = countryCode.toUpperCase();
    const localProfile = await getLocalProfile();
    if (localProfile.countryCode !== normalizedCountry) {
      await saveLocalProfileCountry(normalizedCountry);
    }
    return normalizedCountry;
  }
  return null;
}
