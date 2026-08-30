import { fetchRemoteAccountSnapshot } from '@/features/sync/gateways/juntossRemoteAccountGateway';
import { apiClient } from '@/services/api/juntossApiClient';

jest.mock('@/services/api/juntossApiClient', () => ({
  apiClient: { get: jest.fn() },
}));

const mockedGet = jest.mocked(apiClient.get);

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      spaces: [],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
      ...overrides,
    },
  };
}

describe('juntossRemoteAccountGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('convierte los importes de cadena a entero', async () => {
    mockedGet.mockResolvedValue(
      snapshot({
        transactions: [
          {
            id: 'tx-1',
            spaceId: 'space-1',
            categoryId: 'cat-1',
            // La API los serializa como cadena para no perder precisión.
            amountMinor: '125000',
            currency: 'EUR',
            title: 'Alquiler',
            occurredOn: '2026-08-20',
            type: 'expense',
            recurrence: 'once',
          },
        ],
      }) as never,
    );

    const result = await fetchRemoteAccountSnapshot();

    expect(result.transactions[0]?.amountMinor).toBe(125000);
  });

  it('conserva la nota y la agrupación de recurrencias personalizadas', async () => {
    mockedGet.mockResolvedValue(
      snapshot({
        transactions: [
          {
            id: 'tx-1',
            spaceId: 'space-1',
            categoryId: 'cat-1',
            amountMinor: '100',
            currency: 'EUR',
            title: 'Café',
            occurredOn: '2026-08-20',
            type: 'expense',
            note: 'Con Ana',
            recurrence: 'custom',
            recurrenceGroupId: 'group-9',
            sourceLocalTransactionId: 'local-3',
          },
        ],
      }) as never,
    );

    const [transaction] = (await fetchRemoteAccountSnapshot()).transactions;

    expect(transaction).toMatchObject({
      note: 'Con Ana',
      recurrence: 'custom',
      recurrenceGroupId: 'group-9',
      sourceTransactionId: 'local-3',
    });
  });

  it('trae los presupuestos por moneda de cada categoría', async () => {
    mockedGet.mockResolvedValue(
      snapshot({
        categories: [
          {
            id: 'cat-1',
            spaceId: 'space-1',
            name: 'Ocio',
            budgets: [
              { currency: 'EUR', budgetAmountMinor: '25000' },
              { currency: 'USD', budgetAmountMinor: '30000' },
            ],
          },
        ],
      }) as never,
    );

    // Antes solo existía un presupuesto por categoría y no se sincronizaba.
    expect((await fetchRemoteAccountSnapshot()).categories[0]?.budgets).toEqual(
      [
        { currency: 'EUR', budgetMinor: 25000 },
        { currency: 'USD', budgetMinor: 30000 },
      ],
    );
  });

  it('rechaza una moneda corrupta en vez de propagarla a la interfaz', async () => {
    mockedGet.mockResolvedValue(
      snapshot({
        moneyAccounts: [
          {
            id: 'acc-1',
            spaceId: 'space-1',
            name: 'Revolut',
            primaryCurrency: 'NOPE',
            balances: [],
          },
        ],
      }) as never,
    );

    await expect(fetchRemoteAccountSnapshot()).rejects.toThrow(
      /Integridad comprometida/,
    );
  });

  it('rechaza un tipo de espacio desconocido', async () => {
    mockedGet.mockResolvedValue(
      snapshot({
        spaces: [
          { id: 'space-1', name: 'Raro', type: 'equipo', currency: 'EUR' },
        ],
      }) as never,
    );

    await expect(fetchRemoteAccountSnapshot()).rejects.toThrow(
      /Integridad comprometida/,
    );
  });

  it('devuelve colecciones vacías cuando la cuenta no tiene nada', async () => {
    mockedGet.mockResolvedValue(snapshot() as never);

    await expect(fetchRemoteAccountSnapshot()).resolves.toEqual({
      spaces: [],
      categories: [],
      moneyAccounts: [],
      recurringSeries: [],
      transactions: [],
    });
  });
});
