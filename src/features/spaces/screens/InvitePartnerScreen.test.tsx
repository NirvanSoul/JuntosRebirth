import { fireEvent, waitFor } from '@testing-library/react-native';

import {
  CreateInvitationError,
  createJuntossInvitationGateway,
} from '@/features/spaces/gateways/juntossInvitationGateway';
import { InvitePartnerScreen } from '@/features/spaces/screens/InvitePartnerScreen';
import type { Space } from '@/features/spaces/types';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

jest.mock('@/features/spaces/gateways/juntossInvitationGateway', () => ({
  ...jest.requireActual('@/features/spaces/gateways/juntossInvitationGateway'),
  createJuntossInvitationGateway: jest.fn(),
}));

const coupleSpace: Space = {
  id: 'couple-1',
  name: 'Juntoss',
  type: 'couple',
  currency: 'EUR',
  isAwaitingPartner: true,
};

function renderInvitation(createInvitation = jest.fn()) {
  jest.mocked(createJuntossInvitationGateway).mockReturnValue({
    createInvitation,
  } as unknown as ReturnType<typeof createJuntossInvitationGateway>);

  return renderWithTheme(
    <InvitePartnerScreen
      coupleSpace={coupleSpace}
      onClose={jest.fn()}
      onCreateCoupleSpaceInvitation={jest.fn()}
      visible
    />,
  );
}

describe('InvitePartnerScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ofrece únicamente el envío dirigido por correo', async () => {
    const screen = await renderInvitation();

    expect(screen.getByLabelText('Correo de tu pareja')).toBeTruthy();
    expect(screen.getByTestId('invite-partner-send-email')).toBeTruthy();
    expect(screen.queryByText(/generar enlace/i)).toBeNull();
    expect(screen.queryByText(/copiar enlace/i)).toBeNull();
  });

  it('cerrar el paso de correo no crea un espacio ni una espera fantasma', async () => {
    const onClose = jest.fn();
    const onCreateCoupleSpaceInvitation = jest.fn();
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onClose={onClose}
        onCreateCoupleSpaceInvitation={onCreateCoupleSpaceInvitation}
        visible
      />,
    );

    await fireEvent.press(screen.getByTestId('invite-partner-create-space'));
    expect(screen.getByLabelText('Correo de tu pareja')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Cerrar'));

    expect(onCreateCoupleSpaceInvitation).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('crea el espacio y la primera invitación en una sola confirmación', async () => {
    const onCreateCoupleSpaceInvitation = jest.fn().mockResolvedValue({
      ...coupleSpace,
      id: 'couple-atomic',
    });
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onClose={jest.fn()}
        onCreateCoupleSpaceInvitation={onCreateCoupleSpaceInvitation}
        visible
      />,
    );

    await fireEvent.press(screen.getByTestId('invite-partner-create-space'));
    await fireEvent.changeText(
      screen.getByTestId('invite-partner-email'),
      ' pareja@example.com ',
    );
    await fireEvent.press(screen.getByTestId('invite-partner-send-email'));

    await waitFor(() =>
      expect(onCreateCoupleSpaceInvitation).toHaveBeenCalledWith(
        'pareja@example.com',
      ),
    );
    expect(await screen.findByText('¡Invitación enviada!')).toBeTruthy();
  });

  it('confirma la invitación in-app para una cuenta existente', async () => {
    const createInvitation = jest.fn().mockResolvedValue({
      id: 'invitation-1',
      expiresAt: '2026-09-01T00:00:00Z',
    });
    const screen = await renderInvitation(createInvitation);

    await fireEvent.changeText(
      screen.getByTestId('invite-partner-email'),
      ' pareja@example.com ',
    );
    await fireEvent.press(screen.getByTestId('invite-partner-send-email'));

    await waitFor(() =>
      expect(createInvitation).toHaveBeenCalledWith(
        'couple-1',
        'pareja@example.com',
      ),
    );
    expect(await screen.findByText('¡Invitación enviada!')).toBeTruthy();
    expect(screen.getByText(/notificaciones activadas/i)).toBeTruthy();
  });

  it('pide descargar la app cuando el correo no tiene cuenta', async () => {
    const createInvitation = jest
      .fn()
      .mockRejectedValue(
        new CreateInvitationError(
          'invitee_not_registered',
          'Ese correo aún no tiene una cuenta.',
        ),
      );
    const screen = await renderInvitation(createInvitation);

    await fireEvent.changeText(
      screen.getByTestId('invite-partner-email'),
      'nueva@example.com',
    );
    await fireEvent.press(screen.getByTestId('invite-partner-send-email'));

    expect(await screen.findByText('No encontramos esa cuenta')).toBeTruthy();
    expect(
      screen.getByText(/descargue la app y cree una cuenta/i),
    ).toBeTruthy();
  });
});
