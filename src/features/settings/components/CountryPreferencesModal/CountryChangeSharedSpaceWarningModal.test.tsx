import { fireEvent } from '@testing-library/react-native';

import { CountryChangeSharedSpaceWarningModal } from '@/features/settings/components/CountryPreferencesModal/CountryChangeSharedSpaceWarningModal';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

describe('CountryChangeSharedSpaceWarningModal', () => {
  it('explica la salida del espacio compartido antes de confirmar', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const screen = await renderWithTheme(
      <CountryChangeSharedSpaceWarningModal
        countryName="Venezuela"
        onCancel={onCancel}
        onConfirm={onConfirm}
        visible
      />,
    );

    expect(screen.getByText(/dejarás tu espacio compartido/i)).toBeTruthy();
    expect(
      screen.getByText(/finanzas personales no se borrarán/i),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Cambiar país'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByLabelText('Cancelar cambio de país'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
