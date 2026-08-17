import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

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
    const client = getConfiguredSupabaseClient();
    const { error } = await client
      .from('profiles')
      .update({ default_currency: currency })
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[profiles] no se pudo publicar la moneda principal', {
      error,
    });
    return false;
  }
}
