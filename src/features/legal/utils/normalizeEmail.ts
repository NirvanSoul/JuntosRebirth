/**
 * Normaliza un correo para cotejar la identidad de registro de una intención
 * pendiente con la sesión que aparece después: minúsculas y sin espacios.
 * Quien cambie de correo pierde la correspondencia y la intención anterior
 * nunca se aplica a la sesión nueva sin una acción afirmativa nueva.
 */
export function normalizeEmailAddress(email: string): string {
  return email.trim().toLocaleLowerCase();
}
