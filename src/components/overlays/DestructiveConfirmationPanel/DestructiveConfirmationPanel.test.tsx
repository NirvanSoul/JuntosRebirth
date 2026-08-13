import { fireEvent } from '@testing-library/react-native';

import { DestructiveConfirmationPanel } from '@/components/overlays/DestructiveConfirmationPanel/DestructiveConfirmationPanel';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('DestructiveConfirmationPanel', () => {
  it('exige una elección explícita antes de confirmar la eliminación', async () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const screen = await renderWithTheme(
      <DestructiveConfirmationPanel
        description="Esta acción no se puede deshacer."
        onCancel={onCancel}
        onConfirm={onConfirm}
        title="¿Eliminar este elemento?"
      />,
    );

    expect(onConfirm).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
