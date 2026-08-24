/**
 * Pausa de la puerta legal por recuperación de contraseña (ADR-084).
 *
 * La pausa: era un booleano de módulo. Con más de un anfitrión montado a la vez
 * —Ajustes y la invitación pueden coexistir—, el segundo liberaba la pausa del
 * primero al desmontarse. Aquí cada controlador sostiene una concesión con su
 * propio identificador y solo libera la suya: la puerta sigue en pausa mientras
 * quede alguna viva.
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

/** Efectos que la puerta legal registra para publicar la pausa/reanudación. */
export type RecoveryHoldEffects = {
  onHalt: () => void;
  onResume: () => void;
};

let effects: RecoveryHoldEffects = { onHalt: () => {}, onResume: () => {} };

/** La puerta registra sus publicaciones una vez, al importarse el módulo. */
export function registerRecoveryHoldEffects(next: RecoveryHoldEffects): void {
  effects = next;
}

/**
 * Concesión con dueño, a nivel de módulo. La puerta queda en pausa mientras
 * exista alguna y solo se reanuda al liberar la última: un anfitrión que se
 * desmonta ya no puede soltar la pausa de otro que sigue restableciendo. Solo
 * se actúa cuando el valor derivado cambia, para no republicar de más.
 */
export function commitRecoveryHold(ownerId: string, held: boolean): void {
  const { isHalted: halted, wasHalted } = applyRecoveryHold(ownerId, held);
  if (wasHalted === halted) return;
  if (halted) {
    effects.onHalt();
    return;
  }
  effects.onResume();
}

/** Solo para pruebas: vacía el registro entre suites. */
export function clearRecoveryHolds(): void {
  holds.clear();
}
