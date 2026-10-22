import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient } from '@/services/api/juntossApiClient';
import {
  clearDemoSession,
  resetDemoSessionStoreForTests,
  saveDemoSession,
} from '@/state/demoSession/demoSessionStore';

describe('juntossApiClient con usuario demo', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');

  beforeEach(async () => {
    await AsyncStorage.clear();
    resetDemoSessionStoreForTests();
    fetchSpy.mockReset();
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterAll(() => fetchSpy.mockRestore());

  it('no deja salir ninguna petición mientras el demo está activo', async () => {
    await saveDemoSession({
      userId: 'demo-self',
      displayName: 'Angélica',
      email: 'angelica@demo.juntoss.invalid',
      partnerUserId: 'demo-partner',
      partnerDisplayName: 'Manuel',
      currency: 'EUR',
      createdAt: '2026-10-17T10:00:00.000Z',
      previousCurrencyPreferences: null,
    });

    await expect(
      apiClient.post('/v1/spaces/personal/sync', { transactions: [] }),
    ).rejects.toMatchObject({ code: 'DEMO_SESSION', status: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('vuelve a conectar con la API al eliminar el demo', async () => {
    await clearDemoSession();

    await apiClient.get('/v1/me');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
