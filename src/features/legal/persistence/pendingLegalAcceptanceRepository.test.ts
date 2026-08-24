import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingLegalAcceptance,
  loadPendingLegalAcceptance,
  pendingLegalAcceptanceStorageKey,
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

async function storeRawIntention(value: unknown): Promise<void> {
  await AsyncStorage.setItem(
    pendingLegalAcceptanceStorageKey,
    JSON.stringify(value),
  );
}

describe('pendingLegalAcceptanceRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('conserva la intención versionada entre cierres (round-trip)', async () => {
    await savePendingLegalAcceptance(newIntention);

    const loaded = await loadPendingLegalAcceptance();

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
    const reloaded = await loadPendingLegalAcceptance();

    expect(reloaded?.email).toBe('ana@ejemplo.com');
    expect(reloaded?.documents.map((document) => document.documentId)).toEqual([
      'terms-of-service',
      'privacy-policy',
    ]);
  });

  it('descarta una intención guardada con esquema inválido o versión desconocida', async () => {
    await storeRawIntention({ version: 999, email: 'ana@ejemplo.com' });

    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('descarta una intención que no sea un objeto JSON válido', async () => {
    await storeRawIntention('no-es-un-objeto');

    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('no conserva contraseña, OTP ni otros secretos en la intención', async () => {
    await savePendingLegalAcceptance(newIntention);

    const raw = await AsyncStorage.getItem(pendingLegalAcceptanceStorageKey);

    expect(raw).not.toContain('password');
    expect(raw).not.toContain('otp');
    expect(raw).not.toContain('token');
    expect(raw?.toLowerCase()).not.toContain('contrase');
  });

  it('persiste sin createdAt: el sello de tiempo no gobierna ninguna decisión (C2)', async () => {
    await savePendingLegalAcceptance(newIntention);

    const raw = await AsyncStorage.getItem(pendingLegalAcceptanceStorageKey);

    expect(raw).not.toContain('createdAt');
  });

  it('clearPendingLegalAcceptance elimina la intención pendiente', async () => {
    await savePendingLegalAcceptance(newIntention);
    expect(await loadPendingLegalAcceptance()).not.toBeNull();

    await clearPendingLegalAcceptance();

    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('sin intención previa devuelve null', async () => {
    expect(await loadPendingLegalAcceptance()).toBeNull();
  });
});
