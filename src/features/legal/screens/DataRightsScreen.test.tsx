import { fireEvent } from '@testing-library/react-native';

import { DataRightsScreen } from '@/features/legal/screens/DataRightsScreen';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/legal/services/dataDeletionService', () => ({
  deleteAccountAndData: jest.fn(),
  deleteDataButKeepAccount: jest.fn(),
}));
jest.mock('@/features/legal/services/dataExportService', () => ({
  exportMyData: jest.fn(),
}));

describe('DataRightsScreen', () => {
  it('ofrece borrar datos sin borrar la cuenta y explica su alcance', async () => {
    const screen = await renderWithTheme(
      <DataRightsScreen onClose={jest.fn()} visible />,
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Eliminar mis datos' }),
    );

    expect(await screen.findByText('Eliminarás todos tus datos')).toBeTruthy();
    expect(screen.getByText(/Tu cuenta seguirá existiendo/)).toBeTruthy();
    expect(screen.queryByText('Eliminar cuenta y datos')).toBeTruthy();
  });
});
