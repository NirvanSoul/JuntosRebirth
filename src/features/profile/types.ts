import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type LocalProfile = {
  avatarUri: string | null;
  displayName: string | null;
};

/** Perfil de una persona con membresía activa en un espacio compartido. */
export type SpaceMemberProfile = {
  userId: string;
  displayName: string | null;
  /** Ruta del objeto en Supabase Storage, `{userId}/avatar.jpg`. */
  avatarPath: string | null;
  /** Sello de la última subida, con el que se decide si hay que redescargar. */
  avatarUpdatedAt: string | null;
  /**
   * Moneda preferida de esa persona. Un espacio compartido ofrece las monedas
   * de todos sus miembros, así que sin esto la otra persona no podría ver ni
   * elegir la moneda en la que trabaja su pareja.
   */
  defaultCurrency: CurrencyCode | null;
  /**
   * Uri local del archivo ya descargado, con `?v=` para invalidar la caché de
   * imagen. `null` mientras no se haya descargado o si no tiene foto.
   */
  avatarUri: string | null;
};

export type AvatarPickSource = 'camera' | 'library';
