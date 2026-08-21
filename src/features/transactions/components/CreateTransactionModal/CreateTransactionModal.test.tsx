import { act, fireEvent } from '@testing-library/react-native';
import { type ComponentProps, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';

import { CreateTransactionModal as ControlledCreateTransactionModal } from '@/features/transactions/components/CreateTransactionModal/CreateTransactionModal';
import type { Category } from '@/features/categories/types';
import type {
  CreateTransactionDraft,
  TransactionType,
} from '@/features/transactions/types';
import { renderWithTheme } from '@/test/renderWithTheme';
import { categoryColors } from '@/theme/categoryColors';
import { colors } from '@/theme/colors';
import { minTouchTarget } from '@/theme/layout';
import { shadows } from '@/theme/shadows';

import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

const category: Category = {
  id: 'personal-category-1',
  spaceId: 'personal',
  name: 'Comida',
  icon: 'fork-knife',
  colorToken: 'orange',
  isDefault: false,
  isArchived: false,
};

type CreateTransactionModalProps = Omit<
  ComponentProps<typeof ControlledCreateTransactionModal>,
  'onTypeChange' | 'spaceCurrency' | 'type'
> & {
  initialType: TransactionType;
  spaceCurrency?: CurrencyCode;
};

function CreateTransactionModal({
  initialType,
  spaceCurrency = 'EUR',
  ...props
}: CreateTransactionModalProps) {
  const [type, setType] = useState(initialType);

  return (
    <ControlledCreateTransactionModal
      {...props}
      onTypeChange={setType}
      spaceCurrency={spaceCurrency}
      type={type}
    />
  );
}

jest.mock('@/components/overlays/AppModal/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children: React.ReactNode;
    visible: boolean;
  }) => (visible ? children : null),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const { TextInput } = jest.requireActual('react-native');
  return { BottomSheetTextInput: TextInput };
});

