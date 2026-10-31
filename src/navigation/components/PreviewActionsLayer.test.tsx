import { fireEvent, waitFor } from '@testing-library/react-native';
import { type MeasureInWindowOnSuccessCallback, View } from 'react-native';

import type { PreviewAction } from '@/components/overlays/PreviewActions/previewActions';
import { CategoryPreviewCard } from '@/features/categories/components/CategoryPreviewCard/CategoryPreviewCard';
import { TransactionPreviewCard } from '@/features/transactions/components/TransactionPreviewCard/TransactionPreviewCard';
import type { SessionTransaction } from '@/features/transactions/types';
import { PreviewActionsLayer } from '@/navigation/components/PreviewActionsLayer';
import { renderWithTheme } from '@/test/renderWithTheme';

jest.mock('expo-blur', () => ({ BlurView: () => null }));

const Icon = () => null;

function renderCard(actions: readonly PreviewAction[] | null) {
  const resolveActions = jest.fn(() => actions);
  const onPress = jest.fn();
  const screen = renderWithTheme(
    <PreviewActionsLayer resolveActions={resolveActions}>
      <CategoryPreviewCard
        actionTarget={{ kind: 'transaction', id: 'transaction-1' }}
        colorToken="slate"
        icon="receipt"
        name="Supermercado"
        onPress={onPress}
        testID="card"
        variant="compact"
      />
    </PreviewActionsLayer>,
  );
  return { onPress, resolveActions, screen };
}

const transactions: SessionTransaction[] = [
  'transaction-1',
  'transaction-2',
].map((id, index) => ({
  amountMinor: 500,
  categoryId: 'category-1',
  createdBy: 'user-1',
  currency: 'EUR',
  id,
  occurredOn: '2026-10-03',
  recurrence: 'once',
  spaceId: 'personal',
  title: `Movimiento ${index + 1}`,
  type: 'expense',
  updatedAt: '2026-10-03T12:00:00.000Z',
}));

/** Acciones de un movimiento: eliminar sobre todos los `ids` recibidos. */
function renderTransactionCards(onDelete: (ids: readonly string[]) => void) {
  const onPress = jest.fn();
  const resolveActions = jest.fn(
    ({ ids }: { ids: readonly string[] }): readonly PreviewAction[] => [
      {
        key: 'delete',
        kind: 'confirm',
        accessibilityLabel: 'Eliminar movimiento',
        confirmation: {
          title: `¿Eliminar ${ids.length}?`,
          description: 'Dejarán de aparecer.',
        },
        icon: Icon,
        onConfirm: () => onDelete(ids),
      },
    ],
  );
  const screen = renderWithTheme(
    <PreviewActionsLayer resolveActions={resolveActions}>
      {transactions.map((transaction) => (
        <TransactionPreviewCard
          category={null}
          key={transaction.id}
          onPress={onPress}
          transaction={transaction}
        />
      ))}
    </PreviewActionsLayer>,
  );
  return { onPress, screen };
}

async function longPressCard(
  screen: Awaited<ReturnType<typeof renderCard>['screen']>,
  card = screen.getByTestId('card'),
) {
  // El entorno de pruebas no mide vistas: se simula la posición en ventana.
  // El `View` simulado es una clase con los métodos nativos en el prototipo.
  const viewPrototype = View.prototype as {
    measureInWindow: (callback: MeasureInWindowOnSuccessCallback) => void;
  };
  jest
    .spyOn(viewPrototype, 'measureInWindow')
    .mockImplementation((callback) => callback(20, 400, 60, 74));
  await fireEvent(card, 'longPress');
}

