import { renderHook, waitFor } from '@testing-library/react-native';

import { listSpaceMemberProfiles } from '@/features/profile/repositories/localSpaceMemberProfileRepository';
import type { SpaceMemberProfile } from '@/features/profile/types';
import { useSpaceCurrencies } from '@/features/spaces/hooks/useSpaceCurrencies';
import type { Space } from '@/features/spaces/types';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

jest.mock(
  '@/features/profile/repositories/localSpaceMemberProfileRepository',
  () => ({ listSpaceMemberProfiles: jest.fn() }),
);

const mockListSpaceMemberProfiles = jest.mocked(listSpaceMemberProfiles);

function profile(
  userId: string,
  defaultCurrency: CurrencyCode | null,
): SpaceMemberProfile {
  return {
    userId,
    displayName: userId,
    avatarPath: null,
    avatarUpdatedAt: null,
    avatarUri: null,
    defaultCurrency,
  };
}

const sharedSpace: Space = {
  id: 'space-shared',
  name: 'Juntos',
  type: 'couple',
  currency: 'USD',
};
const ownCurrencies: readonly CurrencyCode[] = ['EUR'];

describe('useSpaceCurrencies', () => {
  it('no recupera una moneda quitada por el perfil propio ni por lo registrado antes de iniciar sesión', async () => {
    // El censo guarda a la propia persona con su moneda principal de la última
    // sincronización (USD) y un movimiento anterior al login lleva el id de
    // instalación. Ninguno de los dos debe devolver el USD que quitó.
    mockListSpaceMemberProfiles.mockResolvedValue([
      profile('user-own', 'USD'),
      profile('user-partner', 'GBP'),
    ]);

    const { result } = await renderHook(() =>
      useSpaceCurrencies(sharedSpace, ownCurrencies, 'user-own', [
        { createdBy: 'installation-1', currency: 'USD' },
        { createdBy: 'user-own', currency: 'USD' },
        { createdBy: 'user-partner', currency: 'JPY' },
      ]),
    );

    await waitFor(() => expect(result.current).toEqual(['EUR', 'GBP', 'JPY']));
  });

  it('en un espacio personal solo ofrece las monedas activas', async () => {
    const { result } = await renderHook(() =>
      useSpaceCurrencies(
        { ...sharedSpace, type: 'personal' },
        ownCurrencies,
        'user-own',
        [{ createdBy: 'user-own', currency: 'USD' }],
      ),
    );

    expect(result.current).toEqual(['EUR']);
  });
});
