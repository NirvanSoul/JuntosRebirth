import type { SpaceMemberProfile } from '@/features/profile/types';

export type TransactionAuthor = {
  /** Perfil del autor, o `null` si todavía no se conoce su nombre. */
  profile: SpaceMemberProfile | null;
  /** `true` solo cuando consta que lo creó quien usa este móvil. */
  isOwn: boolean;
};

export type TransactionAuthorContext = {
  profilesByUserId: Readonly<Record<string, SpaceMemberProfile>>;
  /** Uuid de quien usa el móvil, o `null` en modo invitado. */
  ownUserId: string | null;
  /** Id de instalación de este dispositivo, que firma las filas sin sesión. */
  installationId: string | null;
};

/**
 * Atribuye un movimiento a una persona del espacio.
 *
 * `createdBy` no siempre es un uuid de usuario: una fila creada en modo
 * invitado, o anterior a que se normalizara la columna, guarda el id de
 * instalación del dispositivo. Por eso la autoría propia se reconoce por dos
 * vías, el uuid y el id de instalación, y ambas se comparan de forma explícita.
 *
 * Lo que no se hace es tratar como propio cualquier id desconocido. Sería
 * cómodo —en un espacio de dos, quien no es la otra persona eres tú— pero
 * atribuiría a quien mira los movimientos de su pareja durante la ventana en
 * que el censo todavía no se ha descargado. Ante la duda devuelve un autor sin
 * perfil y sin propiedad, que la interfaz muestra como desconocido.
 */
export function resolveTransactionAuthor(
  createdBy: string,
  { profilesByUserId, ownUserId, installationId }: TransactionAuthorContext,
): TransactionAuthor {
  const isOwn =
    (ownUserId !== null && createdBy === ownUserId) ||
    (installationId !== null && createdBy === installationId);

  if (isOwn) {
    return {
      profile: ownUserId ? (profilesByUserId[ownUserId] ?? null) : null,
      isOwn: true,
    };
  }

  return { profile: profilesByUserId[createdBy] ?? null, isOwn: false };
}
