import { useEffect } from 'react';

import { LoadingState } from '@/components/feedback/LoadingState/LoadingState';
import { Text } from '@/components/ui/Text/Text';
import { renderWithTheme } from '@/test/renderWithTheme';

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
  expect(screen.getByTestId('app-loading-logo')).toBeTruthy();
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
