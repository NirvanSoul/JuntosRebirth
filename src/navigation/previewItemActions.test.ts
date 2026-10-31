import type { MoneyAccount } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { SessionTransaction } from '@/features/transactions/types';
import { indexCopiedTransactionSpaces } from '@/features/transactions/utils/transactionCopyIdentity';
import { createProjectedTransactionId } from '@/features/transactions/utils/transactionRecurrence';
import { resolvePreviewItemActions } from '@/navigation/previewItemActions';

const category: Category = {
  id: 'category-1',
  spaceId: 'personal',
  name: 'Comida',
  icon: 'dots-three-circle',
  colorToken: 'slate',
  isDefault: false,
  isArchived: false,
};

const moneyAccount: MoneyAccount = {
  id: 'account-1',
  spaceId: 'personal',
  name: 'Efectivo',
  kind: 'cash',
  icon: 'money',
  colorToken: 'forest',
  balances: [{ currency: 'EUR', openingBalanceMinor: 0 }],
  isArchived: false,
};

const transaction: SessionTransaction = {
  amountMinor: 500,
  categoryId: 'category-1',
  createdBy: 'user-1',
  currency: 'EUR',
  id: 'transaction-1',
  nextOccurrenceOn: '2026-11-03',
  occurredOn: '2026-10-03',
  recurrence: 'monthly',
  recurrenceSeriesId: 'series-1',
  recurrenceStartsOn: '2026-10-03',
  spaceId: 'personal',
  title: '',
  type: 'expense',
  updatedAt: '2026-10-03T12:00:00.000Z',
};

function createSource(
  overrides: Partial<Parameters<typeof resolvePreviewItemActions>[1]> = {},
) {
  return {
    categories: [category],
    copiedSpaceIds: indexCopiedTransactionSpaces([]),
    moneyAccounts: [moneyAccount],
    onArchiveCategory: jest.fn(),
    onArchiveMoneyAccount: jest.fn(),
    onCopyCategory: jest.fn(() => Promise.resolve(true)),
    onCopyTransaction: jest.fn(() => Promise.resolve(true)),
    onDeleteTransaction: jest.fn(),
    onEditCategory: jest.fn(),
    onEditMoneyAccount: jest.fn(),
    onEditTransaction: jest.fn(),
    shareTargets: [{ id: 'couple', name: 'Pareja' }],
    transactions: [transaction],
    ...overrides,
  };
}

const keysOf = (actions: ReturnType<typeof resolvePreviewItemActions>) =>
  actions?.map((action) => action.key);