describe('PreviewActionsLayer', () => {
  afterEach(() => jest.restoreAllMocks());

  it('abre la superposición con las acciones del elemento al mantener pulsada la tarjeta', async () => {
    const onEdit = jest.fn();
    const { onPress, resolveActions, screen } = renderCard([
      {
        key: 'edit',
        kind: 'run',
        accessibilityLabel: 'Editar movimiento',
        icon: Icon,
        onPress: onEdit,
      },
    ]);
    const rendered = await screen;

    await longPressCard(rendered);

    expect(resolveActions).toHaveBeenCalledWith({
      kind: 'transaction',
      ids: ['transaction-1'],
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(rendered.getByTestId('preview-actions-overlay')).toBeTruthy();

    await fireEvent.press(rendered.getByLabelText('Editar movimiento'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(rendered.queryByTestId('preview-actions-overlay')).toBeNull(),
    );
  });

  it('pide confirmación en la propia superposición antes de eliminar', async () => {
    const onDelete = jest.fn();
    const { screen } = renderCard([
      {
        key: 'delete',
        kind: 'confirm',
        accessibilityLabel: 'Eliminar movimiento',
        confirmation: {
          title: '¿Eliminar este movimiento?',
          description: 'Dejará de aparecer en este espacio.',
        },
        icon: Icon,
        onConfirm: onDelete,
      },
    ]);
    const rendered = await screen;
    await longPressCard(rendered);

    await fireEvent.press(rendered.getByLabelText('Eliminar movimiento'));

    expect(onDelete).not.toHaveBeenCalled();
    expect(rendered.getByText('¿Eliminar este movimiento?')).toBeTruthy();

    await fireEvent.press(rendered.getByText('Eliminar'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('en una tarjeta horizontal, eliminar abre la selección de varias', async () => {
    const onDelete = jest.fn();
    const { onPress, screen } = renderTransactionCards(onDelete);
    const rendered = await screen;
    const [first, second] = rendered.getAllByTestId('transaction-preview-card');
    await longPressCard(rendered, first);

    await fireEvent.press(rendered.getByLabelText('Eliminar movimiento'));

    expect(onDelete).not.toHaveBeenCalled();
    expect(rendered.getByText('1 seleccionado')).toBeTruthy();
    // Los círculos son decorativos para el lector: la tarjeta lleva el estado.
    expect(
      rendered.getAllByTestId('preview-selection-checked', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(1);

    // Tocar otra tarjeta la marca en lugar de abrir su detalle.
    await fireEvent.press(second!);
    expect(onPress).not.toHaveBeenCalled();
    expect(rendered.getByText('2 seleccionados')).toBeTruthy();

    await fireEvent.press(rendered.getByTestId('preview-selection-delete'));
    expect(rendered.getByText('¿Eliminar 2?')).toBeTruthy();
    await fireEvent.press(rendered.getByText('Eliminar 2'));

    expect(onDelete).toHaveBeenCalledWith(['transaction-1', 'transaction-2']);
    await waitFor(() =>
      expect(rendered.queryByTestId('preview-selection-bar')).toBeNull(),
    );
    await waitFor(() =>
      expect(
        rendered.queryByTestId('preview-selection-check', {
          includeHiddenElements: true,
        }),
      ).toBeNull(),
    );
  });

  it('al copiar baja la barra y, si se cierra el selector, conserva lo marcado', async () => {
    const onPress = jest.fn();
    const resolveActions = jest.fn(
      ({ ids }: { ids: readonly string[] }): readonly PreviewAction[] => [
        {
          key: 'copy',
          kind: 'copyToSpace',
          accessibilityLabel: 'Copiar movimiento a otro espacio',
          icon: Icon,
          request: {
            failureMessage: () => 'No se pudo copiar.',
            itemName: `${ids.length} movimientos`,
            onSelect: () => true,
            targets: [{ id: 'space-2', name: 'Pareja' }],
          },
        },
      ],
    );
    const rendered = await renderWithTheme(
      <PreviewActionsLayer resolveActions={resolveActions}>
        {transactions.map((transaction) => (
          <TransactionPreviewCard
            category={null}
            key={transaction.id}
            onPress={onPress}
            transaction={transaction}
          />
        ))}
      </PreviewActionsLayer>,
    );
    const [first, second] = rendered.getAllByTestId('transaction-preview-card');
    await longPressCard(rendered, first);
    await fireEvent.press(
      rendered.getByLabelText('Copiar movimiento a otro espacio'),
    );
    await fireEvent.press(second!);

    await fireEvent.press(rendered.getByTestId('preview-selection-copy'));
    await waitFor(() =>
      expect(rendered.queryByTestId('preview-selection-bar')).toBeNull(),
    );
    expect(rendered.getByText('2 movimientos')).toBeTruthy();

    await fireEvent.press(rendered.getByLabelText('Cerrar'));
    expect(await rendered.findByText('2 seleccionados')).toBeTruthy();
  });

  it('cancelar la selección devuelve las tarjetas a su toque normal', async () => {
    const { onPress, screen } = renderTransactionCards(jest.fn());
    const rendered = await screen;
    const [first, second] = rendered.getAllByTestId('transaction-preview-card');
    await longPressCard(rendered, first);
    await fireEvent.press(rendered.getByLabelText('Eliminar movimiento'));

    await fireEvent.press(rendered.getByTestId('preview-selection-cancel'));
    await fireEvent.press(second!);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('cierra sin ejecutar nada al tocar fuera', async () => {
    const onEdit = jest.fn();
    const { screen } = renderCard([
      {
        key: 'edit',
        kind: 'run',
        accessibilityLabel: 'Editar movimiento',
        icon: Icon,
        onPress: onEdit,
      },
    ]);
    const rendered = await screen;
    await longPressCard(rendered);

    await fireEvent.press(rendered.getByTestId('preview-actions-backdrop'));

    expect(onEdit).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(rendered.queryByTestId('preview-actions-overlay')).toBeNull(),
    );
  });

  it('abre el selector de espacio para copiar', async () => {
    const onSelect = jest.fn(() => true);
    const { screen } = renderCard([
      {
        key: 'copy',
        kind: 'copyToSpace',
        accessibilityLabel: 'Copiar movimiento a otro espacio',
        icon: Icon,
        request: {
          failureMessage: () => 'No se pudo copiar.',
          itemName: 'Supermercado',
          onSelect,
          targets: [{ id: 'space-2', name: 'Pareja' }],
        },
      },
    ]);
    const rendered = await screen;
    await longPressCard(rendered);

    await fireEvent.press(
      rendered.getByLabelText('Copiar movimiento a otro espacio'),
    );

    expect(
      await rendered.findByTestId('preview-actions-space-picker-modal'),
    ).toBeTruthy();
  });

  it('no abre nada si el elemento no admite acciones', async () => {
    const { screen } = renderCard(null);
    const rendered = await screen;

    await longPressCard(rendered);

    expect(rendered.queryByTestId('preview-actions-overlay')).toBeNull();
  });
});