describe('CreateTransactionModal', () => {
  it('usa la fecha inicial recibida desde otra pantalla', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialDate="2026-08-18"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    expect(
      screen.getByText(
        new Intl.DateTimeFormat('es-ES', {
          day: 'numeric',
          month: 'short',
        }).format(new Date('2026-08-18T12:00:00')),
      ),
    ).toBeTruthy();
  });

  it('precarga un movimiento existente y guarda sus cambios', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialDraft={{
          spaceId: 'personal',
          type: 'expense',
          amountMinor: 1250,
          currency: 'EUR',
          title: 'Almuerzo',
          categoryId: category.id,
          occurredOn: '2026-07-30',
          recurrence: 'monthly',
        }}
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        visible
      />,
    );

    expect(screen.getByLabelText('Título del movimiento').props.value).toBe(
      'Almuerzo',
    );
    expect(screen.getByLabelText('12,5 euros')).toBeTruthy();
    expect(screen.getByLabelText('Recurrencia: Mensual')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('Título del movimiento'),
      'Cena',
    );
    await fireEvent.press(screen.getByLabelText('Guardar cambios'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 1250,
        title: 'Cena',
        occurredOn: '2026-07-30',
        recurrence: 'monthly',
      }),
    );
  });

  it('permite introducir un importe y devuelve un gasto en unidades menores', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText(','));
    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 150,
        categoryId: category.id,
        spaceId: 'personal',
        type: 'expense',
      }),
    );
  });

  it.each([
    [
      'suma',
      ['1', 'Sumar', '2'],
      '1 + 2 euros, operación Sumar seleccionada',
      '3 euros',
    ],
    [
      'resta',
      ['5', 'Restar', '2'],
      '5 − 2 euros, operación Restar seleccionada',
      '3 euros',
    ],
    [
      'multiplicación',
      ['3', 'Multiplicar', '2'],
      '3 × 2 euros, operación Multiplicar seleccionada',
      '6 euros',
    ],
    [
      'división',
      ['8', 'Dividir', '2'],
      '8 ÷ 2 euros, operación Dividir seleccionada',
      '4 euros',
    ],
  ])(
    'muestra la operación de una %s en vez de calcularla y la resuelve al pulsar =',
    async (_operation, keys, expectedExpressionLabel, expectedResult) => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          visible
        />,
      );

      for (const key of keys) {
        await fireEvent.press(screen.getByLabelText(key));
      }

      expect(screen.getByLabelText(expectedExpressionLabel)).toBeTruthy();
      expect(screen.getByTestId('transaction-active-operator')).toBeTruthy();
      expect(screen.getByLabelText('Calcular resultado')).toBeTruthy();
      expect(screen.queryByLabelText('Agregar movimiento')).toBeNull();

      await fireEvent.press(screen.getByLabelText('Calcular resultado'));

      expect(screen.getByLabelText(expectedResult)).toBeTruthy();
      expect(screen.queryByTestId('transaction-active-operator')).toBeNull();
      expect(screen.getByLabelText('Agregar movimiento')).toBeTruthy();
    },
  );

  it('permite encadenar varias operaciones antes de calcular el resultado final', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText('0'));
    await fireEvent.press(screen.getByLabelText('0'));
    await fireEvent.press(screen.getByLabelText('Sumar'));
    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('0'));
    await fireEvent.press(screen.getByLabelText('Multiplicar'));

    expect(
      screen.getByLabelText(
        '100 + 50 × euros, operación Multiplicar seleccionada',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('2'));

    expect(
      screen.getByLabelText(
        '100 + 50 × 2 euros, operación Multiplicar seleccionada',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Calcular resultado'));

    expect(screen.getByLabelText('300 euros')).toBeTruthy();
  });

  it('permite cambiar el operador antes de introducir el segundo importe', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('Sumar'));
    expect(
      screen.getByTestId('transaction-active-operator').props.children,
    ).toBe('+');
    await fireEvent.press(screen.getByLabelText('Restar'));
    expect(
      screen.getByTestId('transaction-active-operator').props.children,
    ).toBe('−');
    await fireEvent.press(screen.getByLabelText('2'));

    expect(
      screen.getByLabelText('5 − 2 euros, operación Restar seleccionada'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Calcular resultado'));

    expect(screen.getByLabelText(/^3 euros/)).toBeTruthy();
  });

  it('permite borrar el operador y volver al importe anterior', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('Sumar'));

    const operator = screen.getByTestId('transaction-active-operator');

    expect(operator.props.children).toBe('+');
    expect(StyleSheet.flatten(operator.props.style).color).toBe(
      colors.textPrimary,
    );
    expect(screen.queryByTestId('transaction-amount-currency')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Borrar'));

    expect(screen.queryByTestId('transaction-active-operator')).toBeNull();
    expect(screen.getByLabelText('5 euros')).toBeTruthy();
    expect(screen.getByLabelText('Agregar movimiento')).toBeTruthy();
  });

  it('abre con el tipo solicitado y permite cambiar a ingreso', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={null}
        visible
      />,
    );

    expect(
      screen.getByLabelText('Gasto').props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(
      screen.getByTestId('transaction-type-indicator-expense'),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-type-indicator-expense').props.style,
      ).backgroundColor,
    ).toBe(colors.expense);
    expect(
      StyleSheet.flatten(screen.getByLabelText('Sumar').props.style)
        .backgroundColor,
    ).toBe(colors.keypad);
    expect(StyleSheet.flatten(screen.getByText('+').props.style).color).toBe(
      colors.expense,
    );

    await fireEvent.press(screen.getByLabelText('Ingreso'));

    expect(
      screen.getByLabelText('Ingreso').props.accessibilityState,
    ).toMatchObject({
      selected: true,
    });
    expect(
      screen.getByTestId('transaction-type-indicator-income'),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-type-indicator-income').props.style,
      ).backgroundColor,
    ).toBe(colors.income);
    expect(
      StyleSheet.flatten(screen.getByLabelText('Sumar').props.style)
        .backgroundColor,
    ).toBe(colors.keypad);
    expect(StyleSheet.flatten(screen.getByText('+').props.style).color).toBe(
      colors.income,
    );
    for (const symbol of ['÷', '×', '−', '+']) {
      expect(
        StyleSheet.flatten(screen.getByText(symbol).props.style).color,
      ).toBe(colors.income);
    }
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-amount-currency').props.style,
      ).color,
    ).toBe(colors.income);

    await fireEvent.press(screen.getByLabelText('Gasto'));

    for (const symbol of ['÷', '×', '−', '+']) {
      expect(
        StyleSheet.flatten(screen.getByText(symbol).props.style).color,
      ).toBe(colors.expense);
    }
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-amount-currency').props.style,
      ).color,
    ).toBe(colors.expense);
  });

  it('mantiene compactos y alineados a la izquierda los controles superiores', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-type-selector').props.style,
      ).width,
    ).toBeLessThan(260);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-metadata-row').props.style,
      ).justifyContent,
    ).toBe('flex-start');
    expect(screen.getByTestId('transaction-date-icon')).toBeTruthy();
    expect(screen.getByTestId('transaction-recurrence-icon')).toBeTruthy();
  });

  it('agrupa los millares mientras se introduce el importe', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText('0'));
    await fireEvent.press(screen.getByLabelText('0'));
    await fireEvent.press(screen.getByLabelText('0'));

    expect(screen.getByLabelText('1.000 euros')).toBeTruthy();
    expect(screen.getByTestId('transaction-amount')).toBeTruthy();
    expect(screen.getByTestId('transaction-amount-value')).toHaveTextContent(
      '1.000',
      { exact: false },
    );
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-amount-value').parent?.props.style,
      ),
    ).toMatchObject({
      width: '100%',
      justifyContent: 'center',
    });
    expect(
      screen.getByTestId('transaction-amount-value').props.adjustsFontSizeToFit,
    ).toBeUndefined();
    expect(
      screen.getByTestId('transaction-amount-currency').props.children,
    ).toBe(' €');
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-amount-currency').props.style,
      ).color,
    ).toBe(colors.expense);
  });

  it('no permite agregar un movimiento sin una categoría seleccionada', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={null}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText('5'));

    expect(
      screen.getByLabelText('Agregar movimiento').props.accessibilityState,
    ).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mantiene gris la categoría y aplica su color al borde, icono y CTA', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={null}
        visible
      />,
    );

    expect(
      screen.getByText('Agregar categoría').props.numberOfLines,
    ).toBeUndefined();

    await screen.rerender(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );
    await fireEvent.press(screen.getByLabelText('1'));
    const buttonStyle = StyleSheet.flatten(
      screen.getByTestId('transaction-category-button').props.style,
    );
    const submitButtonStyle = StyleSheet.flatten(
      screen.getByTestId('transaction-submit-button').props.style,
    );
    const labelStyle = StyleSheet.flatten(
      screen.getByText(category.name).props.style,
    );
    const icon = screen.getByTestId('transaction-category-icon');
    const chevronStyle = StyleSheet.flatten(
      screen.getByTestId('transaction-category-chevron').props.style,
    );

    expect(buttonStyle.backgroundColor).toBe(colors.surface);
    expect(buttonStyle.borderColor).toBe(categoryColors.orange);
    expect(buttonStyle.flex).toBeGreaterThan(submitButtonStyle.flex);
    expect(submitButtonStyle.paddingHorizontal).toBe(0);
    expect(labelStyle.color).toBe(colors.textSecondary);
    expect(icon.props.children.props.color).toBe(categoryColors.orange);
    expect(chevronStyle.color).toBe(colors.textSecondary);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-submit-gradient').props.style,
      ).backgroundColor,
    ).toBe(categoryColors.orange);
  });

  it('usa texto oscuro en el CTA de una categoría amarilla', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={{ ...category, colorToken: 'yellow' }}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText('1'));

    expect(
      StyleSheet.flatten(screen.getByText('Agregar').props.style).color,
    ).toBe(colors.textPrimary);
  });

  it('permite escoger la fecha y la recurrencia desde sus iconos', async () => {
    const onSubmit = jest.fn();
    const now = new Date();
    const expectedDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      '15',
    ].join('-');
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText(/^Fecha:/));
    expect(screen.getByText('Elige una fecha')).toBeTruthy();
    expect(
      screen.queryByText('Cambia de mes y toca el día del movimiento.'),
    ).toBeNull();
    await fireEvent.press(
      screen.getByTestId(`transaction-date-calendar.day_${expectedDate}`),
    );
    expect(screen.getByLabelText('Guardar fecha')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Guardar fecha'));
    expect(screen.queryByLabelText('Guardar fecha')).toBeNull();
    expect(
      screen.getByText(
        new Intl.DateTimeFormat('es-ES', {
          day: 'numeric',
          month: 'short',
        }).format(new Date(`${expectedDate}T12:00:00`)),
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(/^Recurrencia:/));
    expect(screen.getByText('Elige la recurrencia')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByLabelText('Único')).toBeTruthy();
    expect(screen.getByLabelText('Semanal')).toBeTruthy();
    expect(screen.getByLabelText('Quincenal')).toBeTruthy();
    expect(screen.getByLabelText('Mensual')).toBeTruthy();
    expect(screen.getByLabelText('Personalizada')).toBeTruthy();
    expect(screen.queryByLabelText('Diario')).toBeNull();
    expect(screen.queryByLabelText('Anual')).toBeNull();
    const recurrenceOptionStyle = StyleSheet.flatten(
      screen.getByLabelText('Semanal').props.style,
    );
    const selectedRecurrenceStyle = StyleSheet.flatten(
      screen.getByLabelText('Único').props.style,
    );
    expect(recurrenceOptionStyle).toMatchObject({
      ...shadows.subtle,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    });
    expect(selectedRecurrenceStyle.borderColor).toBe(colors.cta);
    expect(
      StyleSheet.flatten(
        screen.getByTestId('transaction-recurrence-once-check').props.style,
      ).color,
    ).toBe(colors.cta);
    for (const recurrence of ['weekly', 'biweekly', 'monthly', 'custom']) {
      expect(
        StyleSheet.flatten(
          screen.getByTestId(`transaction-recurrence-${recurrence}-check`).props
            .style,
        ).color,
      ).toBe(colors.textMuted);
    }
    await fireEvent.press(screen.getByLabelText('Quincenal'));
    expect(screen.getByLabelText('Guardar recurrencia')).toBeTruthy();
    expect(
      screen.getByLabelText('Quincenal').props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(
      screen.getByLabelText('Único').props.accessibilityState,
    ).toMatchObject({
      checked: false,
    });
    await fireEvent.press(screen.getByLabelText('Guardar recurrencia'));
    expect(screen.queryByLabelText('Guardar recurrencia')).toBeNull();
    expect(screen.getByText('Quincenal')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredOn: expectedDate,
        recurrence: 'biweekly',
      }),
    );
  });

  it('configura una recurrencia personalizada con cantidad y fechas exactas', async () => {
    const onSubmit = jest.fn();
    const now = new Date();
    const firstDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      '10',
    ].join('-');
    const secondDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      '20',
    ].join('-');
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="income"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText(/^Recurrencia:/));
    await fireEvent.press(screen.getByLabelText('Personalizada'));
    expect(screen.getByText('Cantidad de repeticiones')).toBeTruthy();
    await fireEvent.changeText(
      screen.getByLabelText('Cantidad de repeticiones'),
      '2',
    );
    await fireEvent.press(screen.getByLabelText('Continuar a elegir días'));
    expect(screen.getByText('Elige los días')).toBeTruthy();
    expect(screen.getByText('0 de 2 días seleccionados')).toBeTruthy();
    await fireEvent.press(
      screen.getByTestId(
        `transaction-custom-recurrence-calendar.day_${firstDate}`,
      ),
    );
    await fireEvent.press(
      screen.getByTestId(
        `transaction-custom-recurrence-calendar.day_${secondDate}`,
      ),
    );
    expect(screen.getByText('2 de 2 días seleccionados')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Guardar días personalizados'));
    await fireEvent.press(screen.getByLabelText('Guardar recurrencia'));
    expect(screen.getByLabelText('Recurrencia: Personalizada')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: 'custom',
        customOccurrenceDates: [firstDate, secondDate],
      }),
    );
  });

  it('permite escoger días personalizados sin declarar un límite', async () => {
    const onSubmit = jest.fn();
    const now = new Date();
    const dates = ['05', '15', '25'].map((day) =>
      [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        day,
      ].join('-'),
    );
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        visible
      />,
    );

    await fireEvent.press(screen.getByLabelText(/^Recurrencia:/));
    await fireEvent.press(screen.getByLabelText('Personalizada'));
    expect(screen.getByLabelText('No estoy seguro')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('No estoy seguro'));
    expect(screen.getByText('0 días seleccionados, sin límite')).toBeTruthy();

    for (const date of dates) {
      await fireEvent.press(
        screen.getByTestId(
          `transaction-custom-recurrence-calendar.day_${date}`,
        ),
      );
    }
    expect(screen.getByText('3 días seleccionados, sin límite')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Guardar días personalizados'));
    await fireEvent.press(screen.getByLabelText('Guardar recurrencia'));
    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: 'custom',
        customOccurrenceDates: dates,
      }),
    );
  });

  it('mantiene los controles por encima del objetivo táctil mínimo', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={null}
        visible
      />,
    );

    const labels = [
      'Gasto',
      'Cerrar',
      '7',
      'Sumar',
      'Borrar',
      'Agregar categoría',
      'Agregar movimiento',
    ];

    labels.forEach((label) => {
      const style = StyleSheet.flatten(
        screen.getByLabelText(label).props.style,
      );
      const height = style.height ?? style.minHeight;

      expect(height).toBeGreaterThanOrEqual(minTouchTarget);
    });
  });

  it('no muestra el selector de moneda cuando solo hay una moneda activa', async () => {
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    expect(screen.queryByTestId('transaction-currency-button')).toBeNull();
  });

  it('permite elegir la moneda del movimiento cuando hay varias activas', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        availableCurrencies={['EUR', 'USD', 'MXN']}
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        visible
      />,
    );

    expect(screen.getByLabelText('Moneda: EUR')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Moneda: EUR'));
    await fireEvent.press(
      screen.getByLabelText('🇺🇸 Dólar estadounidense (USD)'),
    );
    await fireEvent.press(screen.getByLabelText('Guardar moneda'));

    expect(
      screen.getByTestId('transaction-amount-currency').props.children,
    ).toBe('$ ');

    await fireEvent.press(screen.getByLabelText('1'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' }),
    );
  });

  it('cierra el teclado nativo al tocar cualquier parte del modal', async () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="personal"
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={jest.fn()}
        selectedCategory={category}
        visible
      />,
    );

    dismissSpy.mockClear();
    await act(async () => {
      fireEvent(
        screen.getByTestId('create-transaction-form'),
        'startShouldSetResponderCapture',
      );
    });
    expect(dismissSpy).toHaveBeenCalledTimes(1);

    dismissSpy.mockClear();
    await act(async () => {
      fireEvent(screen.getByLabelText('5'), 'startShouldSetResponderCapture');
    });
    expect(dismissSpy).toHaveBeenCalledTimes(1);

    dismissSpy.mockRestore();
  });

  it('en nuevo movimiento, preselecciona spaceCurrency (VES) por encima de otras divisas', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="space-ves"
        availableCurrencies={['EUR', 'USD']}
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        spaceCurrency="VES"
        visible
      />,
    );

    const currencyButton = screen.getByTestId('transaction-currency-button');
    expect(currencyButton.props.accessibilityLabel).toBe('Moneda: VES');

    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'VES' }),
    );
  });

  it('en edición, respeta initialDraft.currency aunque spaceCurrency sea distinta', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="space-ves"
        availableCurrencies={['EUR', 'VES']}
        initialDraft={{
          amountMinor: 2500,
          categoryId: category.id,
          currency: 'USD',
          occurredOn: '2026-08-15',
          recurrence: 'once',
          spaceId: 'space-ves',
          title: 'Gasto en USD',
          type: 'expense',
        }}
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        spaceCurrency="VES"
        visible
      />,
    );

    // En edición con initialDraft en USD, muestra USD
    const currencyButton = screen.getByTestId('transaction-currency-button');
    expect(currencyButton.props.accessibilityLabel).toBe('Moneda: USD');

    await fireEvent.press(screen.getByLabelText('Guardar cambios'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'USD' }),
    );
  });

  it('al cambiar de espacio con el modal abierto, reinicia la divisa a la del nuevo espacio', async () => {
    const onSubmit = jest.fn();
    const screen = await renderWithTheme(
      <CreateTransactionModal
        activeSpaceId="space-eur"
        availableCurrencies={['EUR', 'USD']}
        initialType="expense"
        onClose={jest.fn()}
        onOpenCategoryPicker={jest.fn()}
        onSubmit={onSubmit}
        selectedCategory={category}
        spaceCurrency="EUR"
        visible
      />,
    );

    expect(
      screen.getByTestId('transaction-currency-button').props
        .accessibilityLabel,
    ).toBe('Moneda: EUR');

    // Cambiamos el espacio activo a uno en VES con el modal abierto
    await act(async () => {
      screen.rerender(
        <CreateTransactionModal
          activeSpaceId="space-ves"
          availableCurrencies={['EUR', 'USD']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={onSubmit}
          selectedCategory={category}
          spaceCurrency="VES"
          visible
        />,
      );
    });

    expect(
      screen.getByTestId('transaction-currency-button').props
        .accessibilityLabel,
    ).toBe('Moneda: VES');

    await fireEvent.press(screen.getByLabelText('5'));
    await fireEvent.press(screen.getByLabelText('Agregar movimiento'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'VES' }),
    );
  });

  describe('ciclo de vida del borrador: cuándo reinicia y cuándo conserva', () => {
    type RenderedModal = Awaited<ReturnType<typeof renderWithTheme>>;

    const editedDraft: CreateTransactionDraft = {
      spaceId: 'space-ves',
      type: 'expense',
      amountMinor: 1250,
      currency: 'EUR',
      title: 'Almuerzo',
      categoryId: category.id,
      occurredOn: '2026-07-30',
      recurrence: 'once',
    };

    const selectCurrency = async (
      screen: RenderedModal,
      from: string,
      to: RegExp,
    ) => {
      await fireEvent.press(screen.getByLabelText(`Moneda: ${from}`));
      await fireEvent.press(screen.getByLabelText(to));
      await fireEvent.press(screen.getByLabelText('Guardar moneda'));
    };

    const currencyLabel = (screen: RenderedModal) =>
      screen.getByTestId('transaction-currency-button').props
        .accessibilityLabel;

    it('nuevo movimiento VES: conserva EUR e importe aunque availableCurrencies se reconstruya equivalente', async () => {
      const onSubmit = jest.fn();
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="space-ves"
          availableCurrencies={['VES', 'EUR']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={onSubmit}
          selectedCategory={category}
          spaceCurrency="VES"
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('4'));
      await fireEvent.press(screen.getByLabelText('2'));
      await selectCurrency(screen, 'VES', /\(EUR\)$/);
      expect(currencyLabel(screen)).toBe('Moneda: EUR');

      await act(async () => {
        screen.rerender(
          <CreateTransactionModal
            activeSpaceId="space-ves"
            availableCurrencies={['VES', 'EUR']}
            initialType="expense"
            onClose={jest.fn()}
            onOpenCategoryPicker={jest.fn()}
            onSubmit={onSubmit}
            selectedCategory={category}
            spaceCurrency="VES"
            visible
          />,
        );
      });

      expect(currencyLabel(screen)).toBe('Moneda: EUR');
      await fireEvent.press(screen.getByLabelText('Agregar movimiento'));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amountMinor: 4200, currency: 'EUR' }),
      );
    });

    it('el catálogo crece de [VES, EUR] a [VES, EUR, USD] y conserva el borrador entero', async () => {
      const onSubmit = jest.fn();
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="space-ves"
          availableCurrencies={['VES', 'EUR']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={onSubmit}
          selectedCategory={category}
          spaceCurrency="VES"
          visible
        />,
      );

      await fireEvent.changeText(
        screen.getByLabelText('Título del movimiento'),
        'Cena',
      );
      await fireEvent.press(screen.getByLabelText('4'));
      await fireEvent.press(screen.getByLabelText('2'));
      await selectCurrency(screen, 'VES', /\(EUR\)$/);

      await act(async () => {
        screen.rerender(
          <CreateTransactionModal
            activeSpaceId="space-ves"
            availableCurrencies={['VES', 'EUR', 'USD']}
            initialType="expense"
            onClose={jest.fn()}
            onOpenCategoryPicker={jest.fn()}
            onSubmit={onSubmit}
            selectedCategory={category}
            spaceCurrency="VES"
            visible
          />,
        );
      });

      expect(screen.getByLabelText('Título del movimiento').props.value).toBe(
        'Cena',
      );
      expect(currencyLabel(screen)).toBe('Moneda: EUR');
      await fireEvent.press(screen.getByLabelText('Agregar movimiento'));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          amountMinor: 4200,
          currency: 'EUR',
          title: 'Cena',
        }),
      );
    });

    it('una recarga de sincronización con el modal abierto no devuelve EUR a VES', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="space-ves"
          availableCurrencies={['VES', 'EUR']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          spaceCurrency="VES"
          visible
        />,
      );

      await selectCurrency(screen, 'VES', /\(EUR\)$/);
      expect(currencyLabel(screen)).toBe('Moneda: EUR');

      // Dos reconstrucciones consecutivas del catálogo (sondeo/Realtime).
      for (let reload = 0; reload < 2; reload += 1) {
        await act(async () => {
          screen.rerender(
            <CreateTransactionModal
              activeSpaceId="space-ves"
              availableCurrencies={['VES', 'EUR']}
              initialType="expense"
              onClose={jest.fn()}
              onOpenCategoryPicker={jest.fn()}
              onSubmit={jest.fn()}
              selectedCategory={category}
              spaceCurrency="VES"
              visible
            />,
          );
        });
        expect(currencyLabel(screen)).toBe('Moneda: EUR');
      }
    });

    it('cambiar realmente de espacio VES a EUR reinicia con EUR', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="space-ves"
          availableCurrencies={['VES', 'EUR']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          spaceCurrency="VES"
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('5'));
      expect(currencyLabel(screen)).toBe('Moneda: VES');

      await act(async () => {
        screen.rerender(
          <CreateTransactionModal
            activeSpaceId="space-eur"
            availableCurrencies={['EUR', 'VES']}
            initialType="expense"
            onClose={jest.fn()}
            onOpenCategoryPicker={jest.fn()}
            onSubmit={jest.fn()}
            selectedCategory={category}
            spaceCurrency="EUR"
            visible
          />,
        );
      });

      expect(currencyLabel(screen)).toBe('Moneda: EUR');
    });

    it('cerrar y reabrir crea un borrador limpio con la moneda del espacio', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="space-ves"
          availableCurrencies={['VES', 'EUR']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          spaceCurrency="VES"
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('4'));
      await fireEvent.press(screen.getByLabelText('2'));
      await selectCurrency(screen, 'VES', /\(EUR\)$/);
      expect(currencyLabel(screen)).toBe('Moneda: EUR');

      await act(async () => {
        screen.rerender(
          <CreateTransactionModal
            activeSpaceId="space-ves"
            availableCurrencies={['VES', 'EUR']}
            initialType="expense"
            onClose={jest.fn()}
            onOpenCategoryPicker={jest.fn()}
            onSubmit={jest.fn()}
            selectedCategory={category}
            spaceCurrency="VES"
            visible={false}
          />,
        );
      });
      await act(async () => {
        screen.rerender(
          <CreateTransactionModal
            activeSpaceId="space-ves"
            availableCurrencies={['VES', 'EUR']}
            initialType="expense"
            onClose={jest.fn()}
            onOpenCategoryPicker={jest.fn()}
            onSubmit={jest.fn()}
            selectedCategory={category}
            spaceCurrency="VES"
            visible
          />,
        );
      });

      expect(currencyLabel(screen)).toBe('Moneda: VES');
    });

    it('en edición, una recarga que reconstruye el mismo movimiento no borra los cambios', async () => {
      const onSubmit = jest.fn();
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="space-ves"
          availableCurrencies={['VES', 'EUR']}
          initialDraft={{ ...editedDraft }}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={onSubmit}
          selectedCategory={category}
          spaceCurrency="VES"
          visible
        />,
      );

      expect(screen.getByLabelText('Título del movimiento').props.value).toBe(
        'Almuerzo',
      );
      await fireEvent.changeText(
        screen.getByLabelText('Título del movimiento'),
        'Cena',
      );

      // La recarga reconstruye el objeto: nueva referencia, mismo movimiento.
      await act(async () => {
        screen.rerender(
          <CreateTransactionModal
            activeSpaceId="space-ves"
            availableCurrencies={['VES', 'EUR']}
            initialDraft={{ ...editedDraft }}
            initialType="expense"
            onClose={jest.fn()}
            onOpenCategoryPicker={jest.fn()}
            onSubmit={onSubmit}
            selectedCategory={category}
            spaceCurrency="VES"
            visible
          />,
        );
      });

      expect(screen.getByLabelText('Título del movimiento').props.value).toBe(
        'Cena',
      );
      await fireEvent.press(screen.getByLabelText('Guardar cambios'));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cena' }),
      );
    });
  });

  describe('conversión de escala al cambiar de moneda', () => {
    const amountLabel = (screen: Awaited<ReturnType<typeof renderWithTheme>>) =>
      screen.getByTestId('transaction-amount').props.accessibilityLabel;

    const selectCurrency = async (
      screen: Awaited<ReturnType<typeof renderWithTheme>>,
      optionLabel: string,
    ) => {
      await fireEvent.press(screen.getByLabelText(/^Moneda:/));
      await fireEvent.press(screen.getByLabelText(optionLabel));
      await fireEvent.press(screen.getByLabelText('Guardar moneda'));
    };

    it('10,00 EUR → JPY muestra 10, no 10,00 ni 1000', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          availableCurrencies={['EUR', 'JPY']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          visible
        />,
      );

      for (const key of ['1', '0', ',', '0', '0']) {
        await fireEvent.press(screen.getByLabelText(key));
      }

      await selectCurrency(screen, '🇯🇵 Yen japonés (JPY)');

      expect(amountLabel(screen)).toBe('10 yenes');
    });

    it('operación pendiente EUR→JPY conserva la magnitud y el resultado', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          availableCurrencies={['EUR', 'JPY']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('1'));
      await fireEvent.press(screen.getByLabelText('0'));
      await fireEvent.press(screen.getByLabelText('Sumar'));
      await fireEvent.press(screen.getByLabelText('5'));

      await selectCurrency(screen, '🇯🇵 Yen japonés (JPY)');
      await fireEvent.press(screen.getByLabelText('Calcular resultado'));

      expect(amountLabel(screen)).toBe('15 yenes');
    });

    it('operación pendiente JPY→EUR conserva la magnitud y el resultado', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          availableCurrencies={['JPY', 'EUR']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          spaceCurrency="JPY"
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('1'));
      await fireEvent.press(screen.getByLabelText('0'));
      await fireEvent.press(screen.getByLabelText('0'));
      await fireEvent.press(screen.getByLabelText('0'));
      await fireEvent.press(screen.getByLabelText('Sumar'));
      await fireEvent.press(screen.getByLabelText('5'));
      await fireEvent.press(screen.getByLabelText('0'));
      await fireEvent.press(screen.getByLabelText('0'));

      await selectCurrency(screen, '🇪🇺 Euro (EUR)');
      await fireEvent.press(screen.getByLabelText('Calcular resultado'));

      expect(amountLabel(screen)).toBe('1.500 euros');
    });

    it('una fracción real bloquea el cambio y conserva íntegro el borrador', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          availableCurrencies={['EUR', 'JPY']}
          initialType="expense"
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          visible
        />,
      );

      for (const key of ['1', '0', ',', '5', '0']) {
        await fireEvent.press(screen.getByLabelText(key));
      }

      await selectCurrency(screen, '🇯🇵 Yen japonés (JPY)');

      expect(
        screen.getByText(
          'La moneda elegida no admite decimales. Ajusta el importe antes de cambiar.',
        ),
      ).toBeTruthy();
      expect(screen.getByLabelText('Moneda: EUR')).toBeTruthy();
      expect(amountLabel(screen)).toBe('10,50 euros');
    });
  });
});