describe('resolvePreviewItemActions', () => {
  it('ofrece eliminar, editar y copiar un movimiento y ejecuta los manejadores', () => {
    const source = createSource();
    const actions = resolvePreviewItemActions(
      { kind: 'transaction', ids: ['transaction-1'] },
      source,
    );

    expect(keysOf(actions)).toEqual(['delete', 'edit', 'copy']);
    const [remove, edit, copy] = actions!;
    if (remove!.kind === 'confirm') remove!.onConfirm();
    if (edit!.kind === 'run') edit!.onPress();
    expect(source.onDeleteTransaction).toHaveBeenCalledWith('transaction-1');
    expect(source.onEditTransaction).toHaveBeenCalledWith(transaction);
    // Sin título, la copia se nombra como la categoría, igual que el detalle.
    expect(copy!.kind === 'copyToSpace' && copy!.request.itemName).toBe(
      'Comida',
    );
  });

  it('elimina y copia varios movimientos juntos, sin ofrecer editar', async () => {
    const second = {
      ...transaction,
      id: 'transaction-2',
      recurrenceSeriesId: 'series-2',
    };
    const source = createSource({ transactions: [transaction, second] });
    const actions = resolvePreviewItemActions(
      { kind: 'transaction', ids: ['transaction-1', 'transaction-2'] },
      source,
    );

    expect(keysOf(actions)).toEqual(['delete', 'copy']);
    const [remove, copy] = actions!;
    expect(remove!.kind === 'confirm' && remove!.confirmation.title).toBe(
      '¿Eliminar 2 movimientos?',
    );
    if (remove!.kind === 'confirm') remove!.onConfirm();
    await Promise.resolve();
    expect(source.onDeleteTransaction).toHaveBeenNthCalledWith(
      1,
      'transaction-1',
    );
    expect(source.onDeleteTransaction).toHaveBeenNthCalledWith(
      2,
      'transaction-2',
    );
    if (copy!.kind !== 'copyToSpace') throw new Error('Se esperaba copiar');
    expect(copy!.request.itemName).toBe('2 movimientos');
    expect(copy!.request.stackedItems).toHaveLength(2);
    expect(copy!.request.renderItemIcon).toBeUndefined();
    void copy!.request.onSelect('space-2');
    expect(source.onCopyTransaction).toHaveBeenCalledWith(
      ['transaction-1', 'transaction-2'],
      'space-2',
    );
  });

  it('apila como mucho cinco iconos al copiar muchos movimientos', () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      ...transaction,
      id: `transaction-${index + 1}`,
      recurrenceSeriesId: `series-${index + 1}`,
    }));
    const actions = resolvePreviewItemActions(
      { kind: 'transaction', ids: many.map(({ id }) => id) },
      createSource({ transactions: many }),
    );
    const copy = actions?.find((action) => action.key === 'copy');

    expect(
      copy?.kind === 'copyToSpace' && copy.request.stackedItems,
    ).toHaveLength(5);
  });

  it('no agrupa categorías ni cuentas', () => {
    expect(
      resolvePreviewItemActions(
        { kind: 'category', ids: ['category-1', 'category-1'] },
        createSource(),
      ),
    ).toBeNull();
  });

  it('no copia una repetición proyectada y avisa de que solo se omite esa fecha', () => {
    const actions = resolvePreviewItemActions(
      {
        kind: 'transaction',
        ids: [createProjectedTransactionId('series-1', '2026-11-03')],
      },
      createSource(),
    );

    expect(keysOf(actions)).toEqual(['delete', 'edit']);
    expect(
      actions![0]!.kind === 'confirm' && actions![0]!.confirmation.title,
    ).toBe('¿Eliminar esta repetición?');
  });

  it('no copia dos repeticiones de la misma serie, que duplicarían la serie en el destino', () => {
    const september = {
      ...transaction,
      id: 'transaction-september',
      occurredOn: '2026-09-03',
    };
    const source = createSource({ transactions: [september, transaction] });
    const single = resolvePreviewItemActions(
      { kind: 'transaction', ids: ['transaction-1'] },
      source,
    );
    const both = resolvePreviewItemActions(
      { kind: 'transaction', ids: ['transaction-september', 'transaction-1'] },
      source,
    );

    expect(single?.find((action) => action.key === 'copy')?.selectionKey).toBe(
      'series:series-1',
    );
    expect(keysOf(both)).toEqual(['delete']);
  });

  it('no ofrece copiar a un espacio donde la serie ya está copiada', () => {
    const september = {
      ...transaction,
      id: 'transaction-september',
      occurredOn: '2026-09-03',
    };
    const copy = {
      ...transaction,
      id: 'copy-1',
      spaceId: 'couple',
      recurrenceSeriesId: 'series-copy',
      sourceTransactionId: 'transaction-1',
    };
    const actions = resolvePreviewItemActions(
      { kind: 'transaction', ids: ['transaction-september'] },
      createSource({
        copiedSpaceIds: indexCopiedTransactionSpaces([
          september,
          transaction,
          copy,
        ]),
        transactions: [september, transaction],
      }),
    );

    expect(keysOf(actions)).toEqual(['delete', 'edit']);
  });

  it('omite copiar cuando no hay otro espacio', () => {
    const actions = resolvePreviewItemActions(
      { kind: 'category', ids: ['category-1'] },
      createSource({ shareTargets: [] }),
    );

    expect(keysOf(actions)).toEqual(['delete', 'edit']);
  });

  it('ofrece eliminar y editar una cuenta, sin copiarla', () => {
    const source = createSource();
    const actions = resolvePreviewItemActions(
      { kind: 'moneyAccount', ids: ['account-1'] },
      source,
    );

    expect(keysOf(actions)).toEqual(['delete', 'edit']);
    const [deleteAction, editAction] = actions!;
    if (deleteAction?.kind === 'confirm') deleteAction.onConfirm();
    if (editAction?.kind === 'run') editAction.onPress();
    expect(source.onArchiveMoneyAccount).toHaveBeenCalledWith('account-1');
    expect(source.onEditMoneyAccount).toHaveBeenCalledWith('account-1');
    expect(
      resolvePreviewItemActions(
        { kind: 'moneyAccount', ids: ['account-1'] },
        createSource({
          moneyAccounts: [{ ...moneyAccount, isArchived: true }],
        }),
      ),
    ).toBeNull();
  });

  it('no ofrece acciones para elementos archivados o de otro espacio', () => {
    const source = createSource({
      categories: [{ ...category, isArchived: true }],
    });

    expect(
      resolvePreviewItemActions(
        { kind: 'category', ids: ['category-1'] },
        source,
      ),
    ).toBeNull();
    expect(
      resolvePreviewItemActions(
        { kind: 'transaction', ids: ['missing'] },
        source,
      ),
    ).toBeNull();
  });
});
