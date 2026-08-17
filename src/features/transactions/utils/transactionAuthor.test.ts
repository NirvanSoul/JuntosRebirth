import type { SpaceMemberProfile } from '@/features/profile/types';
import {
  resolveTransactionAuthor,
  type TransactionAuthorContext,
} from '@/features/transactions/utils/transactionAuthor';

const ana: SpaceMemberProfile = {
  userId: 'uuid-ana',
  displayName: 'Ana',
  avatarUrl: null,
};
const beto: SpaceMemberProfile = {
  userId: 'uuid-beto',
  displayName: 'Beto',
  avatarUrl: null,
};

const context: TransactionAuthorContext = {
  profilesByUserId: { [ana.userId]: ana, [beto.userId]: beto },
  ownUserId: ana.userId,
  installationId: 'install-abc',
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

  it('reconoce como propia la fila antigua firmada con el id de instalación', () => {
    expect(resolveTransactionAuthor('install-abc', context)).toEqual({
      profile: ana,
      isOwn: true,
    });
  });

  it('no atribuye a quien mira un uuid ajeno mientras falta el censo', () => {
    const sinCenso = { ...context, profilesByUserId: {} };

    expect(resolveTransactionAuthor('uuid-beto', sinCenso)).toEqual({
      profile: null,
      isOwn: false,
    });
  });

  it('trata como propia la fila de invitado, sin sesión ni censo', () => {
    const invitado: TransactionAuthorContext = {
      profilesByUserId: {},
      ownUserId: null,
      installationId: 'install-abc',
    };

    expect(resolveTransactionAuthor('install-abc', invitado)).toEqual({
      profile: null,
      isOwn: true,
    });
  });

  it('no reconoce nada como propio si aún no se sabe quién usa el móvil', () => {
    const sinIdentidad: TransactionAuthorContext = {
      profilesByUserId: {},
      ownUserId: null,
      installationId: null,
    };

    expect(resolveTransactionAuthor('install-abc', sinIdentidad).isOwn).toBe(
      false,
    );
  });
});
