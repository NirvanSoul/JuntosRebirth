import { act, renderHook } from '@testing-library/react-native';

import type { MoneyAccount } from '@/features/accounts/types';
import { createLocalCategories } from '@/features/categories/repositories/localCategoryRepository';
import type { Category } from '@/features/categories/types';
import { useTransactionSubmit } from '@/features/transactions/hooks/useTransactionSubmit';
import {
  createLocalTransaction,
  createLocalTransactions,
} from '@/features/transactions/repositories/localTransactionRepository';
import { reconcileNotificationRules } from '@/features/transactions/services/notificationRuleService';
import type {
  CreateTransactionDraft,
  SessionTransaction,
} from '@/features/transactions/types';

jest.mock(
  '@/features/transactions/repositories/localTransactionRepository',
  () => ({
    createLocalTransaction: jest.fn(),
    createLocalTransactions: jest.fn(),
  }),
);
jest.mock('@/features/categories/repositories/localCategoryRepository', () => ({
  createLocalCategories: jest.fn(),
}));
jest.mock('@/features/transactions/services/notificationRuleService', () => ({
  reconcileNotificationRules: jest.fn(async () => undefined),
}));
jest.mock('@/lib/date/localDate', () => ({
  getLocalTodayKey: () => '2026-09-22',
}));

const mockedCreateOne = jest.mocked(createLocalTransaction);
const mockedCreateMany = jest.mocked(createLocalTransactions);
const mockedCreateCategories = jest.mocked(createLocalCategories);

const foodCategory: Category = {
  id: 'food',
  spaceId: 'space-1',
  name: 'Comida',
  icon: 'money',
  colorToken: 'green',
  isDefault: false,
  isArchived: false,
};
const exchangeCategory: Category = {
  id: 'exchange',
  spaceId: 'space-1',
  name: 'Cambio de divisa',
  icon: 'coins',
  colorToken: 'teal',
  isDefault: true,
  templateKey: 'currency-exchange',
  isArchived: false,
};
const bankAccount: MoneyAccount = {
  id: 'bank',
  spaceId: 'space-1',
  name: 'Banco',
  kind: 'bank',
  icon: 'bank',
  colorToken: 'blue',
  balances: [{ currency: 'USD', openingBalanceMinor: 0 }],
  isArchived: false,
};
const draft: CreateTransactionDraft = {
  spaceId: 'space-1',
  type: 'expense',
  amountMinor: 1_000,
  currency: 'USD',
  title: 'Café',
  categoryId: 'food',
  occurredOn: '2026-09-22',
  recurrence: 'once',
};

function sessionTransaction(
  overrides: Partial<SessionTransaction>,
): SessionTransaction {
  return {
    ...draft,
    id: 'tx',
    createdBy: 'uuid-ana',
    updatedAt: '2026-09-22T12:00:00.000Z',
    ...overrides,
  };
}

async function setup(
  overrides: Partial<Parameters<typeof useTransactionSubmit>[0]> = {},
) {
  const callbacks = {
    applyTransactionUpdate: jest.fn(async () => null),
    ensureCurrency: jest.fn(async () => true),
    onCategoriesCreated: jest.fn(),
    onChangesPublished: jest.fn(),
    onError: jest.fn(),
    onTransactionSaved: jest.fn(),
    setTransactions: jest.fn(),
  };
  const { result } = await renderHook(() =>
    useTransactionSubmit({
      activeSpaceId: 'space-1',
      categories: [foodCategory],
      editingTransactionId: null,
      moneyAccounts: [bankAccount],
      ...callbacks,
      ...overrides,
    }),
  );

  return { callbacks, result };
}

