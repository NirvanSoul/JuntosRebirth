import {
  setClarityAnalyticsEnabled,
  trackClarityScreen,
} from './clarityAnalytics';

jest.mock('@microsoft/react-native-clarity', () => {
  throw new Error('El SDK no debe cargarse sin el módulo nativo');
});

it('permite activar, desactivar y navegar sin cargar Clarity en Expo Go', async () => {
  await expect(setClarityAnalyticsEnabled(true)).resolves.toBeUndefined();
  await expect(trackClarityScreen('Home')).resolves.toBeUndefined();
  await expect(setClarityAnalyticsEnabled(false)).resolves.toBeUndefined();
  await expect(setClarityAnalyticsEnabled(true)).resolves.toBeUndefined();
});
