import { fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { RestartOnboardingRow } from '@/features/settings/components/RestartOnboardingRow/RestartOnboardingRow';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('RestartOnboardingRow', () => {
  it('confirma y ejecuta el reinicio solicitado', async () => {
    const onRestart = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();

    try {
      const screen = await renderWithTheme(
        <RestartOnboardingRow onRestart={onRestart} />,
      );

      await fireEvent.press(screen.getByText('Reiniciar onboarding'));
      const actions = alertSpy.mock.calls[0]?.[2];
      actions?.[1]?.onPress?.();

      expect(onRestart).toHaveBeenCalledTimes(1);
    } finally {
      alertSpy.mockRestore();
    }
  });
});
