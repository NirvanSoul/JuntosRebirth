import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { apiClient } from '@/services/api/juntossApiClient';
import { bootstrapRemoteAccount } from '@/features/sync/services/bootstrapRemoteAccount';

/**
 * Publica la moneda principal de la persona autenticada.
 *
 * El perfil es el dato que ven los demás miembros de un espacio compartido;
 * las preferencias completas siguen siendo locales. Por eso solo se replica
 * la primera moneda, que es la que se usa por defecto al crear movimientos y
 * espacios. Nunca lanza: guardar la preferencia local no debe depender de la
 * conectividad ni impedir que la persona use la aplicación.
 */
export async function syncOwnDefaultCurrency(
  currency: CurrencyCode,
): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  try {
    // La preferencia se carga al montar la interfaz y puede adelantarse a la
    // inicialización de sesión. Bootstrap es idempotente y garantiza que el
    // perfil remoto exista antes del PATCH.
    await bootstrapRemoteAccount();
    // El perfil que se actualiza es el de la sesión: la API no acepta un
    // identificador de usuario en el cuerpo.
    await apiClient.patch('/v1/me/profile', { defaultCurrency: currency });
    return true;
  } catch (error) {
    console.error('[profiles] no se pudo publicar la moneda principal', {
      error,
    });
    return false;
  }
}
