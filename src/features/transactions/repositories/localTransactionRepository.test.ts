import type { SQLiteDatabase } from 'expo-sqlite';

import {
  archiveLocalTransaction,
  createLocalTransaction,
  createLocalTransactions,
  listLocalTransactions,
  materializeDueRecurringTransactions,
  updateLocalTransaction,
  updateLocalTransactionMoneyAccount,
  updateLocalTransactionNote,
} from '@/features/transactions/repositories/localTransactionRepository';

const mockGetLocalDatabase = jest.fn<Promise<SQLiteDatabase>, []>();

jest.mock('@/lib/storage/localDatabase', () => ({
  getLocalDatabase: () => mockGetLocalDatabase(),
}));

jest.mock('@/lib/storage/localIdentity', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'installation-id'),
}));

jest.mock('@/features/legal/services/authenticatedUser', () => ({
  getAuthenticatedUserId: jest.fn(async () => null),
}));

const mockGetAuthenticatedUserId = jest.requireMock(
  '@/features/legal/services/authenticatedUser',
).getAuthenticatedUserId as jest.Mock;

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

const mockRandomUUID = jest.requireMock('expo-crypto').randomUUID as jest.Mock;

describe('localTransactionRepository', () => {
  // Tipado con `...args` para poder inspeccionar los parámetros del INSERT, no
  // solo cuántas veces se llamó.
  const runAsync = jest.fn(async (..._args: unknown[]) => ({
    changes: 1,
    lastInsertRowId: 0,
  }));
  const getFirstAsync = jest.fn();
  const getAllAsync = jest.fn();
  const withExclusiveTransactionAsync = jest.fn(
    async (task: (transaction: SQLiteDatabase) => Promise<void>) =>
      task(database),
  );
  const database = {
    getFirstAsync,
    getAllAsync,
    runAsync,
    withExclusiveTransactionAsync,
  } as unknown as SQLiteDatabase;
  const draft = {
    spaceId: 'personal',
    categoryId: 'category-id',
    type: 'expense' as const,
    amountMinor: 1250,
    currency: 'EUR' as const,
    title: 'Compra',
    occurredOn: '2026-08-01',
    recurrence: 'once' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-08-04T08:00:00'));
    mockGetLocalDatabase.mockResolvedValue(database);
    mockRandomUUID.mockReturnValue('00000000-0000-4000-8000-000000000002');
    getFirstAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crea y restaura un movimiento con un identificador estable', async () => {
    const createdTransactions = await createLocalTransaction(draft);
    const created = createdTransactions[0]!;
    expect(created).toEqual({
      ...draft,
      id: '00000000-0000-4000-8000-000000000002',
      // Sin sesión de Supabase en el entorno de prueba, la autoría cae al id
      // de instalación, que es el comportamiento esperado en modo invitado.
      createdBy: 'installation-id',
      nextOccurrenceOn: undefined,
      recurrenceGroupId: undefined,
      recurrenceSeriesId: undefined,
      recurrenceStartsOn: undefined,
      updatedAt: expect.any(String),
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transactions'),
      created.id,
      'personal',
      'category-id',
      null,
      'installation-id',
      'expense',
      1250,
      'EUR',
      'Compra',
      '2026-08-01',
      'once',
      null,
      null,
      null,
      expect.any(String),
      expect.any(String),
    );

    getAllAsync.mockResolvedValueOnce([]);
    getAllAsync.mockResolvedValueOnce([
      {
        id: created.id,
        space_id: 'personal',
        category_id: 'category-id',
        money_account_id: null,
        created_by: 'installation-id',
        type: 'expense',
        amount_minor: 1250,
        currency: 'EUR',
        title: 'Compra',
        occurred_on: '2026-08-01',
        recurrence: 'once',
        next_occurrence_on: null,
        recurrence_group_id: null,
        recurrence_series_id: null,
        recurrence_starts_on: null,
        updated_at: created.updatedAt,
      },
    ]);
    await expect(listLocalTransactions()).resolves.toEqual([created]);
  });

  it('firma el movimiento con el uuid de la sesión cuando la hay', async () => {
    mockGetAuthenticatedUserId.mockResolvedValueOnce('uuid-ana');

    const [created] = await createLocalTransaction(draft);

    // Es lo que distingue esta columna de un id de dispositivo: sin el uuid, la
    // otra persona del espacio no puede saber quién creó el movimiento.
    expect(created!.createdBy).toBe('uuid-ana');

    const insertCall = runAsync.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO transactions'),
    );
    expect(insertCall).toContain('uuid-ana');
    expect(insertCall).not.toContain('installation-id');
  });

  it('acepta y restaura un movimiento en una moneda distinta a EUR', async () => {
    const usdDraft = { ...draft, currency: 'USD' as const };
    const createdTransactions = await createLocalTransaction(usdDraft);
    const created = createdTransactions[0]!;
    expect(created.currency).toBe('USD');

    getAllAsync.mockResolvedValueOnce([]);
    getAllAsync.mockResolvedValueOnce([
      {
        id: created.id,
        space_id: 'personal',
        category_id: 'category-id',
        money_account_id: null,
        created_by: 'installation-id',
        type: 'expense',
        amount_minor: 1250,
        currency: 'USD',
        title: 'Compra',
        occurred_on: '2026-08-01',
        recurrence: 'once',
        next_occurrence_on: null,
        recurrence_group_id: null,
        recurrence_series_id: null,
        recurrence_starts_on: null,
        updated_at: created.updatedAt,
      },
    ]);
    await expect(listLocalTransactions()).resolves.toEqual([created]);
  });

  it('rechaza un movimiento con una moneda no reconocida', async () => {
    await expect(
      createLocalTransaction({
        ...draft,
        currency: 'XYZ' as unknown as typeof draft.currency,
      }),
    ).rejects.toThrow('El movimiento local no es válido');
  });

  it('crea una serie quincenal y calcula la próxima fecha a quince días', async () => {
    mockRandomUUID
      .mockReturnValueOnce('series-id')
      .mockReturnValueOnce('transaction-id');

    const createdTransactions = await createLocalTransaction({
      ...draft,
      occurredOn: '2026-07-03',
      recurrence: 'biweekly',
    });
    const created = createdTransactions[0]!;

    expect(created).toMatchObject({
      id: 'transaction-id',
      nextOccurrenceOn: '2026-08-17',
      recurrenceSeriesId: 'series-id',
      recurrenceStartsOn: '2026-07-03',
    });
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO recurring_transaction_series'),
      'series-id',
      'personal',
      'category-id',
      null,
      'installation-id',
      'expense',
      1250,
      'EUR',
      'Compra',
      'biweekly',
      '2026-07-03',
      3,
      '2026-08-17',
      expect.any(String),
      expect.any(String),
    );
  });

  it('crea un movimiento por cada fecha personalizada', async () => {
    mockRandomUUID
      .mockReturnValueOnce('custom-group')
      .mockReturnValueOnce('custom-1')
      .mockReturnValueOnce('custom-2');

    await expect(
      createLocalTransaction({
        ...draft,
        recurrence: 'custom',
        customOccurrenceDates: ['2026-08-20', '2026-08-05'],
      }),
    ).resolves.toMatchObject([
      {
        id: 'custom-1',
        occurredOn: '2026-08-05',
        recurrence: 'custom',
        recurrenceGroupId: 'custom-group',
      },
      {
        id: 'custom-2',
        occurredOn: '2026-08-20',
        recurrence: 'custom',
        recurrenceGroupId: 'custom-group',
      },
    ]);
    expect(runAsync).toHaveBeenCalledTimes(2);
  });

  it('materializa sin duplicar el origen de una serie quincenal migrada', async () => {
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'series-id',
        space_id: 'personal',
        category_id: 'category-id',
        money_account_id: null,
        created_by: 'installation-id',
        type: 'expense',
        amount_minor: 1250,
        currency: 'EUR',
        title: 'Compra',
        frequency: 'biweekly',
        starts_on: '2026-07-03',
        generated_occurrences: 0,
        next_occurrence_on: '2026-07-03',
      },
    ]);
    mockRandomUUID
      .mockReturnValueOnce('original-ignored')
      .mockReturnValueOnce('occurrence-2')
      .mockReturnValueOnce('occurrence-3');

    await materializeDueRecurringTransactions(database, '2026-08-02');

    expect(runAsync).toHaveBeenCalledTimes(4);
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE recurring_transaction_series'),
      3,
      '2026-08-17',
      expect.any(String),
      'series-id',
    );
  });

  it('marca las ediciones y eliminaciones sincronizadas como pendientes', async () => {
    await expect(
      updateLocalTransaction('transaction-id', {
        ...draft,
        title: 'Compra editada',
      }),
    ).resolves.toMatchObject([
      {
        id: 'transaction-id',
        title: 'Compra editada',
        updatedAt: expect.any(String),
      },
    ]);
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ELSE 'pending'"),
      'category-id',
      null,
      'expense',
      1250,
      'EUR',
      'Compra editada',
      '2026-08-01',
      'once',
      expect.any(String),
      'transaction-id',
      'personal',
    );

    await archiveLocalTransaction('transaction-id', 'personal');
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET is_archived = 1'),
      expect.any(String),
      expect.any(String),
      'transaction-id',
      'personal',
    );
  });

  it('guarda y limpia la nota de un movimiento sin tocar el resto de campos', async () => {
    await updateLocalTransactionNote(
      'transaction-id',
      'personal',
      'Comprar también servilletas',
    );
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET note = ?'),
      'Comprar también servilletas',
      expect.any(String),
      'transaction-id',
      'personal',
    );

    await updateLocalTransactionNote('transaction-id', 'personal', null);
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET note = ?'),
      null,
      expect.any(String),
      'transaction-id',
      'personal',
    );

    runAsync.mockResolvedValueOnce({ changes: 0, lastInsertRowId: 0 });
    await expect(
      updateLocalTransactionNote('missing', 'personal', 'Nota'),
    ).rejects.toThrow('El movimiento local ya no está disponible');
  });

  it('convierte una edición personalizada en un grupo de ocurrencias', async () => {
    mockRandomUUID
      .mockReturnValueOnce('edited-custom-group')
      .mockReturnValueOnce('edited-custom-2')
      .mockReturnValueOnce('edited-custom-3');

    await expect(
      updateLocalTransaction('transaction-id', {
        ...draft,
        recurrence: 'custom',
        customOccurrenceDates: ['2026-08-20', '2026-08-05', '2026-08-12'],
      }),
    ).resolves.toMatchObject([
      {
        id: 'transaction-id',
        occurredOn: '2026-08-05',
        recurrenceGroupId: 'edited-custom-group',
      },
      {
        id: 'edited-custom-2',
        occurredOn: '2026-08-12',
        recurrenceGroupId: 'edited-custom-group',
      },
      {
        id: 'edited-custom-3',
        occurredOn: '2026-08-20',
        recurrenceGroupId: 'edited-custom-group',
      },
    ]);
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('recurrence_series_id = NULL'),
      'category-id',
      null,
      'expense',
      1250,
      'EUR',
      'Compra',
      '2026-08-05',
      'edited-custom-group',
      expect.any(String),
      'transaction-id',
      'personal',
    );
    expect(runAsync).toHaveBeenCalledTimes(3);
  });

  it('detiene la serie anterior al convertir una ocurrencia automática en personalizada', async () => {
    getFirstAsync.mockResolvedValueOnce({
      occurred_on: '2026-08-01',
      recurrence: 'monthly',
      recurrence_series_id: 'old-series',
    });
    mockRandomUUID
      .mockReturnValueOnce('custom-group')
      .mockReturnValueOnce('custom-2');

    await updateLocalTransaction('transaction-id', {
      ...draft,
      recurrence: 'custom',
      customOccurrenceDates: ['2026-08-01', '2026-08-20'],
    });

    expect(runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE recurrence_series_id = ?'),
      expect.any(String),
      expect.any(String),
      'old-series',
      '2026-08-01',
      'personal',
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE recurring_transaction_series'),
      expect.any(String),
      expect.any(String),
      'old-series',
      'personal',
    );
  });

  it('crea una serie real al cambiar un movimiento único a recurrencia automática', async () => {
    getFirstAsync.mockResolvedValueOnce({
      occurred_on: '2026-08-01',
      recurrence: 'once',
      recurrence_series_id: null,
    });
    mockRandomUUID.mockReturnValueOnce('new-series');

    await expect(
      updateLocalTransaction('transaction-id', {
        ...draft,
        recurrence: 'monthly',
      }),
    ).resolves.toMatchObject([
      {
        id: 'transaction-id',
        recurrence: 'monthly',
        recurrenceSeriesId: 'new-series',
        recurrenceStartsOn: '2026-08-01',
      },
    ]);
    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO recurring_transaction_series'),
      'new-series',
      'personal',
      'category-id',
      null,
      'installation-id',
      'expense',
      1250,
      'EUR',
      'Compra',
      'monthly',
      '2026-08-01',
      1,
      '2026-09-01',
      expect.any(String),
      expect.any(String),
    );
  });

  it('archiva la serie y sus fechas futuras al convertirla en movimiento único', async () => {
    getFirstAsync.mockResolvedValueOnce({
      occurred_on: '2026-08-01',
      recurrence: 'monthly',
      recurrence_series_id: 'old-series',
    });

    await updateLocalTransaction('transaction-id', draft);

    expect(runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('recurrence_series_id = NULL'),
      'category-id',
      null,
      'expense',
      1250,
      'EUR',
      'Compra',
      '2026-08-01',
      'once',
      expect.any(String),
      'transaction-id',
      'personal',
    );
    expect(runAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE recurring_transaction_series'),
      expect.any(String),
      expect.any(String),
      'old-series',
      'personal',
    );
  });

  it.each(['expense', 'income'] as const)(
    'actualiza desde una ocurrencia recurrente de tipo %s sin reescribir las anteriores',
    async (type) => {
      getFirstAsync.mockResolvedValueOnce({
        occurred_on: '2026-09-01',
        recurrence: 'monthly',
        recurrence_series_id: 'monthly-series',
      });
      getAllAsync.mockResolvedValueOnce([
        {
          id: 'occurrence-10',
          space_id: 'personal',
          category_id: 'category-id',
          money_account_id: null,
          type,
          amount_minor: 1800,
          currency: 'EUR',
          title: 'Cuota actualizada',
          occurred_on: '2026-10-01',
          recurrence: 'monthly',
          next_occurrence_on: '2026-11-01',
          recurrence_group_id: null,
          recurrence_series_id: 'monthly-series',
          recurrence_starts_on: '2026-01-01',
        },
        {
          id: 'occurrence-9',
          space_id: 'personal',
          category_id: 'category-id',
          money_account_id: null,
          type,
          amount_minor: 1800,
          currency: 'EUR',
          title: 'Cuota actualizada',
          occurred_on: '2026-09-01',
          recurrence: 'monthly',
          next_occurrence_on: '2026-11-01',
          recurrence_group_id: null,
          recurrence_series_id: 'monthly-series',
          recurrence_starts_on: '2026-01-01',
        },
      ]);

      await expect(
        updateLocalTransaction('occurrence-9', {
          ...draft,
          type,
          amountMinor: 1800,
          title: 'Cuota actualizada',
          occurredOn: '2026-09-01',
          recurrence: 'monthly',
        }),
      ).resolves.toMatchObject([
        { id: 'occurrence-10', amountMinor: 1800, type },
        { id: 'occurrence-9', amountMinor: 1800, type },
      ]);

      expect(runAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('occurred_on > ?'),
        'category-id',
        null,
        type,
        1800,
        'EUR',
        'Cuota actualizada',
        expect.any(String),
        'monthly-series',
        '2026-09-01',
        'personal',
      );
      expect(runAsync).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE recurring_transaction_series'),
        'category-id',
        null,
        type,
        1800,
        'EUR',
        'Cuota actualizada',
        expect.any(String),
        'monthly-series',
        'personal',
      );
    },
  );

  it('materializa una ocurrencia futura al editarla y aplica el cambio desde esa fecha', async () => {
    getFirstAsync
      .mockResolvedValueOnce({
        id: 'monthly-series',
        space_id: 'personal',
        category_id: 'category-id',
        money_account_id: null,
        created_by: 'installation-id',
        type: 'income',
        amount_minor: 250_000,
        currency: 'EUR',
        title: 'Nómina',
        frequency: 'monthly',
        starts_on: '2026-08-05',
        generated_occurrences: 1,
        next_occurrence_on: '2026-09-05',
      })
      .mockResolvedValueOnce({ id: 'materialized-november' })
      .mockResolvedValueOnce({
        occurred_on: '2026-11-05',
        recurrence: 'monthly',
        recurrence_series_id: 'monthly-series',
      });
    getAllAsync.mockResolvedValueOnce([
      {
        id: 'materialized-november',
        space_id: 'personal',
        category_id: 'category-id',
        money_account_id: null,
        type: 'income',
        amount_minor: 275_000,
        currency: 'EUR',
        title: 'Nómina actualizada',
        occurred_on: '2026-11-05',
        recurrence: 'monthly',
        next_occurrence_on: '2026-12-05',
        recurrence_group_id: null,
        recurrence_series_id: 'monthly-series',
        recurrence_starts_on: '2026-08-05',
      },
    ]);

    await expect(
      updateLocalTransaction('projected-occurrence:monthly-series:2026-11-05', {
        ...draft,
        type: 'income',
        amountMinor: 275_000,
        title: 'Nómina actualizada',
        occurredOn: '2026-11-05',
        recurrence: 'monthly',
      }),
    ).resolves.toMatchObject([
      {
        id: 'materialized-november',
        amountMinor: 275_000,
        occurredOn: '2026-11-05',
      },
    ]);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO transactions'),
      expect.any(String),
      'personal',
      'category-id',
      null,
      'installation-id',
      'income',
      250_000,
      'EUR',
      'Nómina',
      '2026-09-05',
      'monthly',
      'monthly-series',
      expect.any(String),
      expect.any(String),
    );
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE recurring_transaction_series'),
      'category-id',
      null,
      'income',
      275_000,
      'EUR',
      'Nómina actualizada',
      expect.any(String),
      'monthly-series',
      'personal',
    );
  });

  it('rechaza importes no representables en unidades menores', async () => {
    await expect(
      createLocalTransaction({ ...draft, amountMinor: 1.5 }),
    ).rejects.toThrow('El movimiento local no es válido');
    expect(runAsync).not.toHaveBeenCalled();
  });

  describe('cuenta asignada', () => {
    const accountDraft = { ...draft, moneyAccountId: 'account-1' };

    it('guarda y restaura la cuenta del movimiento', async () => {
      getFirstAsync.mockResolvedValueOnce({ currency: 'EUR' });

      const [created] = await createLocalTransaction(accountDraft);

      expect(created!.moneyAccountId).toBe('account-1');
      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        created!.id,
        'personal',
        'category-id',
        'account-1',
        'installation-id',
        'expense',
        1250,
        'EUR',
        'Compra',
        '2026-08-01',
        'once',
        null,
        null,
        null,
        expect.any(String),
        expect.any(String),
      );

      getAllAsync.mockResolvedValueOnce([]);
      getAllAsync.mockResolvedValueOnce([
        {
          id: created!.id,
          space_id: 'personal',
          category_id: 'category-id',
          money_account_id: 'account-1',
          created_by: 'installation-id',
          type: 'expense',
          amount_minor: 1250,
          currency: 'EUR',
          title: 'Compra',
          occurred_on: '2026-08-01',
          recurrence: 'once',
          next_occurrence_on: null,
          recurrence_group_id: null,
          recurrence_series_id: null,
          recurrence_starts_on: null,
          updated_at: created!.updatedAt,
        },
      ]);

      await expect(listLocalTransactions()).resolves.toEqual([created]);
    });

    // La foránea local es de una sola columna, así que esta guarda ocupa el
    // lugar de la clave compuesta que sí protege a `category_id`.
    it('rechaza una cuenta que no pertenece al espacio del movimiento', async () => {
      getFirstAsync.mockResolvedValueOnce(undefined);

      await expect(createLocalTransaction(accountDraft)).rejects.toThrow(
        'La cuenta no pertenece a este espacio',
      );
      expect(runAsync).not.toHaveBeenCalled();
    });

    it('rechaza un movimiento en una moneda distinta a la de su cuenta', async () => {
      getFirstAsync.mockResolvedValueOnce({ currency: 'USD' });

      await expect(createLocalTransaction(accountDraft)).rejects.toThrow(
        'El movimiento debe usar la moneda de su cuenta',
      );
      expect(runAsync).not.toHaveBeenCalled();
    });

    it('no consulta la cuenta cuando el movimiento no lleva ninguna', async () => {
      await createLocalTransaction(draft);

      expect(getFirstAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('money_accounts'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('hereda la cuenta de la serie en cada ocurrencia materializada', async () => {
      getAllAsync.mockResolvedValueOnce([
        {
          id: 'series-id',
          space_id: 'personal',
          category_id: 'category-id',
          money_account_id: 'account-1',
          created_by: 'installation-id',
          type: 'expense',
          amount_minor: 1250,
          currency: 'EUR',
          title: 'Compra',
          frequency: 'monthly',
          starts_on: '2026-06-01',
          generated_occurrences: 1,
          next_occurrence_on: '2026-07-01',
        },
      ]);

      await materializeDueRecurringTransactions(database, '2026-07-01');

      expect(runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO transactions'),
        expect.any(String),
        'personal',
        'category-id',
        'account-1',
        'installation-id',
        'expense',
        1250,
        'EUR',
        'Compra',
        '2026-07-01',
        'monthly',
        'series-id',
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('updateLocalTransactionMoneyAccount', () => {
    it('asigna una cuenta sin tocar el resto del movimiento', async () => {
      getFirstAsync
        .mockResolvedValueOnce({ currency: 'EUR' })
        .mockResolvedValueOnce({ currency: 'EUR' });

      await updateLocalTransactionMoneyAccount(
        'transaction-id',
        'personal',
        'account-1',
      );

      const [sql, ...params] = runAsync.mock.calls[0] as unknown as [
        string,
        ...unknown[],
      ];
      expect(sql).toContain('SET money_account_id = ?');
      expect(sql).not.toContain('amount_minor');
      expect(params).toEqual([
        'account-1',
        expect.any(String),
        'transaction-id',
        'personal',
      ]);
    });

    it('retira la cuenta cuando se elige ninguna', async () => {
      getFirstAsync.mockResolvedValueOnce({ currency: 'EUR' });

      await updateLocalTransactionMoneyAccount(
        'transaction-id',
        'personal',
        null,
      );

      const [, moneyAccountId] = runAsync.mock.calls[0] as unknown as [
        string,
        unknown,
      ];
      expect(moneyAccountId).toBeNull();
    });

    it('rechaza una cuenta en otra moneda que la del movimiento', async () => {
      getFirstAsync
        .mockResolvedValueOnce({ currency: 'EUR' })
        .mockResolvedValueOnce({ currency: 'USD' });

      await expect(
        updateLocalTransactionMoneyAccount(
          'transaction-id',
          'personal',
          'account-1',
        ),
      ).rejects.toThrow('El movimiento debe usar la moneda de su cuenta');
      expect(runAsync).not.toHaveBeenCalled();
    });

    it('avisa cuando el movimiento ya no existe', async () => {
      getFirstAsync.mockResolvedValueOnce(undefined);

      await expect(
        updateLocalTransactionMoneyAccount('transaction-id', 'personal', null),
      ).rejects.toThrow('El movimiento local ya no está disponible');
    });
  });

  describe('createLocalTransactions', () => {
    it('inserta varios movimientos en una sola transacción exclusiva', async () => {
      mockRandomUUID
        .mockReturnValueOnce('00000000-0000-4000-8000-000000000010')
        .mockReturnValueOnce('00000000-0000-4000-8000-000000000011');

      const created = await createLocalTransactions([
        draft,
        { ...draft, amountMinor: 500, occurredOn: '2026-08-02' },
      ]);

      expect(created).toHaveLength(2);
      expect(created[0]!.id).toBe('00000000-0000-4000-8000-000000000010');
      expect(created[1]!.id).toBe('00000000-0000-4000-8000-000000000011');
      expect(withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
      expect(runAsync).toHaveBeenCalledTimes(2);
      expect(runAsync).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO transactions'),
        '00000000-0000-4000-8000-000000000010',
        'personal',
        'category-id',
        null,
        'installation-id',
        'expense',
        1250,
        'EUR',
        'Compra',
        '2026-08-01',
        'once',
        null,
        null,
        null,
        expect.any(String),
        expect.any(String),
      );
    });

    it('no inserta nada si alguna fila del lote no es válida', async () => {
      await expect(
        createLocalTransactions([draft, { ...draft, amountMinor: 0 }]),
      ).rejects.toThrow('El movimiento local no es válido');
      expect(withExclusiveTransactionAsync).not.toHaveBeenCalled();
      expect(runAsync).not.toHaveBeenCalled();
    });

    it('rechaza movimientos con recurrencia distinta de "once"', async () => {
      await expect(
        createLocalTransactions([{ ...draft, recurrence: 'monthly' }]),
      ).rejects.toThrow(
        'La creación en lote solo admite movimientos sin recurrencia',
      );
      expect(withExclusiveTransactionAsync).not.toHaveBeenCalled();
    });

    it('devuelve un array vacío sin tocar la base de datos', async () => {
      await expect(createLocalTransactions([])).resolves.toEqual([]);
      expect(mockGetLocalDatabase).not.toHaveBeenCalled();
    });
  });
});
