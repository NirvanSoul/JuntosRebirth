export type LocalProfile = {
  avatarUri: string | null;
  displayName: string | null;
};

/**
 * Perfil de una persona con membresía activa en un espacio compartido.
 *
 * `avatarUrl` viaja ya en el tipo porque la columna remota existe, pero hoy es
 * siempre `null`: la foto se guarda solo en el dispositivo y nada la sube a
 * Supabase Storage todavía.
 */
export type SpaceMemberProfile = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type AvatarPickSource = 'camera' | 'library';
