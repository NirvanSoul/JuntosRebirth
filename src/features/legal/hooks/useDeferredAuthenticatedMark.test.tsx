import type { Session } from '@supabase/supabase-js';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Pressable } from 'react-native';

import { useDeferredAuthenticatedMark } from '@/features/legal/hooks/useDeferredAuthenticatedMark';
import type { LegalSessionGate } from '@/features/legal/hooks/useLegalSessionGate';
import { renderWithTheme } from '@/test/renderWithTheme';

const mockMarkAuthenticated = jest.fn();

jest.mock('@/state/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({ markAuthenticated: mockMarkAuthenticated }),
}));

let mockGateState: LegalSessionGate;

jest.mock('@/features/legal/hooks/useLegalSessionGate', () => ({
  useLegalSessionGate: () => mockGateState,
  useRecoveryHold: () => mockGateState.setRecoveryHold,
  resetLegalSessionGateForTests: jest.fn(),
}));

const session = {
  user: { id: 'user-1', email: 'ana@ejemplo.com' },
} as unknown as Session;

function createGateState(kind: 'no-session' | 'cleared'): LegalSessionGate {
  const isCleared = kind === 'cleared';
  return {
    session: isCleared ? session : null,
    rawSession: isCleared ? session : null,
    isReady: true,
    gateReady: true,
    isLegallyEnabled: true,
    status: isCleared ? { kind: 'cleared' } : { kind: 'no-session' },
    error: null,
    missingDocuments: [],
    retryGate: jest.fn(),
    submitRegularization: jest.fn(),
    abandonSession: jest.fn(),
    setRecoveryHold: jest.fn(),
  };
}

function Harness() {
  const { scheduleMarkAuthenticated } = useDeferredAuthenticatedMark();
  return <Pressable onPress={scheduleMarkAuthenticated} testID="schedule" />;
}

describe('useDeferredAuthenticatedMark — solo una sesión comprobada se marca', () => {
  beforeEach(() => {
    mockMarkAuthenticated.mockReset();
    mockGateState = createGateState('no-session');
  });

  it('una sesión aún sin comprobar nunca se marca, aunque el snapshot siga siendo el permisivo del invitado (B2)', async () => {
    const screen = await renderWithTheme(<Harness />);

    // El OTP acaba de crear la sesión pero la puerta todavía no ha publicado
    // nada: el snapshot que ve el host es aún «no-session» (permisivo). Marcar
    // ahora sería afirmar que una sesión sin comprobar tiene evidencia legal.
    await fireEvent.press(screen.getByTestId('schedule'));

    expect(mockMarkAuthenticated).not.toHaveBeenCalled();

    // Solo cuando la puerta confirma la evidencia se marca exactamente una vez.
    mockGateState = createGateState('cleared');
    await screen.rerender(<Harness />);

    await waitFor(() => expect(mockMarkAuthenticated).toHaveBeenCalledTimes(1));
  });

  it('con la sesión ya comprobada, marcar es inmediato', async () => {
    mockGateState = createGateState('cleared');
    const screen = await renderWithTheme(<Harness />);

    await fireEvent.press(screen.getByTestId('schedule'));

    expect(mockMarkAuthenticated).toHaveBeenCalledTimes(1);
  });
});
