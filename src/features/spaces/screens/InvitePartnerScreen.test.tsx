import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveCountryChangeNotice,
  loadCountryChangeNotice,
} from '@/features/spaces/repositories/countryChangeNoticeRepository';
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

jest.mock('@/features/auth/hooks/useAuthSession', () => ({
  useAuthSession: () => ({ userId: 'invite-user', isReady: true }),
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
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('explica la salida al abrir el espacio y permite invitar a otra persona', async () => {
    await saveCountryChangeNotice('invite-user', {
      previousCountryName: 'España',
    });
    const onCreate = jest.fn().mockResolvedValue(coupleSpace);
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onClose={jest.fn()}
        onCreateCoupleSpaceInvitation={onCreate}
        visible
      />,
    );
    await waitFor(() =>
      expect(screen.getByText(/configura de nuevo España/)).toBeTruthy(),
    );
    expect(screen.getByText(/mismo país configurado/)).toBeTruthy();
    expect(screen.getByText(/tu país actual/)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Invitar a otra persona'));
    expect(onCreate).not.toHaveBeenCalled();
    await fireEvent.changeText(
      screen.getByTestId('invite-partner-email'),
      'pareja@example.com',
    );
    await fireEvent.press(screen.getByTestId('invite-partner-send-email'));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith('pareja@example.com'),
    );
  });

  it('no muestra detalles de otra cuenta', async () => {
    await saveCountryChangeNotice('other-user', {
      previousCountryName: 'España',
    });
    const screen = await renderWithTheme(
      <InvitePartnerScreen
        coupleSpace={null}
        onClose={jest.fn()}
        onCreateCoupleSpaceInvitation={jest.fn()}
        visible
      />,
    );
    expect(screen.getByLabelText('Crear espacio de pareja')).toBeTruthy();
    expect(screen.queryByText(/configura de nuevo España/)).toBeNull();
  });

  it('retira el aviso cuando ya existe un espacio', async () => {
    await saveCountryChangeNotice('invite-user', {
      previousCountryName: 'España',
    });
    const screen = await renderInvitation();
    await waitFor(async () =>
      expect(await loadCountryChangeNotice('invite-user')).toBeNull(),
    );
    expect(screen.queryByText(/configura de nuevo España/)).toBeNull();
  });

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
