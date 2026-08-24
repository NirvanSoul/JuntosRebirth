import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingLegalAcceptance,
  loadPendingLegalAcceptance,
  pendingLegalAcceptanceLegacyStorageKey,
  pendingLegalAcceptanceStorageKeyForEmail,
  savePendingLegalAcceptance,
} from '@/features/legal/persistence/pendingLegalAcceptanceRepository';
import type { PendingLegalAcceptanceNew } from '@/features/legal/model/types';

const newIntention: PendingLegalAcceptanceNew = {
  email: '  Ana@Ejemplo.com ',
  locale: 'es-ES',
  source: 'access-signup',
  appVersion: '0.1.0',
  documents: [
    {
      documentId: 'terms-of-service',
      documentVersion: '2026.1',
      action: 'accepted',
    },
    {
      documentId: 'privacy-policy',
      documentVersion: '2026.1',
      action: 'consulted',
    },
  ],
};

/** Intención v1 válida tal y como la escribiría la aplicación anterior. */
const rawIntentionV1 = {
  version: 1,
  email: 'ana@ejemplo.com',
  locale: 'es-ES',
  source: 'access-signup',
  appVersion: '0.1.0',
  documents: [
    {
      documentId: 'terms-of-service',
      documentVersion: '2026.1',
      action: 'accepted',
    },
    {
      documentId: 'privacy-policy',
      documentVersion: '2026.1',
      action: 'consulted',
    },
  ],
};

async function storeRawIntention(
  storageKey: string,
  value: unknown,
): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(value));
}

describe('pendingLegalAcceptanceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('conserva la intención versionada entre cierres (round-trip)', async () => {
    await savePendingLegalAcceptance(newIntention);

    const loaded = await loadPendingLegalAcceptance('ana@ejemplo.com');

    expect(loaded).not.toBeNull();
    expect(loaded?.version).toBe(1);
    // El correo se normaliza al persistir para cotejar después con la sesión.
    expect(loaded?.email).toBe('ana@ejemplo.com');
    expect(loaded?.locale).toBe('es-ES');
    expect(loaded?.source).toBe('access-signup');
    expect(loaded?.appVersion).toBe('0.1.0');
    expect(loaded?.documents).toEqual(newIntention.documents);
  });

  it('sobrevive al cierre de la app: una intención guardada sigue leyéndose en la siguiente apertura', async () => {
    await savePendingLegalAcceptance(newIntention);

    // Simula el reinicio: no hay estado en memoria, solo el almacenamiento.
    const reloaded = await loadPendingLegalAcceptance('ana@ejemplo.com');

    expect(reloaded?.email).toBe('ana@ejemplo.com');
    expect(reloaded?.documents.map((document) => document.documentId)).toEqual([
      'terms-of-service',
      'privacy-policy',
    ]);
  });

  it('almacena una intención por correo normalizado: la de B no pisa la de A y consumir B conserva A (B8)', async () => {
    const beta: PendingLegalAcceptanceNew = {
      ...newIntention,
      email: 'beta@ejemplo.com',
    };
    await savePendingLegalAcceptance(newIntention);
    await savePendingLegalAcceptance(beta);

    const ana = await loadPendingLegalAcceptance('ana@ejemplo.com');
    const betaLoaded = await loadPendingLegalAcceptance('beta@ejemplo.com');
    expect(ana?.email).toBe('ana@ejemplo.com');
    expect(betaLoaded?.email).toBe('beta@ejemplo.com');

    await clearPendingLegalAcceptance('beta@ejemplo.com');
    expect(await loadPendingLegalAcceptance('beta@ejemplo.com')).toBeNull();
    expect((await loadPendingLegalAcceptance('ana@ejemplo.com'))?.email).toBe(
      'ana@ejemplo.com',
    );
  });

  it('migra la antigua ranura única a la clave por correo al leerla (B8)', async () => {
    await storeRawIntention(
      pendingLegalAcceptanceLegacyStorageKey,
      rawIntentionV1,
    );

    const loaded = await loadPendingLegalAcceptance('ana@ejemplo.com');

    expect(loaded?.email).toBe('ana@ejemplo.com');
    expect(
      await AsyncStorage.getItem(pendingLegalAcceptanceLegacyStorageKey),
    ).toBeNull();
    expect(
      await AsyncStorage.getItem(
        pendingLegalAcceptanceStorageKeyForEmail('ana@ejemplo.com'),
      ),
    ).not.toBeNull();
  });

  it('la antigua ranura única de otro correo no se migra ni se pierde (B8)', async () => {
    await storeRawIntention(pendingLegalAcceptanceLegacyStorageKey, {
      ...rawIntentionV1,
      email: 'otra@ejemplo.com',
    });

    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).toBeNull();
    expect(
      await AsyncStorage.getItem(pendingLegalAcceptanceLegacyStorageKey),
    ).not.toBeNull();
    // Su titular sí puede recuperarla y migrarla a su propia clave.
    expect(await loadPendingLegalAcceptance('otra@ejemplo.com')).not.toBeNull();
  });

  it('descarta una intención guardada con esquema inválido o versión desconocida', async () => {
    await storeRawIntention(
      pendingLegalAcceptanceStorageKeyForEmail('ana@ejemplo.com'),
      { version: 999, email: 'ana@ejemplo.com' },
    );

    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).toBeNull();
  });

  it('descarta una intención que no sea un objeto JSON válido', async () => {
    await AsyncStorage.setItem(
      pendingLegalAcceptanceStorageKeyForEmail('ana@ejemplo.com'),
      'no-es-un-objeto',
    );

    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).toBeNull();
  });

  it('no conserva contraseña, OTP ni otros secretos en la intención', async () => {
    await savePendingLegalAcceptance(newIntention);

    const raw = await AsyncStorage.getItem(
      pendingLegalAcceptanceStorageKeyForEmail('ana@ejemplo.com'),
    );

    expect(raw).not.toContain('password');
    expect(raw).not.toContain('otp');
    expect(raw).not.toContain('token');
    expect(raw?.toLowerCase()).not.toContain('contrase');
  });

  it('persiste sin createdAt: el sello de tiempo no gobierna ninguna decisión (C2)', async () => {
    await savePendingLegalAcceptance(newIntention);

    const raw = await AsyncStorage.getItem(
      pendingLegalAcceptanceStorageKeyForEmail('ana@ejemplo.com'),
    );

    expect(raw).not.toContain('createdAt');
  });

  it('clearPendingLegalAcceptance elimina la intención pendiente del correo indicado', async () => {
    await savePendingLegalAcceptance(newIntention);
    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).not.toBeNull();

    await clearPendingLegalAcceptance('ana@ejemplo.com');

    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).toBeNull();
  });

  it('sin intención previa devuelve null', async () => {
    expect(
      await loadPendingLegalAcceptance('cualquiera@ejemplo.com'),
    ).toBeNull();
  });
});
