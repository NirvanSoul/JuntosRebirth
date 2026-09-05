import { fireEvent } from '@testing-library/react-native';

import { SpaceCountryMismatchModal } from '@/features/spaces/components/SpaceCountryMismatchModal';
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

describe('SpaceCountryMismatchModal', () => {
  it('explica la incompatibilidad y lleva a País y moneda', async () => {
    const onClose = jest.fn();
    const onOpenCountrySettings = jest.fn();
    const screen = await renderWithTheme(
      <SpaceCountryMismatchModal
        onClose={onClose}
        onOpenCountrySettings={onOpenCountrySettings}
        visible
      />,
    );

    expect(
      screen.getByText('No pueden compartir este espacio todavía'),
    ).toBeTruthy();
    expect(screen.getByText(/ambos deben tener el mismo país/i)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Ir a ajustes'));
    expect(onOpenCountrySettings).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByLabelText('Entendido'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
