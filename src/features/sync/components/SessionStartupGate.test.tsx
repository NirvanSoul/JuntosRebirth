import { act, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { SessionStartupGate } from '@/features/sync/components/SessionStartupGate';
import { renderWithTheme } from '@/test/renderWithTheme';

const mockSignOut = jest.fn(async () => undefined);
jest.mock('@/features/auth/gateways/juntossAuthGateway', () => ({
  createJuntossAuthGateway: jest.fn(() => ({ signOut: mockSignOut })),
}));
const mockDiscard = jest.fn();
jest.mock('@/features/auth/services/discardBackedLocalSessionCache', () => ({
  discardBackedLocalSessionCache: () => mockDiscard(),
}));

const startup = (
  overrides: Partial<Parameters<typeof SessionStartupGate>[0]['startup']> = {},
) => ({
  isFinanceReady: true,
  isLocalCacheBlocked: false,
  retryLocalCache: jest.fn(),
  ...overrides,
});

describe('SessionStartupGate', () => {
  it('no monta la navegación con datos mientras la caché esté bloqueada', async () => {
    const state = startup({ isLocalCacheBlocked: true });
    const screen = await renderWithTheme(
      <SessionStartupGate isReady startup={state}>
        <Text>Saldo de la cuenta anterior</Text>
      </SessionStartupGate>,
    );

    expect(screen.queryByText('Saldo de la cuenta anterior')).toBeNull();
    expect(screen.getByTestId('local-cache-blocked')).toBeTruthy();

    fireEvent.press(screen.getByTestId('local-cache-blocked-retry'));
    expect(state.retryLocalCache).toHaveBeenCalledTimes(1);
  });

  it('permite salir cerrando la sesión sin borrar la caché', async () => {
    const screen = await renderWithTheme(
      <SessionStartupGate
        isReady
        startup={startup({ isLocalCacheBlocked: true })}
      >
        <Text>Inicio</Text>
      </SessionStartupGate>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('local-cache-blocked-sign-out'));
    });

    expect(createJuntossAuthGateway).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockDiscard).not.toHaveBeenCalled();
  });

  it('si no puede cerrar la sesión lo explica y sigue bloqueada', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockSignOut.mockRejectedValueOnce(new Error('sin red'));
    const screen = await renderWithTheme(
      <SessionStartupGate
        isReady
        startup={startup({ isLocalCacheBlocked: true })}
      >
        <Text>Inicio</Text>
      </SessionStartupGate>,
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('local-cache-blocked-sign-out'));
    });

    expect(
      screen.getByTestId('local-cache-blocked-sign-out-error'),
    ).toBeTruthy();
    expect(screen.queryByText('Inicio')).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('muestra la navegación cuando la caché está lista', async () => {
    const screen = await renderWithTheme(
      <SessionStartupGate isReady startup={startup()}>
        <Text>Inicio</Text>
      </SessionStartupGate>,
    );

    expect(screen.getByText('Inicio')).toBeTruthy();
  });
});
