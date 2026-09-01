import {
  AccountLockedError,
  createJuntossAuthGateway,
  EmailVerificationRequiredError,
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
    expect(mockedClient.emailOtp.sendVerificationOtp).not.toHaveBeenCalled();
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
        error: {
          code: 'ACCOUNT_LOCKED',
          lockedUntil: '2026-08-30T12:00:00.000Z',
        },
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
      error: { error: { code: 'INVALID_EMAIL_OR_PASSWORD' } },
    } as never);

    await expect(
      createJuntossAuthGateway().signInWithPassword({
        email: 'ana@example.test',
        password: 'incorrecta',
      }),
    ).rejects.toThrow('Correo o contraseña incorrectos.');
  });

  it('distingue una cuenta sin verificar de unas credenciales incorrectas', async () => {
    mockedClient.signIn.email.mockResolvedValueOnce({
      data: null,
      error: { error: { code: 'EMAIL_NOT_VERIFIED' } },
    } as never);

    const promise = createJuntossAuthGateway().signInWithPassword({
      email: 'ana@example.test',
      password: 'contrasena-larga',
    });

    await expect(promise).rejects.toBeInstanceOf(
      EmailVerificationRequiredError,
    );
    await expect(promise).rejects.toMatchObject({
      email: 'ana@example.test',
    });
  });

  it('explica una respuesta sin sesión en lugar de culpar a las credenciales', async () => {
    mockedClient.signIn.email.mockResolvedValueOnce({
      data: null,
      error: null,
    } as never);

    await expect(
      createJuntossAuthGateway().signInWithPassword({
        email: 'ana@example.test',
        password: 'contrasena-larga',
      }),
    ).rejects.toThrow('No recibimos una confirmación de sesión del servidor.');
  });

  it.each([
    [
      'USER_ALREADY_EXISTS',
      'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
    ],
    [
      'FAILED_TO_CREATE_USER',
      'No pudimos guardar tu cuenta en el servidor. No se ha creado: inténtalo de nuevo en unos minutos.',
    ],
    [
      'UNTRUSTED_ORIGIN',
      'Esta versión de la app no está autorizada para crear cuentas. Actualízala o usa la development build de Juntoss.',
    ],
  ])(
    'explica el fallo de registro %s sin mostrar el detalle técnico',
    async (code, expectedMessage) => {
      mockedClient.signUp.email.mockResolvedValueOnce({
        data: null,
        error: { code, message: 'Internal failure detail' },
      } as never);

      await expect(
        createJuntossAuthGateway().signUp({
          displayName: 'Ana',
          email: 'ana@example.test',
          password: 'contrasena-larga',
        }),
      ).rejects.toThrow(expectedMessage);
    },
  );

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

  it('explica que el servidor no indicó la causa al fallar el registro con un código nuevo', async () => {
    mockedClient.signUp.email.mockResolvedValueOnce({
      data: null,
      error: { code: 'SOMETHING_NEW', message: 'Internal failure detail' },
    } as never);

    await expect(
      createJuntossAuthGateway().signUp({
        displayName: 'Ana',
        email: 'ana@example.test',
        password: 'contrasena-larga',
      }),
    ).rejects.toThrow(
      'No pudimos crear tu cuenta porque el servidor no indicó la causa. Comprueba tu conexión e inténtalo de nuevo.',
    );
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
