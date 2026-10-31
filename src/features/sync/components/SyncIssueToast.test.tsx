import { act, fireEvent } from '@testing-library/react-native';

import {
  offlineNoticeDelayMs,
  SyncIssueToast,
} from '@/features/sync/components/SyncIssueToast';
import type { SyncIssue } from '@/features/sync/hooks/useSessionStartup';
import { renderWithTheme } from '@/test/renderWithTheme';

let networkListener: ((state: object) => void) | null = null;

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isInternetReachable: true })),
  addNetworkStateListener: (listener: (state: object) => void) => {
    networkListener = listener;
    return { remove: jest.fn() };
  },
}));

const offlineText =
  'Sin conexión. Tus cambios se guardan aquí y se subirán al reconectar.';

async function renderToast(issue: SyncIssue | null = null) {
  const onRetry = jest.fn();
  const onDismiss = jest.fn();
  const screen = await renderWithTheme(
    <SyncIssueToast issue={issue} onDismiss={onDismiss} onRetry={onRetry} />,
  );
  return { ...screen, onDismiss, onRetry };
}

async function setReachable(isInternetReachable: boolean) {
  await act(async () => networkListener?.({ isInternetReachable }));
}

describe('SyncIssueToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    networkListener = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignora un corte breve y fija el aviso cuando la desconexión se mantiene', async () => {
    const screen = await renderToast();

    await setReachable(false);
    await act(async () => {
      jest.advanceTimersByTime(offlineNoticeDelayMs - 100);
    });
    expect(screen.queryByText(offlineText)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByText(offlineText)).toBeTruthy();
    expect(screen.getByTestId('sync-issue-toast-offline-icon')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();

    // No se retira solo mientras siga sin red.
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByText(offlineText)).toBeTruthy();
  });

  it('se oculta al tocarlo y confirma brevemente al recuperar la red', async () => {
    const screen = await renderToast();
    await setReachable(false);
    await act(async () => {
      jest.advanceTimersByTime(offlineNoticeDelayMs);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('sync-issue-toast'));
    });
    expect(screen.queryByText(offlineText)).toBeNull();

    await setReachable(true);
    expect(screen.getByText('Conexión recuperada.')).toBeTruthy();
  });

  it('trata un fallo de red como sin conexión aunque el sistema diga que hay red, con reintento', async () => {
    const screen = await renderToast({ id: 1, kind: 'offline' });

    expect(screen.getByText(offlineText)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    });
    expect(screen.onRetry).toHaveBeenCalledTimes(1);
  });
});
