import type { ComponentProps } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createSupabaseInvitationGateway } from '@/features/spaces/gateways/supabaseInvitationGateway';
import { AwaitingPartnerScreen } from '@/features/spaces/screens/AwaitingPartnerScreen';
import type { Space } from '@/features/spaces/types';
import { ThemeProvider } from '@/theme/ThemeProvider';

jest.mock('@/features/spaces/gateways/supabaseInvitationGateway');

const pendingSpace: Space = {
  id: 'space-juntos',
  name: 'Juntos',
  type: 'couple',
  isAwaitingPartner: true,
};

function mockOutgoingInvitation(
  invitation: { inviteeEmail: string | null; expiresAt: string } | null,
) {
  jest.mocked(createSupabaseInvitationGateway).mockReturnValue({
    getOutgoingInvitation: jest.fn().mockResolvedValue(invitation),
  } as unknown as ReturnType<typeof createSupabaseInvitationGateway>);
}

async function renderScreen(
  overrides: Partial<ComponentProps<typeof AwaitingPartnerScreen>> = {},
) {
  const props = {
    onCancelSpace: jest.fn(async () => undefined),
    onChangeInvitation: jest.fn(),
    onRefresh: jest.fn(async () => undefined),
    space: pendingSpace,
    ...overrides,
  };

  return {
    props,
    screen: await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}
      >
        <ThemeProvider>
          <AwaitingPartnerScreen {...props} />
        </ThemeProvider>
      </SafeAreaProvider>,
    ),
  };
}

describe('AwaitingPartnerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOutgoingInvitation(null);
  });

  it('nombra a quien fue invitado y le pide que abra su app de Juntos', async () => {
    mockOutgoingInvitation({
      inviteeEmail: 'pareja@ejemplo.com',
      expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    });

    const { screen } = await renderScreen();

    await waitFor(() =>
      expect(
        screen.getByText(/pareja@ejemplo\.com.*abra su app de Juntos/s),
      ).toBeTruthy(),
    );
    expect(screen.getByText('Caduca en 5 días')).toBeTruthy();
  });

  it('cae a una redacción sin correo cuando la invitación se compartió por enlace', async () => {
    mockOutgoingInvitation({
      inviteeEmail: null,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    const { screen } = await renderScreen();

    await waitFor(() =>
      expect(
        screen.getByText(/la persona que invitaste que abra su app de Juntos/s),
      ).toBeTruthy(),
    );
  });

  it('comprueba de nuevo el estado del espacio al pulsar "Ya aceptó"', async () => {
    const { props, screen } = await renderScreen();

    fireEvent.press(screen.getByTestId('awaiting-partner-refresh'));

    await waitFor(() => expect(props.onRefresh).toHaveBeenCalledTimes(1));
  });

  it('pide confirmación antes de descartar el espacio pendiente', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { props, screen } = await renderScreen();

    fireEvent.press(screen.getByTestId('awaiting-partner-cancel'));

    expect(props.onCancelSpace).not.toHaveBeenCalled();
    const [, , buttons] = alertSpy.mock.calls[0] ?? [];
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    expect(props.onCancelSpace).toHaveBeenCalledTimes(1);
  });
});
