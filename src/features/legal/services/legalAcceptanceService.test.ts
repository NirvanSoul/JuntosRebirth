import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  consumePendingLegalAcceptance,
  getMissingCurrentLegalDocuments,
  LegalAcceptanceEmailMismatchError,
  LegalAcceptanceInsertError,
  LegalAcceptanceQueryError,
  recordLegalAcceptance,
} from '@/features/legal/services/legalAcceptanceService';
import {
  loadPendingLegalAcceptance,
  savePendingLegalAcceptance,
} from '@/features/legal/persistence/pendingLegalAcceptanceRepository';
import type { PendingLegalAcceptanceNew } from '@/features/legal/model/types';

jest.mock('@/app/config/environment', () => ({
  supabaseEnvironment: {
    url: 'https://proyecto.supabase.co',
    publishableKey: 'pk-test',
  },
}));

const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockGetUser = jest.fn();
let acceptedRows: {
  document_type: string;
  document_version: string;
}[];

jest.mock('@/lib/supabase/supabaseClient', () => ({
  getConfiguredSupabaseClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  }),
}));

function acceptanceBuilder() {
  const builder = {
    eq: jest.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve().then(() =>
        resolve({ data: acceptedRows, error: null }),
      ),
  };
  mockSelect.mockReturnValue(builder);
  return builder;
}

function failingQueryBuilder() {
  const builder = {
    eq: jest.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve().then(() =>
        resolve({ data: null, error: { message: 'consulta falló' } }),
      ),
  };
  mockSelect.mockReturnValue(builder);
  return builder;
}

const newIntention: PendingLegalAcceptanceNew = {
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

describe('legalAcceptanceService — flujo de intención pendiente', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    acceptedRows = [];
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'ana@ejemplo.com' } },
      error: null,
    });
    // Cada inserción exitosa alimenta las filas que la verificación posterior
    // consulta, reproduciendo el estado real de la base.
    mockInsert.mockImplementation(async (row: Record<string, unknown>) => {
      acceptedRows.push({
        document_type: String(row.document_type),
        document_version: String(row.document_version),
      });
      return { error: null };
    });
  });

  it('sin intención pendiente devuelve «no-intention» sin tocar la base', async () => {
    const result = await consumePendingLegalAcceptance({
      userId: 'user-1',
      sessionEmail: 'ana@ejemplo.com',
    });

    expect(result.outcome).toBe('no-intention');
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('consume la intención insertando solo los documentos que aún no existen', async () => {
    await savePendingLegalAcceptance(newIntention);
    // Los Términos ya constan en 2026.1; la Política aún no.
    acceptedRows = [
      {
        document_type: 'terms-of-service',
        document_version: '2026.1',
      },
    ];
    acceptanceBuilder();

    const result = await consumePendingLegalAcceptance({
      userId: 'user-1',
      sessionEmail: 'ana@ejemplo.com',
    });

    expect(result.outcome).toBe('inserted');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      document_type: 'privacy-policy',
      document_version: '2026.1',
      app_version: '0.1.0',
      locale: 'es-ES',
      source: 'access-signup',
    });
    // Al confirmar que las filas esperadas existen, la intención se elimina.
    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('una intención de otro correo jamás se aplica a la sesión actual', async () => {
    await savePendingLegalAcceptance(newIntention);

    await expect(
      consumePendingLegalAcceptance({
        userId: 'user-2',
        sessionEmail: 'otra@ejemplo.com',
      }),
    ).rejects.toBeInstanceOf(LegalAcceptanceEmailMismatchError);

    expect(mockInsert).not.toHaveBeenCalled();
    // La intención original se conserva intacta.
    expect(await loadPendingLegalAcceptance()).not.toBeNull();
  });

  it('un fallo de inserción conserva la intención para reintentar solo lo faltante', async () => {
    await savePendingLegalAcceptance(newIntention);
    acceptanceBuilder();
    mockInsert
      .mockImplementationOnce(async () => ({
        error: { message: 'network caído' },
      }))
      .mockImplementation(async (row: Record<string, unknown>) => {
        acceptedRows.push({
          document_type: String(row.document_type),
          document_version: String(row.document_version),
        });
        return { error: null };
      });

    await expect(
      consumePendingLegalAcceptance({
        userId: 'user-1',
        sessionEmail: 'ana@ejemplo.com',
      }),
    ).rejects.toBeInstanceOf(LegalAcceptanceInsertError);
    expect(await loadPendingLegalAcceptance()).not.toBeNull();

    // Al reintentar, la consulta previa evita reinsertar lo que ya consta.
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
    ];
    const retry = await consumePendingLegalAcceptance({
      userId: 'user-1',
      sessionEmail: 'ana@ejemplo.com',
    });

    expect(retry.outcome).toBe('inserted');
    expect(mockInsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ document_type: 'privacy-policy' }),
    );
    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('una versión vigente ya registrada no vuelve a insertarse', async () => {
    await savePendingLegalAcceptance(newIntention);
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
      { document_type: 'privacy-policy', document_version: '2026.1' },
    ];
    acceptanceBuilder();

    const result = await consumePendingLegalAcceptance({
      userId: 'user-1',
      sessionEmail: 'ana@ejemplo.com',
    });

    expect(result.outcome).toBe('complete-nothing-needed');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(await loadPendingLegalAcceptance()).toBeNull();
  });

  it('un fallo de consulta es observable y conserva la intención', async () => {
    await savePendingLegalAcceptance(newIntention);
    failingQueryBuilder();

    await expect(
      consumePendingLegalAcceptance({
        userId: 'user-1',
        sessionEmail: 'ana@ejemplo.com',
      }),
    ).rejects.toBeInstanceOf(LegalAcceptanceQueryError);
    expect(await loadPendingLegalAcceptance()).not.toBeNull();
  });

  it('getMissingCurrentLegalDocuments devuelve solo lo que falta de la versión vigente', async () => {
    // Solo una versión vieja de la Política consta.
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
      { document_type: 'privacy-policy', document_version: '2025.1' },
    ];
    acceptanceBuilder();

    const missing = await getMissingCurrentLegalDocuments('user-1');

    expect(missing).toEqual(['privacy-policy']);
  });

  it('getMissingCurrentLegalDocuments con la versión vigente registrada devuelve lista vacía', async () => {
    acceptedRows = [
      { document_type: 'terms-of-service', document_version: '2026.1' },
      { document_type: 'privacy-policy', document_version: '2026.1' },
    ];
    acceptanceBuilder();

    const missing = await getMissingCurrentLegalDocuments('user-1');

    expect(missing).toEqual([]);
  });

  it('recordLegalAcceptance registra la evidencia con la instantánea aportada', async () => {
    await recordLegalAcceptance({
      documentId: 'terms-of-service',
      documentVersion: '2026.1',
      locale: 'es-ES',
      source: 'invitation-signup',
      appVersion: '0.1.0',
    });

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      document_type: 'terms-of-service',
      document_version: '2026.1',
      app_version: '0.1.0',
      locale: 'es-ES',
      source: 'invitation-signup',
    });
  });

  it('recordLegalAcceptance expone el fallo de inserción sin tragarse el error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'RLS bloquea' } });

    await expect(
      recordLegalAcceptance({
        documentId: 'privacy-policy',
        documentVersion: '2026.1',
        locale: 'es-ES',
        source: 'account-regularization',
        appVersion: '0.1.0',
      }),
    ).rejects.toBeInstanceOf(LegalAcceptanceInsertError);
  });
});
