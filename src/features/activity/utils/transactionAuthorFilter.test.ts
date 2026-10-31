import type { SessionTransaction } from '@/features/transactions/types';

import {
  getTransactionAuthorFilterOptions,
  matchesTransactionAuthorFilter,
} from './transactionAuthorFilter';

const sharedContext = {
  isSharedSpace: true,
  ownUserId: 'me',
  profilesByUserId: {
    me: { userId: 'me', displayName: 'Alex' },
    partner: { userId: 'partner', displayName: 'Sam' },
  },
} as unknown as Parameters<typeof getTransactionAuthorFilterOptions>[0];

const byAuthor = (createdBy: string) =>
  ({ createdBy }) as unknown as SessionTransaction;

describe('transactionAuthorFilter', () => {
  it('ofrece el nombre de la pareja en un espacio juntos', () => {
    expect(
      getTransactionAuthorFilterOptions(sharedContext).map(
        (option) => option.label,
      ),
    ).toEqual(['Ambos', 'Yo', 'Sam']);
  });

  it('no ofrece opciones en un espacio personal', () => {
    expect(
      getTransactionAuthorFilterOptions({
        ...sharedContext,
        isSharedSpace: false,
      }),
    ).toEqual([]);
  });

  it('separa los movimientos propios de los de la pareja', () => {
    expect(
      matchesTransactionAuthorFilter(byAuthor('me'), 'own', sharedContext),
    ).toBe(true);
    expect(
      matchesTransactionAuthorFilter(byAuthor('me'), 'partner', sharedContext),
    ).toBe(false);
    expect(
      matchesTransactionAuthorFilter(
        byAuthor('partner'),
        'partner',
        sharedContext,
      ),
    ).toBe(true);
    expect(
      matchesTransactionAuthorFilter(byAuthor('partner'), 'all', sharedContext),
    ).toBe(true);
  });

  it('ignora el filtro en un espacio personal', () => {
    expect(
      matchesTransactionAuthorFilter(byAuthor('partner'), 'own', {
        ...sharedContext,
        isSharedSpace: false,
      }),
    ).toBe(true);
  });
});

describe('transactionAuthorFilter · movimientos sin sesión', () => {
  it('trata como propio lo firmado con el id de la instalación', () => {
    expect(
      matchesTransactionAuthorFilter(
        byAuthor('install-1'),
        'own',
        sharedContext,
      ),
    ).toBe(true);
    expect(
      matchesTransactionAuthorFilter(
        byAuthor('install-1'),
        'partner',
        sharedContext,
      ),
    ).toBe(false);
  });
});
