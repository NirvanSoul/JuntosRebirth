import {
  AccountLockedError,
  createJuntossAuthGateway,
} from '@/features/auth/gateways/juntossAuthGateway';
import { authClient } from '@/lib/auth-client';
import { unregisterCurrentDeviceFromInvitationPush } from '@/lib/notifications/invitationPushTokenStore';

jest.mock('@/lib/notifications/invitationPushTokenStore', () => ({
  unregisterCurrentDeviceFromInvitationPush: jest.fn(async () => undefined),
}));

const mockedClient = jest.mocked(authClient);

describe('juntossAuthGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registra usando el nombre elegido en el alta', async () => {
    await createJuntossAuthGateway().signUp({
      displayName: 'Ana',
      email: 'ana@example.test',
      password: 'contrasena-larga',
    });

    expect(mockedClient.signUp.email).toHaveBeenCalledWith({
      email: 'ana@example.test',
      name: 'Ana',
      password: 'contrasena-larga',
    });
  });

  it('verifica el correo cuando el código es de registro', async () => {
    await createJuntossAuthGateway().verifyOtp({
      email: 'ana@example.test',
      purpose: 'signup',
      token: '123456',
    });

    expect(mockedClient.emailOtp.verifyEmail).toHaveBeenCalledWith({
      email: 'ana@example.test',
      otp: '123456',
    });
    expect(mockedClient.emailOtp.checkVerificationOtp).not.toHaveBeenCalled();
  });

  it('comprueba el código de recuperación sin consumirlo', async () => {
    await createJuntossAuthGateway().verifyOtp({
      email: 'ana@example.test',
      purpose: 'recovery',
      token: '123456',
    });

    // Se comprueba, no se verifica: el código hace falta otra vez al enviar la
    // contraseña nueva, y verificarlo no debe abrir sesión.
    expect(mockedClient.emailOtp.checkVerificationOtp).toHaveBeenCalledWith({
      email: 'ana@example.test',
      otp: '123456',
      type: 'forget-password',
    });
    expect(mockedClient.emailOtp.verifyEmail).not.toHaveBeenCalled();
  });

  it('envía correo, código y contraseña juntos al restablecer', async () => {
    await createJuntossAuthGateway().setNewPassword({
      code: '123456',
      email: 'ana@example.test',
      password: 'nueva-contrasena',
    });

    expect(mockedClient.emailOtp.resetPassword).toHaveBeenCalledWith({
      email: 'ana@example.test',
      otp: '123456',
      password: 'nueva-contrasena',
    });
  });

  it('devuelve el identificador de quien inicia sesión', async () => {
    mockedClient.signIn.email.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    } as never);

    await expect(
      createJuntossAuthGateway().signInWithPassword({
        email: 'ana@example.test',
        password: 'contrasena-larga',
      }),
    ).resolves.toEqual({ userId: 'user-1' });
  });

  it('convierte el bloqueo por intentos en un error con su fecha', async () => {
    mockedClient.signIn.email.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'ACCOUNT_LOCKED',
        lockedUntil: '2026-08-30T12:00:00.000Z',
      },
    } as never);

    const promise = createJuntossAuthGateway().signInWithPassword({
      email: 'ana@example.test',
      password: 'incorrecta',
    });

    await expect(promise).rejects.toBeInstanceOf(AccountLockedError);
    await expect(promise).rejects.toMatchObject({
      lockedUntil: new Date('2026-08-30T12:00:00.000Z'),
    });
  });

  it('traduce los códigos conocidos a mensajes en español', async () => {
    mockedClient.signIn.email.mockResolvedValueOnce({
      data: null,
      error: { code: 'INVALID_EMAIL_OR_PASSWORD' },
    } as never);

    await expect(
      createJuntossAuthGateway().signInWithPassword({
        email: 'ana@example.test',
        password: 'incorrecta',
      }),
    ).rejects.toThrow('Correo o contraseña incorrectos.');
  });

  it('no filtra texto de la API cuando el código es desconocido', async () => {
    mockedClient.signIn.email.mockResolvedValueOnce({
      data: null,
      error: { code: 'SOMETHING_NEW', message: 'Internal failure detail' },
    } as never);

    await expect(
      createJuntossAuthGateway().signInWithPassword({
        email: 'ana@example.test',
        password: 'incorrecta',
      }),
    ).rejects.toThrow('No pudimos iniciar sesión.');
  });

  it('retira el token push antes de cerrar sesión', async () => {
    const order: string[] = [];
    jest
      .mocked(unregisterCurrentDeviceFromInvitationPush)
      .mockImplementationOnce(async () => {
        order.push('push');
      });
    mockedClient.signOut.mockImplementationOnce((async () => {
      order.push('signOut');
      return { data: null, error: null };
    }) as never);

    await createJuntossAuthGateway().signOut();

    // Después de cerrar sesión ya no habría credenciales para retirarlo.
    expect(order).toEqual(['push', 'signOut']);
  });

  it('cierra sesión aunque no se pueda retirar el token push', async () => {
    jest
      .mocked(unregisterCurrentDeviceFromInvitationPush)
      .mockRejectedValueOnce(new Error('offline'));

    await expect(createJuntossAuthGateway().signOut()).resolves.toBeUndefined();
    expect(mockedClient.signOut).toHaveBeenCalled();
  });
});