describe('useTransactionSubmit', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('submitTransaction', () => {
    it('crea el movimiento, publica y cierra el formulario', async () => {
      const created = [sessionTransaction({ id: 'tx-1' })];
      mockedCreateOne.mockResolvedValueOnce(created);
      const { callbacks, result } = await setup();

      await act(() => result.current.submitTransaction(draft));

      expect(mockedCreateOne).toHaveBeenCalledWith(draft);
      const update = callbacks.setTransactions.mock.calls[0]![0];
      expect(update([sessionTransaction({ id: 'old' })])).toEqual([
        created[0],
        sessionTransaction({ id: 'old' }),
      ]);
      expect(reconcileNotificationRules).toHaveBeenCalled();
      expect(callbacks.onChangesPublished).toHaveBeenCalledTimes(1);
      expect(callbacks.onTransactionSaved).toHaveBeenCalledWith('created');
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('rechaza una categoría inexistente sin tocar el repositorio', async () => {
      const { callbacks, result } = await setup();

      await act(() =>
        result.current.submitTransaction({ ...draft, categoryId: 'missing' }),
      );

      expect(mockedCreateOne).not.toHaveBeenCalled();
      expect(callbacks.onError).toHaveBeenCalledTimes(1);
    });

    it('añade la divisa a la cuenta antes de crear y aborta si no puede', async () => {
      const { callbacks, result } = await setup({
        ensureCurrency: jest.fn(async () => false),
      });

      await act(() =>
        result.current.submitTransaction({
          ...draft,
          currency: 'VES',
          moneyAccountId: 'bank',
        }),
      );

      expect(callbacks.onError).toHaveBeenCalledTimes(1);
      expect(mockedCreateOne).not.toHaveBeenCalled();
    });

    it('en edición delega en applyTransactionUpdate', async () => {
      const applyTransactionUpdate = jest.fn(async () =>
        sessionTransaction({ id: 'tx-1' }),
      );
      const { callbacks, result } = await setup({
        applyTransactionUpdate,
        editingTransactionId: 'tx-1',
      });

      await act(() => result.current.submitTransaction(draft));

      expect(applyTransactionUpdate).toHaveBeenCalledWith('tx-1', draft);
      expect(mockedCreateOne).not.toHaveBeenCalled();
      expect(callbacks.onTransactionSaved).toHaveBeenCalledWith('updated');
    });
  });

  describe('submitCurrencyExchange', () => {
    const submission = {
      operation: 'BUY_USD' as const,
      expense: {
        amountMinor: 40_000,
        currency: 'VES' as const,
        moneyAccountId: 'bank',
      },
      income: { amountMinor: 1_000, currency: 'USD' as const },
    };

    it('crea la categoría de cambio si falta y los dos movimientos en un lote', async () => {
      mockedCreateCategories.mockResolvedValueOnce([exchangeCategory]);
      mockedCreateMany.mockResolvedValueOnce([
        sessionTransaction({ id: 'ves' }),
        sessionTransaction({ id: 'usd' }),
      ]);
      const { callbacks, result } = await setup();

      let saved = false;
      await act(async () => {
        saved = await result.current.submitCurrencyExchange(submission);
      });

      expect(saved).toBe(true);
      expect(callbacks.ensureCurrency).toHaveBeenCalledWith('bank', 'VES');
      expect(mockedCreateCategories).toHaveBeenCalledWith([
        expect.objectContaining({
          spaceId: 'space-1',
          name: 'Cambio de divisa',
          templateKey: 'currency-exchange',
        }),
      ]);
      expect(callbacks.onCategoriesCreated).toHaveBeenCalledWith([
        exchangeCategory,
      ]);
      expect(mockedCreateMany).toHaveBeenCalledWith([
        {
          spaceId: 'space-1',
          type: 'expense',
          amountMinor: 40_000,
          currency: 'VES',
          title: 'Compra de dólares',
          categoryId: 'exchange',
          moneyAccountId: 'bank',
          occurredOn: '2026-09-22',
          recurrence: 'once',
        },
        {
          spaceId: 'space-1',
          type: 'income',
          amountMinor: 1_000,
          currency: 'USD',
          title: 'Compra de dólares',
          categoryId: 'exchange',
          moneyAccountId: undefined,
          occurredOn: '2026-09-22',
          recurrence: 'once',
        },
      ]);
      expect(callbacks.setTransactions).toHaveBeenCalledTimes(1);
      expect(callbacks.onChangesPublished).toHaveBeenCalledTimes(1);
      expect(callbacks.onTransactionSaved).not.toHaveBeenCalled();
    });

    it('reutiliza la categoría de cambio existente y titula la venta', async () => {
      mockedCreateMany.mockResolvedValueOnce([]);
      const { result } = await setup({
        categories: [foodCategory, exchangeCategory],
      });

      await act(async () => {
        await result.current.submitCurrencyExchange({
          ...submission,
          operation: 'SELL_USD',
        });
      });

      expect(mockedCreateCategories).not.toHaveBeenCalled();
      expect(mockedCreateMany).toHaveBeenCalledWith([
        expect.objectContaining({
          categoryId: 'exchange',
          title: 'Venta de dólares',
        }),
        expect.objectContaining({
          categoryId: 'exchange',
          title: 'Venta de dólares',
        }),
      ]);
    });

    it('devuelve false y avisa cuando el lote falla', async () => {
      mockedCreateMany.mockRejectedValueOnce(new Error('sqlite'));
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const { callbacks, result } = await setup({
        categories: [foodCategory, exchangeCategory],
      });

      let saved = true;
      await act(async () => {
        saved = await result.current.submitCurrencyExchange(submission);
      });

      expect(saved).toBe(false);
      expect(callbacks.onError).toHaveBeenCalledTimes(1);
      expect(callbacks.setTransactions).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('no crea nada si no puede asegurar la divisa en la cuenta', async () => {
      const { callbacks, result } = await setup({
        categories: [foodCategory, exchangeCategory],
        ensureCurrency: jest.fn(async () => false),
      });

      let saved = true;
      await act(async () => {
        saved = await result.current.submitCurrencyExchange(submission);
      });

      expect(saved).toBe(false);
      expect(mockedCreateMany).not.toHaveBeenCalled();
      expect(callbacks.onError).toHaveBeenCalledTimes(1);
    });
  });
});
