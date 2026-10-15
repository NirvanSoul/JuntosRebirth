import { Alert, StyleSheet } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';

import { ProfileEditorModal } from '@/features/profile/components/ProfileEditorModal';
import { useProfileAvatar } from '@/features/profile/hooks/useProfileAvatar';
import { useProfileDisplayName } from '@/features/profile/hooks/useProfileDisplayName';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('@/features/profile/hooks/useProfileAvatar');
jest.mock('@/features/profile/hooks/useProfileDisplayName');

const mockUseProfileAvatar = jest.mocked(useProfileAvatar);
const mockUseProfileDisplayName = jest.mocked(useProfileDisplayName);
const changeAvatar = jest.fn();
const removeAvatar = jest.fn();
const saveDisplayName = jest.fn(async () => true);

describe('ProfileEditorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfileAvatar.mockReturnValue({
      avatarUri: 'file:///avatar.jpg?v=1',
      stage: 'idle',
      isBusy: false,
      progressLabel: null,
      errorCopy: null,
      changeAvatar,
      removeAvatar,
      dismissError: jest.fn(),
    });
    mockUseProfileDisplayName.mockReturnValue({
      displayName: 'Ana',
      isSaving: false,
      error: null,
      saveDisplayName,
      dismissError: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('guarda el nombre editado y cierra al terminar', async () => {
    const onClose = jest.fn();
    const screen = await renderWithTheme(
      <ProfileEditorModal onClose={onClose} visible />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('profile-editor-save-button').props.style,
      ).alignSelf,
    ).toBe('stretch');

    await fireEvent.changeText(
      screen.getByTestId('profile-editor-name-input'),
      'Luz',
    );
    await waitFor(() =>
      expect(screen.getByTestId('profile-editor-name-input').props.value).toBe(
        'Luz',
      ),
    );
    await fireEvent.press(screen.getByTestId('profile-editor-save-button'));

    await waitFor(() => {
      expect(saveDisplayName).toHaveBeenCalledWith('Luz');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('ofrece cámara y galería, y deja quitar la foto como acción visible', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    const screen = await renderWithTheme(
      <ProfileEditorModal onClose={jest.fn()} visible />,
    );

    await fireEvent.press(screen.getByTestId('profile-editor-avatar-button'));
    const buttons = alertSpy.mock.calls[0]![2] as {
      text: string;
      onPress?: () => void;
    }[];

    buttons
      .find((button) => button.text === 'Elegir de la galería')
      ?.onPress?.();
    expect(buttons.map((button) => button.text)).toEqual([
      'Cancelar',
      'Tomar foto',
      'Elegir de la galería',
    ]);
    await fireEvent.press(screen.getByTestId('profile-editor-remove-avatar'));

    expect(changeAvatar).toHaveBeenCalledWith('library');
    expect(removeAvatar).toHaveBeenCalledTimes(1);
  });

  it('anuncia y muestra deshabilitada la acción de quitar durante una operación', async () => {
    mockUseProfileAvatar.mockReturnValue({
      avatarUri: 'file:///avatar.jpg?v=1',
      stage: 'uploading',
      isBusy: true,
      progressLabel: 'Guardando foto…',
      errorCopy: null,
      changeAvatar,
      removeAvatar,
      dismissError: jest.fn(),
    });
    const screen = await renderWithTheme(
      <ProfileEditorModal onClose={jest.fn()} visible />,
    );

    const removeButton = screen.getByTestId('profile-editor-remove-avatar');
    expect(removeButton.props.accessibilityState).toEqual({ disabled: true });
    expect(StyleSheet.flatten(removeButton.props.style).opacity).toBe(0.5);
  });
});
