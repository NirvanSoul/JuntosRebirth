import { fireEvent, waitFor } from '@testing-library/react-native';

import { PendingInvitationBanner } from '@/features/spaces/components/PendingInvitationBanner';
import {
  AcceptInvitationError,
  createJuntossInvitationGateway,
} from '@/features/spaces/gateways/juntossInvitationGateway';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));

jest.mock('@/features/spaces/gateways/juntossInvitationGateway', () => ({
  ...jest.requireActual('@/features/spaces/gateways/juntossInvitationGateway'),
  createJuntossInvitationGateway: jest.fn(),
}));

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

const mockSession = { user: { id: 'user-1', email: 'yo@example.com' } };

jest.mock('@/features/auth/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    session: mockSession,
  }),
}));

const mockInvitation = {
  invitationId: 'inv-123',
  inviterDisplayName: 'María',
  spaceName: 'Nuestra Casa',
};

function setupGatewayMock(
  overrides?: Partial<ReturnType<typeof createJuntossInvitationGateway>>,
) {
  const gateway = {
    getCurrentUserPendingInvitation: jest
      .fn()
      .mockResolvedValue(mockInvitation),
    acceptCurrentUserInvitation: jest
      .fn()
      .mockResolvedValue({ spaceId: 'space-couple-99', spaceName: 'Juntoss' }),
    rejectCurrentUserInvitation: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  jest
    .mocked(createJuntossInvitationGateway)
    .mockReturnValue(
      gateway as unknown as ReturnType<typeof createJuntossInvitationGateway>,
    );
  return gateway;
}

async function renderBanner(
  propsOverrides: Partial<Parameters<typeof PendingInvitationBanner>[0]> = {},
) {
  const onAccepted = jest.fn(async () => undefined);
  const onOpenCountrySettings = jest.fn();

  const rendered = await renderWithTheme(
    <PendingInvitationBanner
      onAccepted={onAccepted}
      onOpenCountrySettings={onOpenCountrySettings}
      {...propsOverrides}
    />,
  );

  return { onAccepted, onOpenCountrySettings, rendered };
}

describe('PendingInvitationBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no muestra nada cuando no hay invitación pendiente', async () => {
    setupGatewayMock({
      getCurrentUserPendingInvitation: jest.fn().mockResolvedValue(null),
    });

    const { rendered } = await renderBanner();
    await waitFor(() => {
      expect(rendered.queryByTestId('pending-space-invitation')).toBeNull();
    });
  });

  it('muestra el popup con título indicando quién invita y a qué espacio', async () => {
    setupGatewayMock();
    const { rendered } = await renderBanner();

    expect(
      await rendered.findByText('María te invitó a un espacio juntos'),
    ).toBeTruthy();
  });

  it('muestra la lista con 3 beneficios con checkmarks', async () => {
    setupGatewayMock();
    const { rendered } = await renderBanner();

    expect(
      await rendered.findByText('Compartir gastos e ingresos en tiempo real'),
    ).toBeTruthy();
    expect(
      rendered.getByText('Ver balances y presupuestos conjuntos'),
    ).toBeTruthy();
    expect(
      rendered.getByText('Organizar categorías y finanzas en pareja'),
    ).toBeTruthy();
  });

  it('no contiene el botón "Luego"', async () => {
    setupGatewayMock();
    const { rendered } = await renderBanner();

    await rendered.findByText('María te invitó a un espacio juntos');
    expect(rendered.queryByLabelText('Luego')).toBeNull();
    expect(rendered.queryByText('Luego')).toBeNull();
  });

  it('usa "Alguien" si inviterDisplayName está vacío', async () => {
    setupGatewayMock({
      getCurrentUserPendingInvitation: jest.fn().mockResolvedValue({
        ...mockInvitation,
        inviterDisplayName: '   ',
      }),
    });
    const { rendered } = await renderBanner();

    expect(
      await rendered.findByText('Alguien te invitó a un espacio juntos'),
    ).toBeTruthy();
  });

  it('cancela la invitación llamando a rejectCurrentUserInvitation y cierra el popup', async () => {
    const gateway = setupGatewayMock();
    const { onAccepted, rendered } = await renderBanner();

    const cancelButton = await rendered.findByLabelText('Cancelar invitación');
    await fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(gateway.rejectCurrentUserInvitation).toHaveBeenCalledWith(
        'inv-123',
      );
      expect(rendered.queryByTestId('pending-space-invitation')).toBeNull();
    });
    expect(gateway.acceptCurrentUserInvitation).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it('acepta la invitación y pasa el spaceId a onAccepted', async () => {
    const gateway = setupGatewayMock();
    const { onAccepted, rendered } = await renderBanner();

    const acceptButton = await rendered.findByLabelText('Aceptar invitación');
    await fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(gateway.acceptCurrentUserInvitation).toHaveBeenCalledWith(
        'inv-123',
      );
      expect(onAccepted).toHaveBeenCalledWith('space-couple-99');
      expect(rendered.queryByTestId('pending-space-invitation')).toBeNull();
    });
  });

  it('muestra modal de país cuando el gateway devuelve error de incompatibilidad', async () => {
    setupGatewayMock({
      acceptCurrentUserInvitation: jest
        .fn()
        .mockRejectedValue(
          new AcceptInvitationError(
            'space_country_mismatch',
            'Incompatibilidad de país',
          ),
        ),
    });
    const { rendered } = await renderBanner();

    const acceptButton = await rendered.findByLabelText('Aceptar invitación');
    await fireEvent.press(acceptButton);

    expect(
      await rendered.findByText('No pueden compartir este espacio todavía'),
    ).toBeTruthy();
  });
});
