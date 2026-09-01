import type { SpaceMemberProfile } from '@/features/profile/types';

export type TransactionAuthor = {
  /** Perfil del autor, o `null` si todavía no se conoce su nombre. */
  profile: SpaceMemberProfile | null;
  /** `true` solo cuando consta que lo creó quien usa este móvil. */
  isOwn: boolean;
};

export type TransactionAuthorContext = {
  profilesByUserId: Readonly<Record<string, SpaceMemberProfile>>;
  /** Uuid de quien usa el móvil, si la sesión se pudo restaurar. */
  ownUserId: string | null;
};

/**
 * Atribuye un movimiento a una persona del espacio.
 *
 * Lo que no se hace es tratar como propio cualquier id desconocido. Sería
 * cómodo —en un espacio de dos, quien no es la otra persona eres tú— pero
 * atribuiría a quien mira los movimientos de su pareja durante la ventana en
 * que el censo todavía no se ha descargado. Ante la duda devuelve un autor sin
 * perfil y sin propiedad, que la interfaz muestra como desconocido.
 */
/**
 * Nombre con el que se presenta un autor en la interfaz.
 *
 * Se prefiere el nombre real incluso para lo propio: en un espacio compartido,
 * ver el nombre de cada uno lee mejor que un «Tú» que rompe la simetría de la
 * lista. «Tú» queda como respaldo para cuando el perfil aún no ha bajado.
 */
export function formatAuthorName(author: TransactionAuthor): string {
  if (author.profile?.displayName) return author.profile.displayName;
  return author.isOwn ? 'Tú' : 'Desconocido';
}

export function resolveTransactionAuthor(
  createdBy: string,
  { profilesByUserId, ownUserId }: TransactionAuthorContext,
): TransactionAuthor {
  const isOwn = ownUserId !== null && createdBy === ownUserId;

  if (isOwn) {
    return {
      profile: ownUserId ? (profilesByUserId[ownUserId] ?? null) : null,
      isOwn: true,
    };
  }

  return { profile: profilesByUserId[createdBy] ?? null, isOwn: false };
}
