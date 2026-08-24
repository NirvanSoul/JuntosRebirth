/**
 * Registro de concesiones de pausa de la puerta legal (ADR-084).
 *
 * La pausa por recuperación de contraseña era un booleano de módulo. Con más de
 * un anfitrión montado a la vez —Ajustes y la invitación pueden coexistir—, el
 * segundo liberaba la pausa del primero al desmontarse. Aquí cada controlador
 * sostiene una concesión con su propio identificador y solo libera la suya: la
 * puerta sigue en pausa mientras quede alguna viva.
 */
const holds = new Set<string>();

export function isRecoveryHalted(): boolean {
  return holds.size > 0;
}

/**
 * Aplica una concesión y devuelve el valor derivado antes y después, para que
 * el llamante actúe **solo cuando cambia** y no republique de más.
 */
export function applyRecoveryHold(
  ownerId: string,
  held: boolean,
): { wasHalted: boolean; isHalted: boolean } {
  const wasHalted = isRecoveryHalted();
  if (held) {
    holds.add(ownerId);
  } else {
    holds.delete(ownerId);
  }
  return { isHalted: isRecoveryHalted(), wasHalted };
}

/** Solo para pruebas: vacía el registro entre suites. */
export function clearRecoveryHolds(): void {
  holds.clear();
}
