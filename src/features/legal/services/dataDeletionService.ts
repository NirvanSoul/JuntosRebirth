import AsyncStorage from '@react-native-async-storage/async-storage';

import { createSupabaseAccountDeletionGateway } from '@/features/legal/gateways/supabaseAccountDeletionGateway';
import type { DataDeletionResult } from '@/features/legal/model/types';
import { getAuthenticatedUserId } from '@/features/legal/services/authenticatedUser';
import {
  getLocalDatabase,
  resetLocalDatabase,
} from '@/lib/storage/localDatabase';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

const localStorageKeyPrefix = '@juntoss/';

/**
 * Borra todos los datos locales de la aplicación: movimientos, categorías,
 * series recurrentes, recordatorios, estado de sincronización y todas las
 * preferencias guardadas en AsyncStorage bajo el espacio de nombres de la
 * app. Es la única acción necesaria en modo invitado, y también se ejecuta
 * tras eliminar una cuenta remota.
 */
export async function deleteLocalData(): Promise<void> {
  try {
    const database = await getLocalDatabase();
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        DELETE FROM transaction_notification_rule_schedules;
        DELETE FROM transaction_notification_rules;
        DELETE FROM transaction_reminders;
        DELETE FROM merchant_feedback_queue;
        DELETE FROM import_items;
        DELETE FROM import_batches;
        DELETE FROM import_merchant_rules;
        DELETE FROM category_budgets;
        DELETE FROM transactions;
        DELETE FROM recurring_transaction_series;
        DELETE FROM money_accounts;
        DELETE FROM categories;
        DELETE FROM local_sync_batches;
        DELETE FROM local_sync_account;
        DELETE FROM local_profile;
        DELETE FROM remote_entity_links;
        DELETE FROM local_metadata;
      `);
    });
  } catch (error) {
    // La base local no se pudo abrir, migrar o vaciar (p. ej. corrupción):
    // en vez de dejar al usuario sin forma de recuperarse, se elimina el
    // archivo completo. El resultado ("no queda ningún dato local") sigue
    // cumpliendo lo que promete esta función.
    console.error('[dataDeletionService]', error);
    await resetLocalDatabase();
  }

  const keys = await AsyncStorage.getAllKeys();
  const appKeys = keys.filter((key) => key.startsWith(localStorageKeyPrefix));
  if (appKeys.length > 0) {
    await AsyncStorage.multiRemove(appKeys);
  }
}

/**
 * Elimina la cuenta y los datos remotos del usuario autenticado, y a
 * continuación limpia también los datos locales del dispositivo.
 */
export async function deleteAccountAndData(): Promise<void> {
  const client = getConfiguredSupabaseClient();
  const gateway = createSupabaseAccountDeletionGateway(client);
  await gateway.deleteAccount();
  await client.auth.signOut();
  await deleteLocalData();
}

/**
 * Decide la ruta correcta según el estado real de la sesión: si hay una
 * cuenta autenticada, elimina la cuenta y los datos remotos; si no (modo
 * invitado, el caso de prácticamente todos los usuarios hoy), borra solo
 * los datos locales.
 */
export async function deleteMyAccountOrData(): Promise<DataDeletionResult> {
  const userId = await getAuthenticatedUserId();
  if (userId) {
    await deleteAccountAndData();
    return { scope: 'account' };
  }

  await deleteLocalData();
  return { scope: 'local' };
}
