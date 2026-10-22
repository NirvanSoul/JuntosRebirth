import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import {
  clearDemoSession,
  isDemoSessionActive,
  loadDemoSession,
  resetDemoSessionStoreForTests,
  saveDemoSession,
  useDemoSession,
  type DemoSession,
} from '@/state/demoSession/demoSessionStore';

const demoSession: DemoSession = {
  userId: 'demo-self',
  displayName: 'Angélica',
  email: 'angelica@demo.juntoss.invalid',
  partnerUserId: 'demo-partner',
  partnerDisplayName: 'Manuel',
  currency: 'EUR',
  createdAt: '2026-10-17T10:00:00.000Z',
  previousCurrencyPreferences: '["USD"]',
};

describe('demoSessionStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetDemoSessionStoreForTests();
  });

  it('no hay demo hasta que se crea uno', async () => {
    await expect(loadDemoSession()).resolves.toBeNull();
    expect(isDemoSessionActive()).toBe(false);
  });

  it('recupera el demo guardado tras reabrir la app', async () => {
    await saveDemoSession(demoSession);
    resetDemoSessionStoreForTests();

    await expect(loadDemoSession()).resolves.toEqual(demoSession);
    expect(isDemoSessionActive()).toBe(true);
  });

  it('descarta un guardado corrupto en vez de abrir una sesión rota', async () => {
    await AsyncStorage.setItem(
      '@juntoss/demo-session/v1',
      JSON.stringify({ ...demoSession, currency: 'XXX' }),
    );

    await expect(loadDemoSession()).resolves.toBeNull();
  });

  it('avisa a la interfaz al crear y al eliminar el demo', async () => {
    const { result } = await renderHook(() => useDemoSession());
    expect(result.current).toEqual({ isReady: true, demoSession: null });

    await act(() => saveDemoSession(demoSession));
    expect(result.current.demoSession).toEqual(demoSession);

    await act(() => clearDemoSession());
    expect(result.current.demoSession).toBeNull();
    expect(isDemoSessionActive()).toBe(false);
  });
});
