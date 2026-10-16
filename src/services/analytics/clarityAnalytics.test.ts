const mockInitialize = jest.fn();
const mockConsent = jest.fn(async () => true);
const mockPause = jest.fn(async () => true);
const mockResume = jest.fn(async () => true);
const mockIsPaused = jest.fn(async () => false);
const mockSetCurrentScreenName = jest.fn(async () => true);

jest.mock('@microsoft/react-native-clarity', () => ({
  LogLevel: { None: 'None' },
  consent: mockConsent,
  initialize: mockInitialize,
  isPaused: mockIsPaused,
  pause: mockPause,
  resume: mockResume,
  setCurrentScreenName: mockSetCurrentScreenName,
}));

// Los mocks del módulo nativo deben registrarse antes de cargar el adaptador.
// eslint-disable-next-line import/first
import {
  setClarityAnalyticsEnabled,
  trackClarityScreen,
} from '@/services/analytics/clarityAnalytics';

describe('clarityAnalytics', () => {
  it('no inicializa ni captura antes del consentimiento', async () => {
    await trackClarityScreen('Access');
    await setClarityAnalyticsEnabled(false);

    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockConsent).not.toHaveBeenCalled();
    expect(mockPause).not.toHaveBeenCalled();
  });

  it('inicializa una vez, aplica consentimiento y permite detener la captura', async () => {
    await trackClarityScreen('Home');
    await setClarityAnalyticsEnabled(true);

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledWith('yyk3h5w44v', {
      logLevel: 'None',
    });
    expect(mockConsent).toHaveBeenCalledWith(false, true);
    expect(mockSetCurrentScreenName).toHaveBeenCalledWith('Home');

    await setClarityAnalyticsEnabled(false);

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockConsent).toHaveBeenLastCalledWith(false, false);
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('reanuda una sesión pausada al volver a activar la analítica', async () => {
    mockIsPaused.mockResolvedValueOnce(true);

    await setClarityAnalyticsEnabled(true);

    expect(mockResume).toHaveBeenCalledTimes(1);
  });
});
