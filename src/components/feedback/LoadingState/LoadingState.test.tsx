import { useEffect } from 'react';

import { LoadingState } from '@/components/feedback/LoadingState/LoadingState';
import { Text } from '@/components/ui/Text/Text';
import { renderWithTheme } from '@/test/renderWithTheme';
import { darkColors } from '@/theme/colors';

it('monta el contenido solo al estar listo, sin esperar al final de la animación', async () => {
  const onMount = jest.fn();
  const onUnmount = jest.fn();
  function Content() {
    useEffect(() => {
      onMount();
      return onUnmount;
    }, []);
    return <Text variant="body">Tu espacio</Text>;
  }

  const screen = await renderWithTheme(
    <LoadingState loading>
      <Content />
    </LoadingState>,
  );
  expect(screen.getByRole('progressbar')).toBeTruthy();
  const loadingTrack = screen.getByTestId('app-loading-track');
  const loadingLogo = screen.getByTestId('app-loading-logo');
  expect(
    screen.getByTestId('app-loading-logo-image', {
      includeHiddenElements: true,
    }).props.width,
  ).toBe(144);
  expect(loadingTrack.parent).toBe(loadingLogo.parent);
  expect(loadingTrack.parent?.children.indexOf(loadingTrack)).toBeLessThan(
    loadingLogo.parent?.children.indexOf(loadingLogo) ?? Infinity,
  );
  expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe(
    'Cargando Juntos',
  );
  expect(onMount).not.toHaveBeenCalled();

  await screen.rerender(
    <LoadingState loading={false}>
      <Content />
    </LoadingState>,
  );
  expect(screen.getByText('Tu espacio')).toBeTruthy();
  expect(screen.queryByRole('progressbar')).toBeNull();
  expect(onMount).toHaveBeenCalledTimes(1);

  await screen.rerender(
    <LoadingState loading={false}>
      <Content />
    </LoadingState>,
  );
  expect(onMount).toHaveBeenCalledTimes(1);

  await screen.rerender(
    <LoadingState loading>
      <Content />
    </LoadingState>,
  );
  expect(screen.queryByText('Tu espacio')).toBeNull();
  expect(onUnmount).toHaveBeenCalledTimes(1);
});

it('pinta el logo de carga en blanco solo con el modo oscuro', async () => {
  const darkScreen = await renderWithTheme(<LoadingState />, {
    appearance: 'dark',
  });
  expect(
    darkScreen.getByTestId('app-loading-logo-image', {
      includeHiddenElements: true,
    }).props.color,
  ).toBe(darkColors.onBrand);
  await darkScreen.unmount();

  const lightScreen = await renderWithTheme(<LoadingState />, {
    appearance: 'light',
  });
  expect(
    lightScreen.getByTestId('app-loading-logo-image', {
      includeHiddenElements: true,
    }).props.color,
  ).toBeUndefined();
  await lightScreen.unmount();
});

it('como capa cubre el contenido sin desmontarlo y lo devuelve al terminar', async () => {
  const onUnmount = jest.fn();
  function Content() {
    useEffect(() => onUnmount, []);
    return <Text variant="body">Tu espacio</Text>;
  }

  const screen = await renderWithTheme(
    <LoadingState loading={false} overlay>
      <Content />
    </LoadingState>,
  );
  expect(screen.getByText('Tu espacio')).toBeTruthy();

  await screen.rerender(
    <LoadingState loading overlay>
      <Content />
    </LoadingState>,
  );
  expect(screen.getByRole('progressbar')).toBeTruthy();
  expect(screen.getByTestId('app-loading').props.pointerEvents).toBe('auto');
  // Sigue montado, pero oculto para lectores de pantalla mientras carga.
  expect(screen.queryByText('Tu espacio')).toBeNull();
  expect(
    screen.getByText('Tu espacio', { includeHiddenElements: true }),
  ).toBeTruthy();

  await screen.rerender(
    <LoadingState loading={false} overlay>
      <Content />
    </LoadingState>,
  );
  expect(screen.getByText('Tu espacio')).toBeTruthy();
  expect(onUnmount).not.toHaveBeenCalled();
});
