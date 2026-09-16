import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';

import {
  CreateInvitationError,
  createJuntossInvitationGateway,
} from '@/features/spaces/gateways/juntossInvitationGateway';
import { InvitePartnerScreen } from '@/features/spaces/screens/InvitePartnerScreen';
import type { Space } from '@/features/spaces/types';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/spaces/gateways/juntossInvitationGateway', () => ({
  ...jest.requireActual('@/features/spaces/gateways/juntossInvitationGateway'),
  createJuntossInvitationGateway: jest.fn(),
}));

const mockTestSession = {
  user: { id: 'invite-user', email: 'yo@example.com' },
};

jest.mock('@/features/auth/hooks/useAuthSession', () => ({
  useAuthSession: () => ({
    userId: 'invite-user',
    isReady: true,
    session: mockTestSession,
  }),
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
      onFinished={jest.fn()}
      onCreateCoupleSpaceInvitation={jest.fn()}
    />,
  );
}

describe('InvitePartnerScreen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('abre directamente el formulario para enviar una invitación', async () => {
    const onCreate = jest.fn().mockResolvedValue(coupleSpace);
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onFinished={jest.fn()}
        onCreateCoupleSpaceInvitation={onCreate}
      />,
    );
    expect(screen.getByLabelText('Correo de tu pareja')).toBeTruthy();
    expect(
      screen.getByTestId('invite-partner-couple-illustration'),
    ).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('invite-partner-email'),
      'pareja@example.com',
    );
    await fireEvent.press(screen.getByTestId('invite-partner-send-email'));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith('pareja@example.com'),
    );
  });

  it('no muestra un paso previo antes del formulario', async () => {
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onFinished={jest.fn()}
        onCreateCoupleSpaceInvitation={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Correo de tu pareja')).toBeTruthy();
    expect(screen.queryByText('Organiza lo que comparten')).toBeNull();
  });

  it('ofrece únicamente el envío dirigido por correo', async () => {
    const screen = await renderInvitation();

    expect(screen.getByLabelText('Correo de tu pareja')).toBeTruthy();
    expect(screen.getByTestId('invite-partner-send-email')).toBeTruthy();
    expect(screen.queryByText(/generar enlace/i)).toBeNull();
    expect(screen.queryByText(/copiar enlace/i)).toBeNull();
  });

  it('crea el espacio y la primera invitación en una sola confirmación', async () => {
    const onCreateCoupleSpaceInvitation = jest.fn().mockResolvedValue({
      ...coupleSpace,
      id: 'couple-atomic',
    });
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onFinished={jest.fn()}
        onCreateCoupleSpaceInvitation={onCreateCoupleSpaceInvitation}
      />,
    );

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
    expect(screen.getByTestId('invite-partner-success-icon')).toBeTruthy();
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

  it('permite cancelar el flujo desde el formulario por correo', async () => {
    const onCancel = jest.fn();
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onCancel={onCancel}
        onFinished={jest.fn()}
        onCreateCoupleSpaceInvitation={jest.fn()}
      />,
    );

    const cancelButton = screen.getByLabelText('Cancelar');
    await fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('permite cancelar cuando el correo no tiene cuenta', async () => {
    const onCancel = jest.fn();
    const createInvitation = jest
      .fn()
      .mockRejectedValue(
        new CreateInvitationError(
          'invitee_not_registered',
          'Ese correo aún no tiene una cuenta.',
        ),
      );
    jest.mocked(createJuntossInvitationGateway).mockReturnValue({
      createInvitation,
    } as unknown as ReturnType<typeof createJuntossInvitationGateway>);

    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={coupleSpace}
        onCancel={onCancel}
        onFinished={jest.fn()}
        onCreateCoupleSpaceInvitation={jest.fn()}
      />,
    );

    await fireEvent.changeText(
      screen.getByTestId('invite-partner-email'),
      'nueva@example.com',
    );
    await fireEvent.press(screen.getByTestId('invite-partner-send-email'));

    expect(await screen.findByText('No encontramos esa cuenta')).toBeTruthy();
    const cancelButton = screen.getByLabelText('Cancelar');
    await fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('muestra la tarjeta de invitación pendiente y permite aceptarla', async () => {
    const onAcceptPendingInvitation = jest.fn(async () => undefined);
    jest.mocked(createJuntossInvitationGateway).mockReturnValue({
      getCurrentUserPendingInvitation: jest.fn().mockResolvedValue({
        invitationId: 'inv-456',
        inviterDisplayName: 'Carlos',
        spaceName: 'Juntoss',
      }),
      acceptCurrentUserInvitation: jest
        .fn()
        .mockResolvedValue({ spaceId: 'space-carlos', spaceName: 'Juntoss' }),
    } as unknown as ReturnType<typeof createJuntossInvitationGateway>);

    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onAcceptPendingInvitation={onAcceptPendingInvitation}
        onFinished={jest.fn()}
        onCreateCoupleSpaceInvitation={jest.fn()}
        onOpenCountrySettings={jest.fn()}
      />,
    );

    expect(
      await screen.findByText('Carlos te invitó a un espacio juntos'),
    ).toBeTruthy();

    const acceptButton = await screen.findByLabelText('Aceptar invitación');
    await fireEvent.press(acceptButton);

    await waitFor(() => {
      expect(onAcceptPendingInvitation).toHaveBeenCalledWith('space-carlos');
    });
  });
});
