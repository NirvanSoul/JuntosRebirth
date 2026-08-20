import { act, fireEvent } from '@testing-library/react-native';
import { type ComponentProps, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';

import { CreateTransactionModal as ControlledCreateTransactionModal } from '@/features/transactions/components/CreateTransactionModal/CreateTransactionModal';
import type { Category } from '@/features/categories/types';
import type { TransactionType } from '@/features/transactions/types';
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
    expect(selectedRecurrenceStyle).toMatchObject({
      borderColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
    });
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
  describe('cuenta del movimiento', () => {
    const bankAccount = {
      id: 'account-1',
      spaceId: 'personal',
      name: 'Cuenta nómina',
      kind: 'bank' as const,
      icon: 'bank' as const,
      colorToken: 'blue' as const,
      balances: [{ currency: 'USD' as const, openingBalanceMinor: 0 }],
      isArchived: false,
    };

    it('no muestra el selector cuando el espacio no tiene cuentas', async () => {
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
        screen.queryByTestId('transaction-money-account-button'),
      ).toBeNull();
    });

    it('deja fuera las cuentas archivadas y las de otro espacio', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          initialType="expense"
          moneyAccounts={[
            { ...bankAccount, id: 'archivada', isArchived: true },
            { ...bankAccount, id: 'de-pareja', spaceId: 'pareja' },
          ]}
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          visible
        />,
      );

      expect(
        screen.queryByTestId('transaction-money-account-button'),
      ).toBeNull();
    });

    it('envía la cuenta elegida y adopta su moneda', async () => {
      const onSubmit = jest.fn();
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          availableCurrencies={['EUR', 'USD']}
          initialType="expense"
          moneyAccounts={[bankAccount]}
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={onSubmit}
          selectedCategory={category}
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('Cuenta: ninguna'));
      await fireEvent.press(screen.getByLabelText('Cuenta nómina · USD'));
      await fireEvent.press(screen.getByLabelText('Guardar cuenta'));

      // La moneda pasa a ser la de la cuenta y su selector desaparece: el
      // importe pertenece al saldo de esa cuenta.
      expect(
        screen.getByTestId('transaction-amount-currency').props.children,
      ).toBe('$ ');
      expect(screen.queryByTestId('transaction-currency-button')).toBeNull();

      await fireEvent.press(screen.getByLabelText('1'));
      await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD',
          moneyAccountId: 'account-1',
        }),
      );
    });

    it('devuelve la moneda del espacio al quitar la cuenta', async () => {
      const onSubmit = jest.fn();
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          availableCurrencies={['EUR', 'USD']}
          initialType="expense"
          moneyAccounts={[bankAccount]}
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={onSubmit}
          selectedCategory={category}
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('Cuenta: ninguna'));
      await fireEvent.press(screen.getByLabelText('Cuenta nómina · USD'));
      await fireEvent.press(screen.getByLabelText('Guardar cuenta'));

      await fireEvent.press(screen.getByLabelText('Cuenta: Cuenta nómina'));
      await fireEvent.press(screen.getByLabelText('Sin cuenta'));
      await fireEvent.press(screen.getByLabelText('Guardar cuenta'));

      await fireEvent.press(screen.getByLabelText('1'));
      await fireEvent.press(screen.getByLabelText('Agregar movimiento'));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'EUR',
          moneyAccountId: undefined,
        }),
      );
    });

    it('precarga la cuenta al editar un movimiento', async () => {
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          initialDraft={{
            spaceId: 'personal',
            type: 'expense',
            amountMinor: 1250,
            currency: 'USD',
            title: 'Compra',
            categoryId: category.id,
            moneyAccountId: 'account-1',
            occurredOn: '2026-08-01',
            recurrence: 'once',
          }}
          initialType="expense"
          moneyAccounts={[bankAccount]}
          onClose={jest.fn()}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          visible
        />,
      );

      expect(screen.getByLabelText('Cuenta: Cuenta nómina')).toBeTruthy();
    });

    it('ofrece crear una cuenta desde el propio selector', async () => {
      const onCreateMoneyAccount = jest.fn();
      const screen = await renderWithTheme(
        <CreateTransactionModal
          activeSpaceId="personal"
          initialType="expense"
          moneyAccounts={[bankAccount]}
          onClose={jest.fn()}
          onCreateMoneyAccount={onCreateMoneyAccount}
          onOpenCategoryPicker={jest.fn()}
          onSubmit={jest.fn()}
          selectedCategory={category}
          visible
        />,
      );

      await fireEvent.press(screen.getByLabelText('Cuenta: ninguna'));
      await fireEvent.press(screen.getByLabelText('Crear cuenta'));

      expect(onCreateMoneyAccount).toHaveBeenCalled();
    });
  });
});
