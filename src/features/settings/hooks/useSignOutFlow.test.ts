import { act, renderHook } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { createJuntossAuthGateway } from '@/features/auth/gateways/juntossAuthGateway';
import { discardBackedLocalSessionCache } from '@/features/auth/services/discardBackedLocalSessionCache';
import {
  countDeviceOnlyData,
  countPendingLocalChanges,
  uploadPendingLocalChanges,
} from '@/features/auth/services/pendingLocalChanges';
import { useSignOutFlow } from '@/features/settings/hooks/useSignOutFlow';
import { isDemoSessionActive } from '@/state/demoSession/demoSessionStore';

const mockSignOut = jest.fn(async () => undefined);
jest.mock('@/features/auth/gateways/juntossAuthGateway', () => ({
  createJuntossAuthGateway: jest.fn(() => ({ signOut: mockSignOut })),
}));
jest.mock('@/features/auth/services/discardBackedLocalSessionCache', () => ({
  discardBackedLocalSessionCache: jest.fn(async () => true),
}));
jest.mock('@/features/auth/services/pendingLocalChanges', () => ({
  countDeviceOnlyData: jest.fn(),
  countPendingLocalChanges: jest.fn(),
  uploadPendingLocalChanges: jest.fn(),
}));

jest.mock('@/state/demoSession/demoSessionStore', () => ({
  isDemoSessionActive: jest.fn(() => false),
}));

function lastAlert() {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const [title, message, buttons] = calls[calls.length - 1] as [
    string,
    string,
    AlertButton[],
  ];
  return { title, message, buttons };
}

async function press(label: string) {
  const button = lastAlert().buttons.find((item) => item.text === label);
  if (!button) throw new Error(`No existe el botón ${label}`);
  await act(async () => {
    button.onPress?.();
  });
}

describe('useSignOutFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    (countPendingLocalChanges as jest.Mock).mockResolvedValue(0);
    (countDeviceOnlyData as jest.Mock).mockResolvedValue({
      importBatches: 0,
      notificationRules: 0,
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('sin pendientes pide la confirmación habitual y cierra la sesión', async () => {
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());
    expect(lastAlert().title).toBe('Cerrar sesión');
    await press('Cerrar sesión');

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(1);
  });

  it('con pendientes los sube antes de cerrar la sesión', async () => {
    (countPendingLocalChanges as jest.Mock).mockResolvedValue(2);
    (uploadPendingLocalChanges as jest.Mock).mockResolvedValue(0);
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());
    expect(lastAlert().title).toBe('Tienes cambios sin subir');
    expect(lastAlert().message).toContain('2 cambios');
    await press('Subir y cerrar sesión');

    expect(uploadPendingLocalChanges).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('si la subida falla avisa de la pérdida y no cierra sin una decisión', async () => {
    (countPendingLocalChanges as jest.Mock).mockResolvedValue(1);
    (uploadPendingLocalChanges as jest.Mock).mockResolvedValue(1);
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());
    await press('Subir y cerrar sesión');

    expect(lastAlert().title).toBe('No pudimos subir tus cambios');
    expect(lastAlert().message).toContain('no podrás recuperarlo');
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(discardBackedLocalSessionCache).not.toHaveBeenCalled();

    await press('Cerrar sesión y borrarlos');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(discardBackedLocalSessionCache).toHaveBeenCalledTimes(1);
  });

  it('cancelar conserva la sesión y los cambios', async () => {
    (countPendingLocalChanges as jest.Mock).mockResolvedValue(3);
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());
    await press('Cancelar');

    expect(uploadPendingLocalChanges).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('si no puede contar los pendientes no promete que no haya', async () => {
    (countPendingLocalChanges as jest.Mock).mockRejectedValue(
      new Error('bloqueada'),
    );
    (uploadPendingLocalChanges as jest.Mock).mockRejectedValue(
      new Error('bloqueada'),
    );
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());
    expect(lastAlert().message).toContain('No pudimos comprobar');
    await press('Subir y cerrar sesión');

    expect(lastAlert().message).toContain('No pudimos comprobar');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('un doble toque no lanza dos subidas', async () => {
    (countPendingLocalChanges as jest.Mock).mockResolvedValue(1);
    let finishUpload: (remaining: number) => void = () => undefined;
    (uploadPendingLocalChanges as jest.Mock).mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          finishUpload = resolve;
        }),
    );
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());
    const upload = lastAlert().buttons.find(
      (item) => item.text === 'Subir y cerrar sesión',
    );
    await act(async () => {
      upload?.onPress?.();
      upload?.onPress?.();
    });
    await act(async () => finishUpload(0));

    expect(uploadPendingLocalChanges).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('el reinicio del onboarding ya confirmado cierra sin preguntar otra vez', async () => {
    const afterSignOut = jest.fn(async () => undefined);
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() =>
      result.current.requestSignOut({ afterSignOut, isConfirmed: true }),
    );

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(afterSignOut).toHaveBeenCalledTimes(1);
    expect(createJuntossAuthGateway).toHaveBeenCalled();
  });

  it('avisa de lo que no se guarda en la cuenta aunque no haya pendientes', async () => {
    (countDeviceOnlyData as jest.Mock).mockResolvedValue({
      importBatches: 1,
      notificationRules: 3,
    });
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());

    expect(lastAlert().title).toBe('Cerrar sesión');
    expect(lastAlert().message).toContain(
      'Esto no se guarda en tu cuenta y también se borrará: 1 importación sin terminar y 3 configuraciones de recordatorios.',
    );
    await press('Cerrar sesión');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('lo menciona antes de subir, porque una subida correcta cierra sin otro aviso', async () => {
    (countPendingLocalChanges as jest.Mock).mockResolvedValue(2);
    (countDeviceOnlyData as jest.Mock).mockResolvedValue({
      importBatches: 0,
      notificationRules: 1,
    });
    (uploadPendingLocalChanges as jest.Mock).mockResolvedValue(1);
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() => result.current.requestSignOut());
    expect(lastAlert().message).toContain('1 configuración de recordatorios');

    await press('Subir y cerrar sesión');
    expect(lastAlert().title).toBe('No pudimos subir tus cambios');
    expect(lastAlert().message).toContain('1 configuración de recordatorios');
  });

  it('el reinicio del onboarding ya confirmado pregunta si se perderían datos sin subida', async () => {
    (countDeviceOnlyData as jest.Mock).mockResolvedValue({
      importBatches: 2,
      notificationRules: 0,
    });
    const afterSignOut = jest.fn(async () => undefined);
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() =>
      result.current.requestSignOut({ afterSignOut, isConfirmed: true }),
    );

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(lastAlert().message).toContain('2 importaciones sin terminar');
  });

  it('el usuario demo reinicia el onboarding sin ofrecer subidas imposibles', async () => {
    (isDemoSessionActive as jest.Mock).mockReturnValue(true);
    (countPendingLocalChanges as jest.Mock).mockResolvedValue(5);
    const afterSignOut = jest.fn(async () => undefined);
    const { result } = await renderHook(() => useSignOutFlow());

    await act(() =>
      result.current.requestSignOut({ afterSignOut, isConfirmed: true }),
    );

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(countPendingLocalChanges).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(afterSignOut).toHaveBeenCalledTimes(1);
    (isDemoSessionActive as jest.Mock).mockReturnValue(false);
  });
});
