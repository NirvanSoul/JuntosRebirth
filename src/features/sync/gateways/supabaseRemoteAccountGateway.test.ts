import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchRemoteAccountSnapshot } from '@/features/sync/gateways/supabaseRemoteAccountGateway';

function createMockSupabaseClient(
  overrides: {
    authError?: Error | null;
    authUser?: { id: string } | null;
    spacesData?: Record<string, unknown>[] | null;
    spacesError?: Error | null;
    categoriesData?: Record<string, unknown>[] | null;
    categoriesError?: Error | null;
    seriesData?: Record<string, unknown>[] | null;
    seriesError?: Error | null;
    transactionsData?: Record<string, unknown>[] | null;
    transactionsError?: Error | null;
  } = {},
): SupabaseClient {
  const {
    authError = null,
    authUser = { id: 'user-1' },
    spacesData = [
      { id: 'space-1', name: 'Personal', type: 'personal', currency: 'VES' },
    ],
    spacesError = null,
    categoriesData = [],
    categoriesError = null,
    seriesData = [],
    seriesError = null,
    transactionsData = [],
    transactionsError = null,
  } = overrides;

  const mockFrom = jest.fn((table: string) => {
    if (table === 'spaces') {
      return {
        select: jest.fn().mockReturnValue({
          is: jest.fn().mockResolvedValue({
            data: spacesData,
            error: spacesError,
          }),
        }),
      };
    }
    if (table === 'categories') {
      return {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: categoriesData,
            error: categoriesError,
          }),
        }),
      };
    }
    if (table === 'recurring_transaction_series') {
      return {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: seriesData,
            error: seriesError,
          }),
        }),
      };
    }
    if (table === 'transactions') {
      return {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: transactionsData,
            error: transactionsError,
          }),
        }),
      };
    }
    return {};
  });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: authUser },
        error: authError,
      }),
    },
    from: mockFrom,
  } as unknown as SupabaseClient;
}

describe('supabaseRemoteAccountGateway', () => {
  it('exige sesión activa antes de recuperar los datos remotos', async () => {
    const client = createMockSupabaseClient({ authUser: null });
    await expect(fetchRemoteAccountSnapshot(client)).rejects.toThrow(
      'Debes iniciar sesión antes de restaurar tus datos',
    );
  });

  it('recupera y valida la moneda de cada espacio remoto correctamente', async () => {
    const client = createMockSupabaseClient({
      spacesData: [
        { id: 'space-1', name: 'Personal', type: 'personal', currency: 'VES' },
        { id: 'space-2', name: 'Juntos', type: 'couple', currency: 'EUR' },
      ],
    });

    const snapshot = await fetchRemoteAccountSnapshot(client);

    expect(snapshot.spaces).toEqual([
      {
        remoteId: 'space-1',
        name: 'Personal',
        type: 'personal',
        currency: 'VES',
      },
      {
        remoteId: 'space-2',
        name: 'Juntos',
        type: 'couple',
        currency: 'EUR',
      },
    ]);
  });

  it('lanza un error estructurado explícito ante un espacio remoto con moneda no reconocida (sin cast silencioso)', async () => {
    const client = createMockSupabaseClient({
      spacesData: [
        {
          id: 'space-1',
          name: 'Personal',
          type: 'personal',
          currency: 'INVALID_CURRENCY_XYZ',
        },
      ],
    });

    await expect(fetchRemoteAccountSnapshot(client)).rejects.toThrow(
      '[sync] Moneda no reconocida en espacio remoto space-1: INVALID_CURRENCY_XYZ',
    );
  });
});
