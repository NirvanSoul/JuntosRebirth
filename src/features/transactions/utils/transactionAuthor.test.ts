import type { SpaceMemberProfile } from '@/features/profile/types';
import {
  resolveTransactionAuthor,
  type TransactionAuthorContext,
} from '@/features/transactions/utils/transactionAuthor';

const ana: SpaceMemberProfile = {
  userId: 'uuid-ana',
  displayName: 'Ana',
  avatarPath: null,
  avatarUpdatedAt: null,
  avatarUri: null,
  defaultCurrency: null,
};
const beto: SpaceMemberProfile = {
  userId: 'uuid-beto',
  displayName: 'Beto',
  avatarPath: null,
  avatarUpdatedAt: null,
  avatarUri: null,
  defaultCurrency: null,
};

const context: TransactionAuthorContext = {
  profilesByUserId: { [ana.userId]: ana, [beto.userId]: beto },
  ownUserId: ana.userId,
};

describe('resolveTransactionAuthor', () => {
  it('reconoce como propio el movimiento firmado con el uuid de quien mira', () => {
    expect(resolveTransactionAuthor('uuid-ana', context)).toEqual({
      profile: ana,
      isOwn: true,
    });
  });

  it('atribuye a la otra persona el movimiento firmado con su uuid', () => {
    expect(resolveTransactionAuthor('uuid-beto', context)).toEqual({
      profile: beto,
      isOwn: false,
    });
  });

  it('no atribuye a quien mira un uuid ajeno mientras falta el censo', () => {
    const sinCenso = { ...context, profilesByUserId: {} };

    expect(resolveTransactionAuthor('uuid-beto', sinCenso)).toEqual({
      profile: null,
      isOwn: false,
    });
  });

  it('no reconoce nada como propio si aún no se sabe quién usa el móvil', () => {
    const sinIdentidad: TransactionAuthorContext = {
      profilesByUserId: {},
      ownUserId: null,
    };

    expect(resolveTransactionAuthor('install-abc', sinIdentidad).isOwn).toBe(
      false,
    );
  });
});
