import type { SessionTransaction } from '@/features/transactions/types';
import {
  getTransactionCopyKey,
  getTransactionCopyTargets,
  indexCopiedTransactionSpaces,
} from '@/features/transactions/utils/transactionCopyIdentity';

const rent: SessionTransaction = {
  amountMinor: 80000,
  categoryId: 'category-home',
  createdBy: 'user-1',
  currency: 'EUR',
  id: 'rent-october',
  occurredOn: '2026-10-01',
  recurrence: 'monthly',
  recurrenceSeriesId: 'series-rent',
  spaceId: 'couple',
  title: 'Casa',
  type: 'expense',
  updatedAt: '2026-10-01T12:00:00.000Z',
};
const rentSeptember = {
  ...rent,
  id: 'rent-september',
  occurredOn: '2026-09-01',
};
const coffee: SessionTransaction = {
  ...rent,
  id: 'coffee',
  recurrence: 'once',
  recurrenceSeriesId: undefined,
  title: 'Café',
};
const targets = [
  { id: 'personal', name: 'Personal' },
  { id: 'trip', name: 'Viaje' },
];

describe('getTransactionCopyKey', () => {
  it('trata todas las repeticiones de una serie automática como la misma copia', () => {
    expect(getTransactionCopyKey(rent)).toBe('series:series-rent');
    expect(getTransactionCopyKey(rentSeptember)).toBe('series:series-rent');
  });

  it('identifica por sí mismo un movimiento suelto o de fechas personalizadas', () => {
    expect(getTransactionCopyKey(coffee)).toBe('coffee');
    expect(
      getTransactionCopyKey({
        ...rent,
        recurrence: 'custom',
        recurrenceGroupId: 'group-1',
      }),
    ).toBe('rent-october');
  });
});

describe('indexCopiedTransactionSpaces', () => {
  // Copiar octubre crea en Personal la serie desde octubre.
  const rentCopy: SessionTransaction = {
    ...rent,
    id: 'rent-copy-october',
    recurrenceSeriesId: 'series-rent-copy',
    sourceTransactionId: 'rent-october',
    spaceId: 'personal',
  };
  const rentCopyNovember = {
    ...rentCopy,
    id: 'rent-copy-november',
    occurredOn: '2026-11-01',
    sourceTransactionId: undefined,
  };
  const copiedSpaceIds = indexCopiedTransactionSpaces([
    rentSeptember,
    rent,
    coffee,
    rentCopy,
    rentCopyNovember,
  ]);

  it('marca la serie original entera como copiada, sea cual sea el mes', () => {
    expect([...copiedSpaceIds(rentSeptember)]).toEqual(['personal']);
    expect([...copiedSpaceIds(rent)]).toEqual(['personal']);
    expect(copiedSpaceIds(coffee).size).toBe(0);
  });

  it('marca la copia como ya existente en el espacio de su original', () => {
    expect([...copiedSpaceIds(rentCopyNovember)]).toEqual(['couple']);
  });

  it('solo ofrece los destinos donde no existe ninguno de los movimientos', () => {
    expect(
      getTransactionCopyTargets([rentSeptember], targets, copiedSpaceIds),
    ).toEqual([{ id: 'trip', name: 'Viaje' }]);
    expect(
      getTransactionCopyTargets([coffee], targets, copiedSpaceIds),
    ).toEqual(targets);
  });
});
