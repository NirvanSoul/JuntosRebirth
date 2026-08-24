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
  pendingLegalAcceptanceStorageKeyForEmail,
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
  user_id: string;
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
  // Aísla por `user_id` como la tabla real: las filas de otro usuario no
  // contaminan la consulta de esta sesión.
  const eq = jest.fn().mockReturnThis();
  const builder = {
    eq,
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve().then(() => {
        // `.eq(field, value)`: el valor filtrado es el segundo argumento.
        const targetUserId = eq.mock.calls[eq.mock.calls.length - 1]?.[1];
        resolve({
          data:
            typeof targetUserId === 'string'
              ? acceptedRows.filter((row) => row.user_id === targetUserId)
              : acceptedRows,
          error: null,
        });
      }),
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
        user_id: String(row.user_id),
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
        user_id: 'user-1',
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
    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).toBeNull();
  });

  it('una intención de otro correo jamás se aplica a la sesión actual (B8)', async () => {
    await savePendingLegalAcceptance(newIntention);

    const result = await consumePendingLegalAcceptance({
      userId: 'user-2',
      sessionEmail: 'otra@ejemplo.com',
    });

    // Cada correo tiene su propia ranura: la sesión de «otra» no encuentra la
    // intención de «ana» ni la toca.
    expect(result.outcome).toBe('no-intention');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).not.toBeNull();
  });

  it('una intención escrita bajo una clave ajena con otro correo es un fallo observable', async () => {
    // Almacenamiento manipulado: una intención de «otra» bajo la clave de
    // «ana». El guard sigue siendo necesario: algo así nunca se aplica.
    await AsyncStorage.setItem(
      pendingLegalAcceptanceStorageKeyForEmail('ana@ejemplo.com'),
      JSON.stringify({
        version: 1,
        email: 'otra@ejemplo.com',
        locale: 'es-ES',
        source: 'access-signup',
        appVersion: '0.1.0',
        documents: newIntention.documents,
      }),
    );

    await expect(
      consumePendingLegalAcceptance({
        userId: 'user-ana',
        sessionEmail: 'ana@ejemplo.com',
      }),
    ).rejects.toBeInstanceOf(LegalAcceptanceEmailMismatchError);
    expect(mockInsert).not.toHaveBeenCalled();
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
          user_id: String(row.user_id),
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
    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).not.toBeNull();

    // Al reintentar, la consulta previa evita reinsertar lo que ya consta.
    acceptedRows = [
      {
        user_id: 'user-1',
        document_type: 'terms-of-service',
        document_version: '2026.1',
      },
    ];
    const retry = await consumePendingLegalAcceptance({
      userId: 'user-1',
      sessionEmail: 'ana@ejemplo.com',
    });

    expect(retry.outcome).toBe('inserted');
    expect(mockInsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ document_type: 'privacy-policy' }),
    );
    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).toBeNull();
  });

  it('una versión vigente ya registrada no vuelve a insertarse', async () => {
    await savePendingLegalAcceptance(newIntention);
    acceptedRows = [
      {
        user_id: 'user-1',
        document_type: 'terms-of-service',
        document_version: '2026.1',
      },
      {
        user_id: 'user-1',
        document_type: 'privacy-policy',
        document_version: '2026.1',
      },
    ];
    acceptanceBuilder();

    const result = await consumePendingLegalAcceptance({
      userId: 'user-1',
      sessionEmail: 'ana@ejemplo.com',
    });

    expect(result.outcome).toBe('complete-nothing-needed');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).toBeNull();
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
    expect(await loadPendingLegalAcceptance('ana@ejemplo.com')).not.toBeNull();
  });

  it('getMissingCurrentLegalDocuments devuelve solo lo que falta de la versión vigente', async () => {
    // Solo una versión vieja de la Política consta.
    acceptedRows = [
      {
        user_id: 'user-1',
        document_type: 'terms-of-service',
        document_version: '2026.1',
      },
      {
        user_id: 'user-1',
        document_type: 'privacy-policy',
        document_version: '2025.1',
      },
    ];
    acceptanceBuilder();

    const missing = await getMissingCurrentLegalDocuments('user-1');

    expect(missing).toEqual(['privacy-policy']);
  });

  it('getMissingCurrentLegalDocuments con la versión vigente registrada devuelve lista vacía', async () => {
    acceptedRows = [
      {
        user_id: 'user-1',
        document_type: 'terms-of-service',
        document_version: '2026.1',
      },
      {
        user_id: 'user-1',
        document_type: 'privacy-policy',
        document_version: '2026.1',
      },
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

  it('consume una intención solo para su correo: B no pisa a A y A puede consumirse después (B8)', async () => {
    const ana: PendingLegalAcceptanceNew = newIntention;
    const beta: PendingLegalAcceptanceNew = {
      ...newIntention,
      email: 'beta@ejemplo.com',
    };
    await savePendingLegalAcceptance(ana);
    await savePendingLegalAcceptance(beta);
    acceptanceBuilder();

    const betaResult = await consumePendingLegalAcceptance({
      userId: 'user-beta',
      sessionEmail: 'beta@ejemplo.com',
    });
    expect(betaResult.outcome).toBe('inserted');

    // La intención de A sigue viva: su titular aún puede verificar su cuenta en
    // este móvil (B1) sin que el registro de otra persona se la haya arrebatado.
    const anaResult = await consumePendingLegalAcceptance({
      userId: 'user-ana',
      sessionEmail: 'ana@ejemplo.com',
    });
    expect(anaResult.outcome).toBe('inserted');
  });
});
