import { supabaseEnvironment } from '@/app/config/environment';
import type { LegalDocumentId } from '@/features/legal/model/types';
import { getConfiguredSupabaseClient } from '@/lib/supabase/supabaseClient';

const appVersion = '0.1.0';

export type RecordLegalAcceptanceInput = {
  documentId: Exclude<LegalDocumentId, 'open-source-licenses'>;
  documentVersion: string;
  locale: string;
  source: string;
};

/**
 * Registra evidencia de aceptación de términos/política cuando existe una
 * sesión autenticada. Sin sesión (modo invitado, el único caso hoy) no hay
 * nada que registrar: todavía no existe un flujo de registro que llame a
 * esta función, pero la tabla y el gateway ya quedan listos para cuando
 * exista.
 */
export async function recordLegalAcceptance(
  input: RecordLegalAcceptanceInput,
): Promise<void> {
  if (!supabaseEnvironment) return;

  const client = getConfiguredSupabaseClient();
  const { data, error: userError } = await client.auth.getUser();
  if (userError || !data.user) return;

  const { error } = await client.from('legal_acceptances').insert({
    user_id: data.user.id,
    document_type: input.documentId,
    document_version: input.documentVersion,
    app_version: appVersion,
    locale: input.locale,
    source: input.source,
  });
  if (error) {
    throw new Error(`No pudimos registrar la aceptación: ${error.message}`);
  }
}
